## Context

The locomotion controller in `app/game/locomotion/` was rewritten as a CPG in the
`replace-locomotion-with-cpg` change, but it was built from a paraphrase of the source
paper rather than the paper itself. It is broken: the creature spasms in place with no
forward translation. Three compounding faults were diagnosed: (1) per-segment oscillator
output applied as an *absolute* world yaw on a parented chain, so segment bends stack into
a ~2.8 rad explosion; (2) `drive`/`steer` computed from the head pivot's live forward
vector, which is itself flailing — a positive-feedback loop; (3) stride direction taken
from the same flailing head frame, so feet replant in random directions.

We now have a verified, 1:1 transcription of the source equations and parameters in
`documentation/reference/locomotion-reference.md` (Knüsel et al. 2020), and a clean
project-design doc in `documentation/locomotion.md`. This change rebuilds the locomotion
logic against those documents.

Constraints (hard): the node-position config, the angle-cap config, and the six core
rules in `documentation/locomotion.md §1` are sacred. Node authoring (`app/admin/group/*`),
angle-cap authoring (`CalibrateTab`, `LimitSlider`, the calibration code path), the
`BodyGroup`/`AngleCaps` schema, the mesh/pivot/render scaffolding, the single-bone leg IK
(`applyLegBone`), and the diagnostics recording/playback infrastructure all stay.

## Goals / Non-Goals

**Goals:**

- Rebuild the CPG core and the frame loop so the model matches the verified reference,
  with the one documented kinematic substitution (output → joint angle, not → physics).
- Produce a travelling body wave, diagonal-trot footfalls, forward translation, and
  turning toward an attractor — each delivered as an independently verifiable stage.
- Keep the controller a pure function of studio data + CPG state; topology derived from
  the rig with no per-rig hand-wiring.
- The whole body (head → spine → tail) participates in the wave; no locked back half.

**Non-Goals:**

- A physics simulation. We are kinematic; the paper's muscle→torque→ODE block is replaced.
- Proprioceptive feedback (`s_i = 0`) and drive random-walk noise (in-vivo runs zero it).
- Backward stepping, swimming, and speed-triggered gait changes (recoverable later).
- A neuroscience-faithful port (no Hodgkin-Huxley neurons, no virtual muscles).
- Changes to node authoring, angle-cap authoring, or the config schema.

## Decisions

**D1 — Left/right oscillator pair per spine group; joint bend = scaled `(x_L − x_R)`.**
The paper's double chain has a left and right hemisegment oscillator per segment, each
emitting `x = r(1 + cos θ)` (≥ 0), and the joint is driven by the antagonist difference.
We mirror this: each spine group gets a left and right oscillator held antiphase by the
intrasegmental coupling (`φ = π`); the group's bend angle is `k · (x_L − x_R)` clamped to
`effectiveAngleCaps(group).yaw`, applied as a **local** pivot rotation. Because each
joint bends locally within its cap and neighbours carry a phase lag, the body forms a
travelling wave instead of a stacked explosion.
*Alternatives:* single oscillator with `r·cos θ` (the broken prior design — not faithful,
and conflated absolute vs local rotation); full muscle/physics port (out of scope, we are
kinematic).

**D2 — First-order amplitude + saturation drive, per the reference.**
`ṙ = a(R − r)`, `ν = d·e`, `R = d·P(d, d_th)` with `P` the decreasing sigmoid. These are
the verified forms. The prior second-order amplitude and linear drive mapping are dropped.
*Alternative:* keep the linear mapping for simplicity — rejected; the saturation form is
both correct and the lever that later enables gait/speed behaviour.

**D3 — Stable body frame for all control bearings.**
`drive`, turning, and stride direction are computed from a stable body reference — the
root (tail-end) segment's world forward — never the head's live forward vector. This
breaks the feedback loop at its source.
*Alternative:* low-pass-filter the head forward — rejected; a structurally stable frame is
simpler and cannot oscillate.

