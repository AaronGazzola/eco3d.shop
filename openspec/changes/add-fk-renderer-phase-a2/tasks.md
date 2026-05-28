## 1. Body spec extraction

- [x] 1.1 Add `app/game/locomotion/body.ts` exporting `BodySpec`, `PlanarSegment`, `PlanarJoint`, `BODY_DENSITY`, and `buildBodySpec(groups, segments): BodySpec | null`. Compute per-segment length (next-node distance with mesh-extent fallback at the tail), mass (density × AABB volume), inertia (box formula), rest XZ of the rotation center (`nodeFront`, with `nodeBack` as fallback) and the mesh centroid. Joints: 1-DOF yaw between adjacent chain segments, caps from `effectiveAngleCaps(childGroup)`.
- [x] 1.2 No imports from a solver/types module — A2 ships no `SolverState`.
- [x] 1.3 `npx tsc --noEmit` passes.

## 2. Manual pose state in the animate store

- [x] 2.1 In `app/admin/animate/animateStore.ts`, add `manualPose: { rootX: number; rootZ: number; rootYawRad: number; jointAnglesRad: Record<string, number> }` to the `AnimateStore` interface and its initial state (`rootX/Z/YawRad = 0`, `jointAnglesRad = {}`).
- [x] 2.2 Add setters `setManualPoseRootX(x)`, `setManualPoseRootZ(z)`, `setManualPoseRootYaw(rad)`, `setManualPoseJointAngle(groupId, rad)`, and `resetManualPose()`.
- [x] 2.3 `npx tsc --noEmit` passes.

## 3. Root ref binding

- [x] 3.1 In `app/admin/animate/AnimateScene.tsx`, create `const rootRef = useRef<THREE.Group | null>(null)` inside `SceneContent` and pass it as `rootRef={rootRef}` to `AnimatedModel`.
- [x] 3.2 In `app/game/AnimatedModel.tsx`, add `rootRef?: RefObject<THREE.Group | null>` to the props type, and bind `ref={rootRef}` on the outermost `<group>`.
- [x] 3.3 `npx tsc --noEmit` passes; the studio still renders the rest pose unchanged when no manual pose values are set.

## 4. Leg reparenting

- [x] 4.1 In `AnimatedModel`, build `legsBySpineId: Map<string, BodyGroup[]>` keyed by each leg's `attachedToSpineId`.
- [x] 4.2 In the top-level `modelConfig.groups.map(...)`, stop emitting any leg whose `attachedToSpineId` resolves to a chain group. Continue to emit, with a `console.error` referencing the leg id and the unresolved id, any leg whose attachment does not resolve.
- [x] 4.3 In `ChainNode`, after the existing `GroupBody` + `{children}` render inside the inner offset group, render `legsBySpineId.get(g.id)` (if any) using the same per-leg `<group ref={...}>` block currently in the top-level map (so each leg still registers in `pivotsRef`).
- [x] 4.4 Calibrate behavior verified by hand: selecting a leg in Calibrate, the leg still rotates around its hip node within the parent spine's frame.
- [x] 4.5 `npx tsc --noEmit` and `npx eslint` pass on the touched files.

## 5. Manual-pose render path in useLocomotion

- [x] 5.1 In `app/game/locomotion/useLocomotion.ts`, add a `rootRef?: RefObject<THREE.Group | null>` parameter (mirroring A2's `AnimatedModel` signature).
- [x] 5.2 Split the per-frame body into a `calibrating` branch (unchanged from today) and a non-calibrating branch.
- [x] 5.3 In the non-calibrating branch: read `store.manualPose`; for each chain joint (head excluded), look up the child segment's groupId in `jointAnglesRad` (default 0), clamp to `[-yawBack, +yawFwd]` from `effectiveAngleCaps(childGroup)`, and set `pivot.quaternion.setFromAxisAngle(Y_AXIS, clamped)`. Set the head pivot's quaternion to the identity.
- [x] 5.4 In the non-calibrating branch: if `rootRef?.current` exists, set `root.position.set(rootX, 0, rootZ)` and `root.quaternion.setFromAxisAngle(Y_AXIS, rootYawRad)`.
- [x] 5.5 In the non-calibrating branch: reset every leg's local `quaternion` to identity and `position` to `(0, 0, 0)` — under the spine pivot, that places the leg correctly at rest and lets the spine carry it.
- [x] 5.6 `npx tsc --noEmit` and `npx eslint` pass.

## 6. Simulate sidebar — manual sliders

- [x] 6.1 In `app/admin/animate/AnimateSidebar.tsx`, replace the Simulate tab's "under reconstruction" placeholder with three root sliders (x, z, yaw) bound to the corresponding `manualPose` fields via the store, plus a **Reset pose** button.
- [x] 6.2 Iterate the chain groups via `flattenSkeleton(buildSkeletonTree(groups))`. For each chain group except the head, render a slider bound to `manualPose.jointAnglesRad[group.id]` with a fixed range of `[-π/2, +π/2]` (wider than any realistic cap, so the user can drag past the cap and visually verify the render-side clamp). Display the group's cap pair next to the slider label so the cap is visible while dragging. Label each slider with the group's `name ?? group.id.slice(0, 8)`.
- [x] 6.3 Do not render any Run, Pause, Perturb, Reset (solver), Record, or diagnostic UI elements.
- [x] 6.4 `npx tsc --noEmit` and `npx eslint` pass on the touched files.

## 7. Visual gate

- [x] 7.1 With the studio running and a rig loaded, sliding **root x** translates the rig along x; sliding **root z** translates along z; sliding **root yaw** rotates the rig about its origin.
- [x] 7.2 Sliding a joint slider rotates the corresponding chain segment around the **parent's `nodeBack`** (the canonical joint to its parent). The chain segments downstream of the rotated joint follow rigidly.
- [x] 7.3 Sliding a joint slider past its cap visibly stops the segment at the cap while the slider thumb keeps moving.
- [x] 7.4 When a spine joint rotates, the legs attached to that spine rotate with it.
- [x] 7.5 **Reset pose** returns the rig to the rest pose.
- [x] 7.6 Switching to **Calibrate** and choosing any group still rotates only that group; switching back to Simulate restores the manual pose.

## 8. Documentation

- [x] 8.1 Update `documentation/animation-roadmap.md` § 4 (Status) with a dated note describing the A2 landing and the visual gate result.
- [x] 8.2 No update to § 3 (Build phases) in this change — that update lands with A5 once the full A1–A5 split has been observed end-to-end.

## 9. OpenSpec validation

- [x] 9.1 `npx openspec validate add-fk-renderer-phase-a2 --strict` passes.
