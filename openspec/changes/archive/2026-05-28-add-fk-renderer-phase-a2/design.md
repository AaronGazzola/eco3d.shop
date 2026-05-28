## Context

The salamander-CPG rebuild is staged into Phases A–H in `documentation/animation-roadmap.md` § 3. Phase A was originally one OpenSpec change (`add-locomotion-body-solver`, now reverted along with its commit `ab3314a`) covering body spec, solver, force model, render wiring, and sidebar controls. Two structural defects in the render half made the combined change unverifiable:

1. The `rootRef` `useLocomotion` wrote to was a prop accepted by `AnimatedModel` but never bound to any JSX `<group>`, and `AnimateScene` did not pass one in. The solver's bodily motion (`rootX / rootZ / rootHeadingY`) reached `useLocomotion` but not the scene.
2. Leg groups were rendered as siblings of `ChainNode` at the model root, not as children of their attached spine's pivot. When the spine bent, the legs stayed glued to their authored world positions.

A diagnostic capture of a running solver (`documentation/diagnostics/capture-2026-05-28T10-34-51-090Z.md`, since gitignored) confirmed: numerically stable (no NaN), but with joint angles running at 3–5× their caps every frame, the render hard-clamping every joint, `firstJointToSaturate` at `t = 0.01s`, and KE flat at ~400 instead of decaying. Tuning the solver constants could not have produced visually sensible output through that render path.

A2's purpose is to install the render half *first*, drive it with a manual pose source, and verify the data path before any solver is asked to drive it. If A2's gate holds, then A3 (zero-force solver loop) and A4 (damping + limits) can be checked against a renderer we already trust.

## Goals / Non-Goals

**Goals.**

- A `BodySpec` derived from the rig (chain segments + joints + caps, planar XZ) is available to the rest of the system. The same extraction logic that A3 will hand to a solver.
- The model root translates and yaws in response to manual root sliders.
- Each chain joint rotates around the canonical joint location authored on the rig: the **parent** chain segment's `nodeBack`. (This matches the group editor's `NodeOverlay.getCanonicalNodes`, which only ever displays a `nodeFront` for the head.)
- Legs are rendered as children of their attached spine's pivot — when that spine rotates, the legs come along with no extra wiring.
- Calibrate behavior is preserved verbatim. Calibrate continues to override the manual pose for the calibrating group only.

**Non-Goals.**

- No dynamics, no force model, no integrator, no Run / Perturb / Reset solver controls. Those return in A3.
- No Record button, no capture wiring. The capture scaffolding (`diagnostics.ts`, the API route, the `.gitignore` entry) stays dormant until A3, when there is solver state to record.
- No per-leg joint articulation. Legs are rigid passengers of their parent spine pivot in A2. Limb articulation lands with the limb phase, not Phase A.
- No tail-specific handling. The tail is a regular member of the chain via `buildSkeletonTree`; its joint participates in the same slider+clamp pipeline as a spine joint.
- No persistence of `manualPose` across page reloads. The pose resets to zero on load.

## Approach

**Body-spec extraction.** `body.ts` returns a `BodySpec | null` with one `PlanarSegment` per chain group (head, spines, tail) carrying `length` (distance to the next segment's `nodeBack`, with a mesh-extent fallback at the tail), `mass` (density × mesh-AABB volume), `inertiaAboutComY` (box formula), and rest XZ positions of `nodeBack` and the mesh centroid. One `PlanarJoint` per adjacent-segment pair carries `segmentIndex`, `coordIndex` (`3 + (segmentIndex - 1)`, kept for forward compatibility with the solver's reduced-coordinate layout), `yawForwardLimit`, and `yawBackwardLimit`. A2 consumes only `groupId`, `length`, and the cap pair; the rest is retained so A3 can use the same spec.

**Pose source.** `animateStore` gains `manualPose`. Joint angles are keyed by the *child* segment's `groupId` (the segment whose pivot rotates — about the parent's `nodeBack`) — the same key both `useLocomotion` and the sidebar look up, so there's no parallel index space to keep in sync. Missing entries default to `0`. When `groups` changes (rig swap, reset), `manualPose` resets.

**Render wiring.** `AnimateScene` creates a `rootRef`, passes it to `AnimatedModel`, and `AnimatedModel`'s outer `<group>` binds it. `useLocomotion`'s non-calibrate branch writes the root's position/quaternion from `manualPose.rootX/Z/Yaw` directly (no slerp; this is a manually-driven static pose, not animation), and writes each chain joint's pivot quaternion via `setFromAxisAngle(Y_AXIS, clamp(manualPose.jointAnglesRad[child.groupId], child caps))`. The head pivot is forced to identity. Calibrate mode short-circuits the manual write for the calibrating group only.

**Leg parenting.** In `AnimatedModel`, the existing top-level `modelConfig.groups.map(...)` loop SHALL stop emitting leg groups at the root. `ChainNode` SHALL render, inside its inner offset group (the one that puts children back in world frame), any leg whose `attachedToSpineId === g.id`. Each leg's `<group>` still registers its ref in `pivotsRef` so calibration's leg-rotation math continues to function — but now from the spine's pivot frame instead of the model root.

**Slider layout.** Simulate tab grows three root sliders (x ∈ [−5, 5], z ∈ [−5, 5], yaw ∈ [−π, π]) and one yaw slider per chain joint in head→tail order. Each joint slider's range is `[-yawBackwardLimit, +yawForwardLimit]`. Sliders read+write the store directly. A Reset pose button zeroes the manualPose. There is no Run, no Perturb, no Record, no diagnostic readout in this change.

## Trade-offs

- **Manual-pose store vs. local component state.** Putting `manualPose` in `animateStore` is heavier than local sidebar state but is required because `useLocomotion` runs inside the canvas (a different React subtree) and needs to read the same values. Local state would force a prop bridge through `AnimateScene` and `AnimatedModel`.
- **Hard-clamp on write vs. clamp-and-snap-the-slider.** Sliders show raw input values; the body shows clamped. A user dragging past the cap sees the slider keep moving while the body stops. We accept the small UX mismatch in exchange for a clear visual signal that the cap is taking effect — this is the same visual cue we need from A3 onward when the solver pushes past a cap.
- **Joint-angle keying by groupId vs. by joint index.** GroupId keying is more verbose but survives rig reordering and is easier to inspect at runtime. The solver in A3 will use index-keyed arrays internally; conversion is one map lookup per joint per frame.

## Open Questions

- Should the manual sliders persist across the simulate↔calibrate tab toggle, or reset to zero when switching back to Simulate? *Lean: persist within a session; reset when groups change.*
- Should the root sliders' clamp range scale with the rig's overall extent? *Lean: hardcode ±5 for A2; revisit if it's too small or large in practice.*
- Should a "Mirror left/right" affordance be added on the joint sliders for symmetric posing? *Lean: not in A2; add only if A4 verification calls for it.*