**D4 — Turning via differential drive.**
Steering biases the drive across the body (and/or left vs right), the paper's own
mechanism, rather than adding a constant yaw offset to every segment's output. The exact
attractor-bearing → drive-split mapping is decided and tuned in the turning stage.
*Alternative:* static yaw bias (the prior design) — rejected; it fought the oscillation
and did not curve the body the way differential drive does.

**D5 — Full-body chain through the tail.**
The oscillator chain spans head → spines → tail so the entire body waves. `chain.ts` is
extended to include the tail group(s) rather than stopping at the last hip.
*Alternative:* keep the cascade ending at the rear hip (the "locked back half") — rejected
by the user; it looks dead and is not what the biology does.

**D6 — Phase-driven feet; reuse the swing-arc; stride along the stable body forward.**
Stance/swing from the sign of `sin(θ)`; on stance→swing latch the next planted position
from `hip_socket_world + rotate(rest_offset, hip_yaw) + stride · body_forward`, where
`body_forward` is the stable frame from D3. The existing swing-arc easing and lift are
kept. `applyLegBone` is unchanged — it still points the leg at the foot's world position.
*Alternative:* strain-triggered stepping — already removed and not reintroduced.

**D7 — Staged, visually verified delivery; manual drive before attractor.**
A manual `drive` slider is added to the animate studio so stages 1–5 are verifiable
without attractor coupling. Only stage 6 wires the attractor. Each stage is checked in the
studio (time-scale slider + recording) before the next begins.

**D8 — Pure CPG core; topology from studio data.** `cpg.ts` exports pure functions
(`buildCpgNetwork`, `initCpgState`, `tickCpg`) with no three.js / React / diagnostics
access. `useLocomotion` owns scene reads, the stable body frame, foot placement, and
diagnostics.

**D9 — Supersede `replace-locomotion-with-cpg`.** That change is broken and unarchived;
it is abandoned as part of this work.

## Risks / Trade-offs

- **The paper's numeric couplings assume a 25-segment chain; our rigs have far fewer,
  variable segments.** → We keep the coupling *types* and relative weights and scale axial
  amplitude to each segment's cap; we do not hard-code 25 segments. The phase-lag that
  produces the travelling wave comes from the rostrocaudal bias, which is segment-count
  independent. Verified visually in the body-wave stage.
- **Standing wave vs travelling wave.** A travelling wave needs a non-zero rostrocaudal
  phase lag and stronger head→tail than tail→head coupling. → Use the reference's Table 2
  values; verify the wave travels head→tail in stage 2.
- **Parameter interactions (coupling, drive falloff, stride, lift).** → Surface them as
  studio sliders; tune per stage rather than all at once.
- **Differential-drive turning may need a bespoke mapping for a tetrapod (the paper turns a
  salamander).** → Stage 6 is scoped to decide and tune this in isolation, after straight
  walking is solid.
- **Doubling oscillator count (left/right per segment).** → Negligible cost; the network
  is tiny and `tickCpg` is O(oscillators + couplings) per frame.

## Migration Plan

1. Stage 0 strips the broken logic behind the existing studio UI; calibration and playback
   keep working, so config authoring is never at risk.
2. Each subsequent stage is additive and independently verifiable; if a stage fails
   verification, work stops there without affecting authoring or the prior stage.
3. The superseded `replace-locomotion-with-cpg` change is abandoned (folder removed) once
   this change's stage 0 lands.
4. Rollback: revert the branch; the config schema and authoring tools are untouched, so no
   data migration is involved.

## Open Questions

- Which pivot is the canonical stable root for the body frame — the last tail group, or a
  synthetic root? (Resolved in stage 5 against the actual rig.)
- The constant `k` mapping `(x_L − x_R)` to a joint angle vs clamping at the cap: scale to
  the cap, or emit raw and clamp? (Resolved in stage 1; default is scale-to-cap.)
- Exact attractor-bearing → drive-split curve for turning. (Resolved in stage 6.)
