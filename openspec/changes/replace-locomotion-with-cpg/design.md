## Context

The current locomotion system in `app/game/locomotion/` consists of:

- A greedy cascade waterfall (`computeCascadeRotations`) that distributes a head-direction goal through the spine joints, each clamped to its angle cap.
- A PBD-style leg-length projection (`projectLegConstraints`) that clamps cascade yaws so planted feet cannot be dragged.
- A strain calculation (`computeStrain`) that measures each planted foot's distance from its hip-local rest target at the wanted hip yaw.
- A strain-triggered step decision (`runHipStep`) that lifts a foot when its strain exceeds `STRAIN_THRESHOLD`.
- A diagonal foot-pick heuristic when multiple feet are strained.

This architecture is novel — it inverts the standard procedural-animation pattern where the body drives and the legs catch up. In this project the legs gate the body. The hypothesis (per the previous design doc) was that walking would emerge from constraint pushback as feet step to relieve strain. In practice the system oscillates: a foot replants, the geometry shifts, the opposite foot becomes strained, replants, repeat — with no net forward motion.

No published procedural-animation work uses this inversion. The standard models are:

1. **Argonaut / WeaverDev / Rosen / Little Polygon** — body has its own goal (player input or mouse-as-position). Body translates by physics. Legs see their hip-relative home positions move with the body; when displacement exceeds a threshold they FABRIK to a new target. Legs are reactive, never gating.
2. **Ijspeert salamander CPG** — coupled phase oscillators on the spine and limbs, driven by a single scalar `drive` (and steered by an asymmetric `drive` between left/right). The oscillator network *is* the locomotion controller; the body's S-curve and the diagonal-couplet footfall fall out of the network's phase pattern. This is the canonical biological model.

For a sprawling tetrapod whose visible motion includes spine bending coupled to limb stepping (the "curving while walking" of real lizards), the CPG is the appropriate model. The flat body-driven IK of (1) produces an erect-mammalian gait that looks wrong on a lizard. Reference: Thandiackal et al. 2020, *Frontiers in Neurorobotics* — open access, full equations in §2 Methods.

## Goals / Non-Goals

**Goals:**

- Replace the cascade + projection + strain + stepping core with a CPG-based locomotion controller.
- Two scalar inputs per frame: `drive ∈ [0, 1]` (speed) and `steer ∈ [-1, 1]` (turning). Both derived from the attractor.
- Forward translation, turning, and standing-in-place all produced by the CPG. Walking is the controller's explicit job, not an emergent side effect.
- Topology built from studio data: one axial oscillator per spine segment in the cascade chain; one limb oscillator per hip socket with attached leg. Adding or removing spine segments and legs in the studio adapts the network without code changes.
- Studio `angleCaps` continue to clamp the final per-joint yaw output. Studio remains authoritative on joint limits.
- Single source of truth for the locomotion design: `documentation/locomotion.md`.

**Non-Goals:**

- A faithful neuroscience-grade port of Ijspeert's model (no Hodgkin-Huxley neurons, no proprioceptive feedback loops). The simplified phase-oscillator + amplitude-envelope form from Thandiackal 2020 §2 is sufficient.
- Swimming. The model supports a walk↔swim transition via the drive parameter; this project does not need swimming. `drive` is clamped to the walking range.
- Multi-bone IK or knee joints. Legs remain single rigid bones per the rules in `documentation/locomotion.md` §1.
- Body translation as a first-class state variable. The body translates by accumulated foot replants; the hip-socket world position emerges from the rig pivot hierarchy. No root-motion offset.
- A "wanted vs applied" gap visualization or strain readouts in the diagnostics panel. The CPG produces a single set of target yaws per frame; there is no projection step that clamps a hypothetical "wanted" set down to "applied." The cascade-table + strain-line overlays are removed.
- Preserving the strain-triggered stepping pathway as a fallback. The CPG's phase fully determines when each foot steps; strain calculation is removed entirely.
- Backwards compatibility with the prior `FrameSnapshot` shape. Recorded snapshots from before this change will not deserialize; this is acceptable because diagnostics recordings are session-scoped, not persisted.

## Decisions

**Decision 1: Phase-oscillator model from Thandiackal 2020 §2, simplified.**

Each oscillator has phase `θ_i` and amplitude `r_i`. Two intrinsic parameters written by the controller each frame: frequency `ν_i` and target amplitude `R_i`. State evolves per:

