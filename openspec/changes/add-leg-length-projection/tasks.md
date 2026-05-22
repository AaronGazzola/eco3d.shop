## 1. Pure-function projection module

- [x] 1.1 In `app/game/locomotion/cascade.ts`, add a `projectLegConstraints` pure function with signature `(params: { caps: number[]; candidateYaws: number[]; segments: { nodeBackOffset: { x: number; z: number } }[]; hipSockets: { cascadeIndex: number; nodeHipLocal: { x: number; z: number }; legLength: number; plantedFoot: { x: number; z: number } }[]; rootWorld: { x: number; z: number; yaw: number }; tolerance: number; maxIterations: number }) => number[]` returning projected yaws (same shape as `candidateYaws`). Implementation note: shipped with flatter param shape (`hipLocalX/Z`, `plantedX/Z`, `rootX/Z/Yaw`) for fewer object allocations per frame; semantics identical.
- [x] 1.2 Inside `projectLegConstraints`, implement a `forwardChainPositions(yaws)` helper that walks the chain from `rootWorld` outward, accumulating rotation and translation per segment, and returns the world XZ position of each hip socket. Pure math — no THREE.js calls.
- [x] 1.3 Implement the iteration loop: for each iteration, compute hip socket world positions, measure each planted foot's `|hipSocketWorld − plantedFootWorld| − legLength`, identify the largest violation, and reduce yaws along the cascade chain between the head and that hip proportional to each joint's contribution, clamping to `[-caps[i], +caps[i]]`. Exit early if all violations within tolerance. Implementation note: shipped with CCD-style per-foot adjustment using analytical Jacobian `perp(hipSocket − pivot)`, damped at 0.5 per iteration.
- [x] 1.4 Export `DEFAULT_PROJECTION_TOLERANCE = 0.05` and `DEFAULT_PROJECTION_ITERATIONS = 4` constants alongside the function.
- [x] 1.5 `npx tsc --noEmit` passes.

## 2. Wire projection into the frame loop

- [x] 2.1 In `app/game/locomotion/useLocomotion.ts`, after `computeCascadeRotations(caps, desired)` produces `cascadeOut`, gather the inputs for `projectLegConstraints`: per-cascade-member `nodeBackOffset`, per-planted-foot `cascadeIndex` (front hip or rear hip), `nodeHipLocal`, `legLength` (computed once via `|nodeHipLeft − nodeFoot|` model-space distance per hip-leg pair), and `plantedFoot` world XZ from each foot runtime's `plantedX`/`plantedZ`.
- [x] 2.2 Skip hip sockets whose corresponding foot is in `stepping` phase (per spec scenario "Stepping foot's constraint is excluded").
- [x] 2.3 Replace `cascadeOut` with the projected result before it is used in the pivot slerp loop (`for (const sg of skeletonGroups)`). The hip pivot's slerp target is now `projectedCascadeOut[hipIdx]` (no longer `runHipStep.appliedYaw`).
- [x] 2.4 Pass the **ORIGINAL** `cascadeOut[hipIdx]` to `runHipStep` as `wantedYaw`. **Deviation from original task wording**: passing the projected yaw would silence strain — projection satisfies leg constraints by construction, so `computeStrain(projectedYaw)` would be ≈0 and stepping would never fire. Passing the original yaw makes strain reflect the *unmet demand* between the desired (head-direction-driven) hip rotation and the projected (constraint-respecting) hip rotation. Step targets and step triggers come from the unmet demand — feet step toward where they need to be for full unconstrained hip rotation. After stepping, the planted feet positions change, the projection re-evaluates, and the pivots slerp to the new (less constrained) projected yaws. This is the mechanism by which walking emerges.
- [x] 2.5 Confirm the pivot snapshots written to the diagnostics buffer record the projected yaws (so the recording shows the corrected pose, not the pre-projection greedy yaws). `FrameSnapshot.cascadeOut` now holds `projectedCascadeOut`; `HipSnapshot.appliedYaw` now holds `projectedCascadeOut[cascadeIndex]`; `HipSnapshot.wantedYaw` holds the original `cascadeOut[cascadeIndex]` — these together let you see the projection's clamp in diagnostics.
- [x] 2.6 `npx tsc --noEmit` passes.

