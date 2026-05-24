## Why

The CPG locomotion was built from a second-hand paraphrase of the source paper, not the paper itself, and the result is broken: the creature spasms in place with no forward motion. We now have a verified, 1:1 extraction of the source (`documentation/reference/locomotion-reference.md`, from Knüsel et al. 2020) and a clean project-design doc (`documentation/locomotion.md`). This change rebuilds the locomotion logic from that verified source, correcting the model errors, while leaving the node-position config, angle-cap config, and the six core rules untouched.

## What Changes

- **BREAKING (internal):** Rebuild the CPG core (`cpg.ts`) from the verified equations — a **left/right oscillator pair per spine group** (not a single oscillator), the phase + **first-order** amplitude equations, output `x = r(1 + cos θ)`, `ν = d·e`, and `R = d·P(d, d_th)` **saturation** drive mapping, with the Table 2 coupling weights/biases. Replaces the prior single-oscillator + `r·cos θ` + second-order + linear-drive model.
- Each segment's joint bend angle = scaled `(x_left − x_right)`, applied as a **local** pivot rotation clamped to the studio `angleCap` — the one deliberate, documented kinematic substitution for the paper's muscle→torque→physics block. Fixes the cumulative-bend explosion.
- Rebuild foot stepping (`foot.ts`) and the live frame loop in `useLocomotion.ts`. Derive `drive`, steering, and stride direction from a **stable body frame** (root/tail segment), **not** the head's live forward vector. Fixes the feedback-loop spasm.
- Extend the body chain **through the tail** so the whole body waves (removes the "locked back half" artifact).
- **Turning via differential drive** (the paper's mechanism), replacing the static-yaw-bias steer.
- V1 scope: walk forward + turn toward the attractor, diagonal-trot gait. Out of scope: backward stepping, swimming, speed-based gait changes, proprioceptive feedback (`s_i = 0`), drive random-walk noise.
- **Supersedes** the broken, in-flight `replace-locomotion-with-cpg` change.

Unchanged: node-position config and node authoring (`app/admin/group/*`), angle-cap config + authoring (`CalibrateTab`, `LimitSlider`, calibration code path), the `BodyGroup`/`AngleCaps` schema, mesh loading, the pivot/render scaffolding and single-bone leg IK (`applyLegBone`), and the diagnostics recording/playback infrastructure.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dragon-animation`: the locomotion controller and how its output drives the rig change — corrected oscillator model (left/right pairs, verified equations, saturation drive), local-bend joint application, stable body-frame control, differential-drive turning, full-body wave through the tail, and phase-driven feet built on the verified reference.

## Impact

- **Code rebuilt:** `app/game/locomotion/cpg.ts`, `app/game/locomotion/foot.ts`, the live frame loop in `app/game/locomotion/useLocomotion.ts`.
- **Code adjusted:** `app/game/locomotion/chain.ts` (extend chain through tail), `app/game/AnimatedModel.tsx` (foot markers), `app/game/locomotion/diagnostics.ts` (snapshot shape), `app/admin/animate/AnimateSidebar.tsx` (readouts), `app/admin/animate/animateStore.ts` (manual drive control), optionally `app/game/locomotion/headGaze.ts`.
- **Untouched:** `app/admin/_lib/types.ts`, `app/admin/group/*`, `CalibrateTab.tsx`, `LimitSlider.tsx` and the calibration path, `useStlSegments.ts`, `legs.ts`.
- **Docs:** `documentation/locomotion.md` and `documentation/reference/*` already in place; this change implements against them.
- **Supersedes** OpenSpec change `replace-locomotion-with-cpg` (to be abandoned).