```
dθ_i / dt  =  2π · ν_i  +  Σ_j  w_ij · r_j · sin(θ_j − θ_i − φ_ij)
d²r_i / dt² =  a · ((a / 4) · (R_i − r_i) − dr_i / dt)
```

Output per axial oscillator: `yaw_i = r_i · cos(θ_i)`. Output per limb oscillator: phase `θ_i mod 2π` (used to schedule stance/swing).

Alternative considered: a simpler "sin(ωt)" oscillator per segment with no coupling. Rejected — without inter-segment coupling, segments are independent sinusoids that don't form a body wave. Coupling is what produces the standing-wave body shape.

Alternative considered: a faithful port of the full Thandiackal model including proprioceptive feedback and virtual muscle dynamics. Rejected — out of scope for a kinematic animation system. The simplified phase-oscillator form is the standard reduction used in most CPG game-engine implementations.

**Decision 2: Topology is built once from studio data, refreshed on group change.**

A `buildCpgNetwork(groups)` pure function returns `{ axial: AxialOsc[], limb: LimbOsc[], couplings: Coupling[] }`. The function reads:

- Cascade chain from `buildCascadeChain(groups)` → one axial oscillator per chain member.
- Hip sockets from `findFrontHip` and `findRearHip` plus `findLegsForHip` → one limb oscillator per attached leg.
- Adjacency in the chain → axial-neighbour couplings.
- Hip socket parent → limb-to-girdle couplings.

Limb phase offsets (for the four-leg trot pattern) are baked in via initial phase values, not couplings. This keeps the coupling graph sparse and makes the gait pattern a configuration choice rather than a structural one.

`useLocomotion` invokes `buildCpgNetwork` inside a `useMemo` keyed on `groups`. Rebuilds on rig change preserve nothing — fresh phases, zero amplitudes.

Alternative considered: storing topology in a class with mutable state. Rejected — pure functional construction keeps the surface testable.

**Decision 3: Attractor mapping is in `useLocomotion`, not in the CPG module.**

The CPG module knows nothing about the attractor. It takes `drive` and `steer` and ticks. The conversion `attractor → (drive, steer)` lives in `useLocomotion`:

```
distance     = |attractor_xz − head_xz|
signedAngle  = signedAngleBetween(head_forward, attractor_dir)

drive  = clamp((distance − close_radius) / drive_falloff, 0, 1)
steer  = clamp(signedAngle / steer_falloff, -1, 1)
```

Constants live in `documentation/locomotion.md` §8 and are exposed via the studio tuning panel later (out of scope for this change).

Alternative considered: pass the attractor into the CPG module. Rejected — keeps the CPG module decoupled from world state and easier to unit-test.

**Decision 4: Steer is a static yaw bias on top of the oscillation.**

Rather than running separate left/right CPG chains with asymmetric drive (the full Ijspeert approach), we use a single axial chain and apply `steer * c_steer` as a constant offset added to every axial output yaw. The result is the body curving (C-shape) while oscillating. For the magnitudes we need (a lizard turning, not a salamander swimming), this single-chain-plus-offset is sufficient and ~50% simpler than the left/right twin-chain form.

Alternative considered: twin left/right axial chains with asymmetric drive. Rejected for v1 on complexity grounds; the twin-chain approach is recoverable later if the single-chain form looks insufficiently realistic.

**Decision 5: Foot stepping is purely phase-driven; no strain.**

For each limb oscillator with current phase `θ`:

- `sin(θ) ≥ 0` → stance (foot planted at its recorded world position).
- `sin(θ) < 0` → swing (foot interpolates from previous planted position to next planted position; vertical lift sinusoidal in the swing-band phase fraction).

The transition stance→swing latches the next planted position:

```
next_planted_xz = hip_socket_world_xz + rotate(rest_offset_xz, hip_yaw_world) + stride_forward · body_forward_xz
```

`stride_forward` scales with `drive`. The transition swing→stance plants the foot at its current swing position; that position becomes the new `planted_xz`.

`STEP_DURATION` is implicitly the duration of the swing band of one oscillator cycle (`= 0.5 / ν` at the current frequency). The constant from the old `foot.ts` is removed.

`LIFT_HEIGHT` is retained — controls the swing-arc peak.

Alternative considered: a threshold on phase to define the swing band. Rejected — using `sin(θ) < 0` makes the swing/stance fraction exactly 50% at the canonical phase form and avoids an additional tunable.