## 3. Leg-length cache

- [x] 3.1 In `useLocomotion.ts`, compute and cache per-leg `legLength` values alongside the existing `frontLegs`/`rearLegs` memos. Store them as `frontLegLengths: { left: number; right: number }` and `rearLegLengths: { left: number; right: number }`.
- [x] 3.2 The cache key is the leg group's id; recompute on group-id change. Use `|nodeHipLeft − nodeFoot|` for left, `|nodeHipRight − nodeFoot|` for right, both in model-space XZ (Y intentionally ignored — pure ground-plane distance).
- [x] 3.3 `npx tsc --noEmit` passes.

## 4. Verify saved angle caps drive the projection

- [x] 4.1 In `projectLegConstraints`, confirm the only source of clamping limits is the `caps: number[]` parameter passed in (which is the existing `caps` array built from `effectiveAngleCaps(g).yaw`).
- [x] 4.2 Confirm no numeric literals in the projection module act as joint limits. (Tolerance and iteration count are not joint limits — they are convergence parameters.)
- [x] 4.3 Grep for any new `Math.PI / 6` or similar magic numbers introduced by this change — there should be none in cascade.ts beyond what already existed.

## 5. Update documentation

- [x] 5.1 In `documentation/animation_design.md`, update the **Current status** date to today and add bullets recording: (a) Step 4 had previously shipped as "read strain, don't block," (b) this change implements the constraint as hard via PBD-style projection over cascade yaws, (c) the prediction that Steps 5–7 should now produce walking on their own per the design's intent, (d) the saved `BodyGroup.angleCaps` continue to be the only source of joint limits.
- [x] 5.2 Add a note under the **Open issue** bullet (or replace it) explaining that the world-anchored foot refactor from the prior change is a precondition for the projection — the projection reads `plantedX`/`plantedZ` as world coordinates.
- [x] 5.3 Update the **Pick up here** bullet to point at the next verification step (browser test of Steps 5–7 with the projection active).

## 6. Browser verification

- [ ] 6.1 Run `npm run dev`, open the Animate step with a two-hip dragon.
- [ ] 6.2 Click directly in front of the dragon: head tracks, body still — no regression on small turns. Spine pose remains relaxed.
- [ ] 6.3 Click far to one side: head rotates within its cap; spine bends *less* than before this change (projection clamps it); a front foot lifts; on replant the body's effective forward direction has shifted toward the attractor.
- [ ] 6.4 Click behind the dragon: full-body cascade engages incrementally over multiple step cycles; the dragon should *walk* toward facing the attractor, not bend-and-slide in place.
- [ ] 6.5 Click in a circle: observe diagonal-couplet alternation emerging from the projection's coupling between front and rear feet.
- [ ] 6.6 Confirm `spine-6.worldPos` (or equivalent root-anchor coord) is still fixed at its model coord — this change does not introduce body translation as a state. Body translation appears as cumulative foot stepping over multiple cycles, not as a single frame's root shift.
- [ ] 6.7 Use the sidebar Copy snapshot to capture a frame and verify the projected `cascadeOut` shows non-greedy values when constraints are active (some joints sub-cap rather than maxed out).
- [ ] 6.8 If the projection produces visible jitter or oscillation, lower the iteration budget to 2 or raise the tolerance and re-test. Note any tuning in `documentation/animation_design.md` Current Status.

## 7. Validate the OpenSpec change

- [x] 7.1 Run `openspec validate add-leg-length-projection --strict` and resolve reported issues.
- [x] 7.2 Run `openspec status --change add-leg-length-projection` and confirm all artifacts are `done`.
