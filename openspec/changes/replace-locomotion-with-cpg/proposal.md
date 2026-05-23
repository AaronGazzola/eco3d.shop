## Why

The current locomotion design — head-direction goal + greedy cascade + PBD leg-length projection + strain-triggered stepping — is a novel architecture invented for this project. It was a hypothesis that walking would emerge from constraint pushback without a body driver. In practice the system oscillates: a foot replants to relieve its strain, the spine pose shifts, the opposite foot becomes strained, replant, and so on, with no net forward motion. No published procedural-animation work uses this inversion; argonaut's lizard, WeaverDev, Rosen's Overgrowth, and Little Polygon all drive the body first and let legs catch up.

For a sprawling tetrapod that actually walks (curving body, diagonal-couplet footfall, smooth turning), the one documented and proven model is the **central pattern generator (CPG)** — coupled phase oscillators that produce target joint angles and foot timings from two scalar inputs (drive = speed, steer = turning). This is Ijspeert's salamander spinal-cord model; it's the canonical biological reference and has working implementations in robotics. Reference: Thandiackal et al. 2020, *Frontiers in Neurorobotics* — open access, full equations in Methods.

This change replaces the locomotion core with a CPG. Studio rig, IK rendering, diagnostics, scene infrastructure are preserved. The cascade waterfall, leg-length projection, strain calculation, and head-as-direction-goal framing are removed in place — no feature flag, no parallel path.

## What Changes

- **Add** a pure-function CPG module `app/game/locomotion/cpg.ts` implementing coupled phase oscillators per the Thandiackal 2020 model: phase ODE with neighbour coupling, second-order amplitude relaxation, drive-to-frequency mapping. Inputs: state + `drive` + `steer` + `dt`. Outputs: per-segment target yaws, per-leg phases. No three.js, no React, unit-testable.
- **Add** a topology builder `buildCpgNetwork(groups)` in `app/game/locomotion/cpg.ts` that derives the oscillator network from the studio config: one axial oscillator per body group in `buildCascadeChain`'s output; one limb oscillator per hip socket (`nodeHipLeft`/`nodeHipRight` with a matching leg group). Couplings: axial-neighbour (small phase bias for standing wave), limb-to-girdle (zero bias), limb-pair (gait pattern as initial phase offsets).
- **Add** an attractor-to-control mapping in `useLocomotion`: `drive = clamp((distance − close_radius) / drive_falloff)` and `steer = clamp(signedAngle / steer_falloff)`. Steer is applied as a per-axial-segment static yaw bias added on top of the CPG's oscillating output, clamped to each segment's `angleCap`.
- **Add** phase-driven foot stepping in `app/game/locomotion/foot.ts` (new logic, same module): when a limb oscillator's phase enters the swing band (`sin(θ) < 0`), the foot lifts and arcs to `next_planted = hip_socket_world + (rest_offset rotated by hip_world_yaw) + stride_forward * body_forward`; on entering the stance band the foot is registered as planted at its current swing position.
- **Remove** `computeCascadeRotations`, `projectLegConstraints`, and all supporting forward-chain math from `app/game/locomotion/cascade.ts`. The file is either deleted or reduced to re-exports if any helpers are reused (none are expected).
- **Remove** strain-triggered stepping from `app/game/locomotion/foot.ts` and `useLocomotion`: `computeStrain`, `STRAIN_THRESHOLD`, `footTargetWorld`, and the planted/stepping decision logic driven by strain are deleted. `easeInOut`, `STEP_DURATION`, and `LIFT_HEIGHT` remain.
- **Remove** the strain-line and wanted-cascade-ghost overlays from `AnimateScene` and the corresponding store toggles. The CPG model has no "wanted vs applied" gap and no per-foot strain; these visualizations no longer have meaning.
- **Remove** the diagnostics panel's cascade table and strain rows — same reason. The diagnostics infrastructure (recording, snapshots, playback scrubber, copy buttons) is kept; its payload shape is updated to reflect the CPG (per-oscillator phase/amplitude/output yaw; per-leg phase + stance/swing state).
- **Delete** `documentation/animation_design.md` and `documentation/animation_references.md`. Replace with `documentation/locomotion.md` as the single source of truth (rules, equations, topology, studio mapping, attractor mapping, parameter table, reference).

## Capabilities

### New Capabilities

(none — `dragon-animation` is the existing capability; this change modifies it)

### Modified Capabilities

- `dragon-animation`: the locomotion core is replaced. Studio rig (nodes, hips, leg pairs, angle caps), pivot hierarchy, leg IK rendering (`applyLegBone`, `applyHipLegs`), foot markers, and diagnostics scaffolding are unchanged. The cascade waterfall, leg-length projection, strain calculation, head-as-direction-goal, and strain-triggered stepping are removed and replaced with a CPG-based system that takes `drive` and `steer` from the attractor and produces target yaws and foot phases.

## Impact

- `app/game/locomotion/cpg.ts` — new file. CPG model and topology builder.
- `app/game/locomotion/cascade.ts` — deleted (or reduced to empty after removal of `computeCascadeRotations` and `projectLegConstraints`).
- `app/game/locomotion/foot.ts` — strain-related code removed; new phase-driven step logic added. `easeInOut`, `LIFT_HEIGHT`, `STEP_DURATION` retained.
- `app/game/locomotion/useLocomotion.ts` — frame loop rewritten around CPG tick + attractor mapping. Slerp and `applyLegBone` calls retained.
- `app/game/locomotion/chain.ts` — `buildCascadeChain`, `buildSkeletonTree`, `flattenSkeleton`, `effectiveAngleCaps`, `defaultAngleCapsFor` all retained unchanged.
- `app/game/locomotion/headGaze.ts` — retained but role reduced; now optional cosmetic head-track overlay separate from CPG.
- `app/game/locomotion/diagnostics.ts` — `FrameSnapshot` shape changes: `cascadeOutRaw`, `cascadeOut`, `caps`, `frontHip.{wantedYaw, appliedYaw, plantedYaw, targetYaw}`, `FootSnapshot.{strain, swingStartX/Z, swingTargetX/Z, restOffsetX/Z, targetX/Z}` removed. New fields: per-oscillator `{phase, amplitude, intrinsicFrequency, targetYaw}` for axial and limb oscillators; per-leg `{phase, stance|swing, plantedX/Z, plantedY}`. `pivots[]` retained.
- `app/game/locomotion/legs.ts` — retained unchanged.
- `app/game/AnimatedModel.tsx` — retained unchanged.
- `app/admin/animate/AnimateScene.tsx` — strain-line and wanted-cascade-ghost overlay components removed. Existing AnimatedModel render, attractor marker, foot markers retained.
- `app/admin/animate/AnimateSidebar.tsx` — overlay toggle UI removed; cascade-values + per-foot-strain panel removed. Time scale slider, recording controls, playback scrubber, copy buttons retained. New panel: per-oscillator phase/amplitude readouts and per-leg phase/stance-band indicators.
- `app/admin/animate/animateStore.ts` — `overlays` state removed. `solver.timeScale` retained.
- `documentation/locomotion.md` — new file (the only locomotion doc).
- `documentation/animation_design.md`, `documentation/animation_references.md` — deleted as part of the doc rewrite that began before this change.
- No new dependencies. No new external libraries.
- Studio data (`BodyGroup`, `AngleCaps`, `nodeFront`/`nodeBack`/`nodeHipLeft`/`nodeHipRight`/`nodeFoot`) is consumed unchanged. Existing rigs work without studio changes.