**Decision 6: `applyLegBone` is retained unchanged.**

The leg rendering — single-bone rotate-around-hip pointing the leg at its foot's world position, clamped to leg `angleCaps` — is invariant of how the foot's world position was decided. Whether the foot is at its strain-triggered swing target or its phase-triggered swing target, `applyLegBone` reads it the same way. No change.

**Decision 7: Delete the strain-line and wanted-cascade-ghost overlays.**

These visualize concepts that no longer exist after this change:

- "Wanted cascade" was the pre-projection greedy yaws. The CPG has no separate "wanted" and "applied" — its output is a single set of yaws.
- "Foot strain line" measured each planted foot's distance from its rest target at the wanted hip yaw. The CPG doesn't use strain; the visualization has no meaning.

The toggle UI in the sidebar is removed. The store fields are removed.

**Decision 8: Diagnostics panel content replaced, infrastructure retained.**

The recording mechanism (`recordFrame`, snapshot interval, playback scrubber, copy buttons, time-scale slider) is preserved unchanged. The `FrameSnapshot` payload changes to reflect CPG state:

- New per-axial-oscillator: `phase`, `amplitude`, `intrinsicFrequency`, `outputYaw`.
- New per-limb-oscillator: `phase`, `amplitude`, `stanceOrSwing` (`'stance' | 'swing'`), `plantedX`, `plantedY`, `plantedZ`.
- Retained: `t`, `attractor`, `modelRotation`, `pivots[]`.
- Added top-level: `drive`, `steer`.

The sidebar's existing "Cascade (wanted → applied)" and "Feet (strain vs threshold)" sections are replaced with "Oscillators" and "Feet (phase / stance / swing)" sections.

**Decision 9: `documentation/locomotion.md` is the single locomotion document.**

`documentation/animation_design.md` and `documentation/animation_references.md` are deleted before this change is implemented. The new doc captures the rules, math, topology, mapping, parameters, and the reference. Future spec changes that modify the locomotion update the same file in their tasks; alternate or historical designs are not preserved.

## Risks / Trade-offs

- **Risk: parameter tuning is non-trivial.** CPG coupling weights, phase biases, drive/steer falloffs, and stride length all interact. The starting values in `documentation/locomotion.md` §8 are taken from Thandiackal 2020 with adjustments; a tuning pass on a real lizard rig is expected.
  → Mitigation: studio tuning controls in the animate panel (already exists for time-scale; extend to expose CPG parameters when needed). Initial verification will iterate on the parameter table in the doc.

- **Risk: gait pattern (the four limb phase offsets) doesn't match the studio's leg-pair mapping.** The studio identifies leg-pair-left / leg-pair-right per hip; the gait pattern requires also knowing which hip is front vs rear. `findFrontHip` / `findRearHip` already provide this.
  → Mitigation: phase offsets are applied at `buildCpgNetwork` time based on `findFrontHip`/`findRearHip` ordering, which already exists.

- **Risk: switching from "stepping clamps body" to "stepping latches at phase boundary" may cause visible foot slip during stance.** In the prior system, planted feet were locked in world. Under CPG, the body translates via accumulated foot replants, but during a single stance the foot must stay put. The implementation locks `planted_xz` on swing→stance transition and reads it back through `applyLegBone` until the next stance→swing transition.
  → Mitigation: foot world position during stance is read from a single recorded value, not computed from hip pose, exactly as today.

- **Risk: removing the cascade table + strain overlays loses diagnostic visibility.** The diagnostics built for the old design were tailored to its specific failure modes. Under CPG the failure modes are different (oscillator drift, phase desync, drive saturation).
  → Mitigation: the new diagnostics (oscillator phase/amplitude per segment, leg phase + stance/swing) are tailored to the CPG. They surface the variables that actually drive behavior.

- **Trade-off: the diagnostics shape change breaks any in-flight recordings.** Recordings are session-scoped and not persisted; no data loss outside the active browser session.

- **Trade-off: deleting `cascade.ts` and the strain logic loses a lot of code with tests passing.** The tests were written against the prior design; their relevance is gone. Replacement tests cover the CPG core.

- **Trade-off: head gaze becomes a cosmetic overlay rather than the primary control.** The head will rotate to track the attractor within its cap as before, but its rotation no longer drives the body. This may briefly look "off" if attractor is far behind — head is at its cap, body is curved by steer, looks decoupled. In practice the body's curve aligns the head with the attractor over a couple of step cycles.
