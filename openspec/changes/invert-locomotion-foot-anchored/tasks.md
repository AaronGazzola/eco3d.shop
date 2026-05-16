## 1. Types and store changes

- [x] 1.1 In `app/studio/page.types.ts`, remove `limbAngleOffset` and `stepSmoothing` from `AnimationConfig`.
- [x] 1.2 Rename `followDistance` to `arrivalRadius` in `AnimationConfig`.
- [x] 1.3 Add intent-steering fields to `AnimationConfig`: `intentDamping: number`, `idleDriftAmplitude: number`, `idleDriftFrequency: number`.
- [x] 1.4 Add foot-stepping fields to `AnimationConfig`: `swingDuration: number`, `liftHeight: number`, `predictionGain: number`.
- [x] 1.5 Add body fields to `AnimationConfig`: `bodyHeight: number`, `groundY: number` (defaults to 0).
- [x] 1.6 Add new overlay toggle keys to `OverlayToggles` in `app/studio/page.types.ts`: `footState`, `stepRing`, `swingArc`, `intent`, `hipDerivation`. Default all to `true`.
- [x] 1.7 In `app/studio/page.stores.ts`, provide sensible defaults for every new or renamed `AnimationConfig` field. `idleDriftAmplitude` defaults to `0` (no idle drift until tuned). All new fields participate in the existing `partialize` so they persist across reload.
- [x] 1.8 Add a one-time persistence migration: at store hydration, if a persisted `followDistance` value is present, seed `arrivalRadius` from it and drop the old key. Persisted values for `limbAngleOffset` and `stepSmoothing` are silently dropped.
- [x] 1.9 Add new overlay toggle defaults to the store and to `partialize`.
- [x] 1.10 `npx tsc --noEmit` passes after types and store changes.

## 2. Dual-anchor FABRIK on `Chain3D`

- [x] 2.1 In `app/game/chain3d.ts`, add method `resolveDualAnchor(startAnchor: Vec3, endAnchor: Vec3, iterations?: number): void` that performs a forward FABRIK pass from `startAnchor` and a backward pass from `endAnchor`, repeating for `iterations` (default `3`) or until distance error is below a small epsilon. Both passes enforce the existing per-joint `angleConstraint`.
- [x] 2.2 The forward pass pins `joints[0] = startAnchor` and projects each subsequent joint along the line to its parent at distance `segmentLengths[i-1]`, then clamps its angle relative to the parent within `angleConstraint`.
- [x] 2.3 The backward pass pins `joints[N-1] = endAnchor` and walks back projecting each joint at distance `segmentLengths[i]` from its child, with the same angle clamp.
- [x] 2.4 Existing `resolve(target)` is preserved unchanged. The new method is purely additive.
- [x] 2.5 `npx tsc --noEmit` passes.

## 3. Runtime: intent state and steering

- [x] 3.1 In `app/game/animations/solver.ts` (or a new `intent.ts` file co-located with it), define an `IntentState` type: `{ position: Vec3, heading: Vec3, velocity: Vec3 }`.
- [x] 3.2 Initialize `intent` at the body's start position (use the existing `chainOrigin` / `initialJoints` data as the seed).
- [x] 3.3 Each frame, compute `desired = attractor - intent.position`. If `|desired| > arrivalRadius`, accelerate intent toward the attractor at `maxIntentSpeed`. Within `arrivalRadius`, decelerate proportionally. Apply `intentDamping` to `intent.velocity` each frame.
- [x] 3.4 When no attractor is set (or `|desired|` is below a small threshold), sample idle drift: `intent.velocity += idleDriftAmplitude × sinSum(t × idleDriftFrequency, ...)`. With `idleDriftAmplitude = 0` (default), idle drift has no effect.
- [x] 3.5 Update `intent.heading` toward `intent.velocity`'s direction with a max angular rate (use the existing per-frame angular clamp from today's head behavior).
- [x] 3.6 Intent state is held in a ref alongside `chainRef` and `limbStatesRef` so the debug overlay can read it without subscribing.

## 4. Runtime: per-foot plant/swing state machine

- [x] 4.1 Extend `limbStatesRef` / `LimbState` to include: `plantPos: Vec3`, `plantState: 'planted' | 'swinging'`, `swingFrom: Vec3`, `swingTo: Vec3`, `swingT: number`.
- [x] 4.2 On initialization, seed each foot's `plantPos` from the studio-derived rest position (`spineCentroid + limbReach × restHeadingForFoot`), set `plantState = 'planted'`, `swingT = 0`.
- [x] 4.3 Each frame, for each foot, compute `desired = intentPosition + hipRestOffset_rotated_by_intent.heading + restFootOffset_rotated_by_intent.heading`. Add a small `groundY` term to keep `desired.y = groundY`.
- [x] 4.4 If `plantState === 'planted'` and `|plantPos.xz − desired.xz| > stepThreshold`, transition: set `swingFrom = plantPos`, `swingTo = desired + intent.velocity × predictionGain`, `swingT = 0`, `plantState = 'swinging'`.
- [x] 4.5 If `plantState === 'swinging'`, advance `swingT += dt / swingDuration`. Compute current foot position by linearly interpolating XZ from `swingFrom` to `swingTo` and adding parabolic lift on Y: `lift = liftHeight × 4 × swingT × (1 - swingT)`. Write to `limb.currentTarget`. When `swingT >= 1`, set `plantPos = swingTo`, `plantState = 'planted'`, `swingT = 0`.
- [x] 4.6 If `plantState === 'planted'`, write `limb.currentTarget = plantPos`.

## 5. Runtime: hip joint positioning from feet

- [x] 5.1 In `app/game/modelConfigToCreatureConfig.ts`, expose `hipJointFrontIndex` and `hipJointBackIndex` on the derived config — the indices into `chain.joints` for the spine joints owning the front and back hip nodes respectively. Derive from the studio's BodyGroup data: walk the spine chain from head to tail; the first spine group with both `nodeHipLeft` and `nodeHipRight` is front; the next is back.
- [x] 5.2 In the solver, after Step 4 (per-foot state machine), compute each hip joint's position:
  - `frontMidpoint = midpoint(frontLeftFoot.currentTarget, frontRightFoot.currentTarget)`
  - `chain.joints[hipJointFrontIndex] = { x: frontMidpoint.x, y: frontMidpoint.y + bodyHeight, z: frontMidpoint.z }`
  - Same for back hips.
- [x] 5.3 Update each leg's `limb.anchor` to equal the corresponding hip joint position. The existing hip-rotation math (`hipOffset rotated by parentRot`) is replaced by this direct read — the hip joint position *is* the anchor.

## 6. Runtime: three-section spine solve

- [x] 6.1 **Mid-spine.** Call `chain.resolveDualAnchor(chain.joints[hipJointFrontIndex], chain.joints[hipJointBackIndex])` operating on the sub-chain between the two hip indices.
- [x] 6.2 **Head section.** Joints from `hipJointFrontIndex - 1` outward to joint 0. Use the existing `Chain3D.resolve` adapted to anchor at `hipJointFrontIndex` and target the attractor with the head joint (joint 0) clamped by its `angleConstraint`. Practically: run a forward FABRIK pass anchored at `hipJointFrontIndex`, sweeping outward toward joint 0, with joint 0's heading biased toward the attractor.
- [x] 6.3 **Tail section.** Joints from `hipJointBackIndex + 1` outward to the last joint. Use the existing `Chain3D.resolve` anchored at `hipJointBackIndex` with no explicit target — distance + angle constraints alone produce the trailing tail.
- [x] 6.4 Each section preserves the existing per-joint `angleConstraint`. No joint exceeds its bend cap.

## 7. Runtime: leg IK unchanged

- [x] 7.1 The existing `fabrik3d.ts` leg IK remains. Per frame, for each leg, FABRIK resolves the 3-joint leg between `limb.anchor` (now from Step 5) and `limb.currentTarget` (now from Step 4).
- [x] 7.2 No changes to `fabrik3d.ts` itself.

## 8. Solver wiring and behavior compatibility

- [x] 8.1 In `app/game/animations/solver.ts`, replace the per-frame body of the existing solver with the seven-step pipeline (intent → feet → hips → mid-spine → head section → tail section → legs). Preserve the public `Solver` interface so `Director`, `useCreature`, and the behaviors continue to call it identically.
- [x] 8.2 `app/game/animations/dragon/wandering.ts` continues to write to `targetRef` as today. The solver internally feeds `targetRef.current` into `intent`. No changes to behavior files.
- [x] 8.3 `useCreature.ts` accepts the new config fields and seeds the solver with them. The solver-construction effect's dep array continues to list only the structural keys (spine joint count, hip indices, etc.) so the per-slider tick does not rebuild the solver. A separate effect mutates `solverRef.current.config = config` whenever config changes (mirror of the perf fix from Slice 0).

## 9. Renderer updates

- [x] 9.1 In `app/game/AnimatedModel.tsx`'s `useFrame`, update spine-group positioning to read `joint.y` instead of hardcoding `0`: `group.position.set(joint0.x, joint0.y, joint0.z)`.
- [x] 9.2 Update leg-group positioning to read `limb.anchor.y` instead of hardcoding `0`.
- [x] 9.3 Update the leg group's rotation calculation to include the vertical difference between anchor and currentTarget, so the leg visibly tracks the foot through its swing arc. The existing planar `atan2(currentTarget − anchor)` rotation around Y is preserved; an additional rotation around the leg's local X axis (or equivalent) accounts for vertical extension.
- [ ] 9.4 Browser-verify the home-page dragon (which uses the same `AnimatedModel` via `HatchingDragon`) still renders correctly with the new pipeline. No segments drift apart; no segments float above or below the rig.

## 10. Debug overlay extensions

- [x] 10.1 In `app/studio/AnimationDebugOverlay.tsx`, add a **foot state badge** near each foot gizmo: a small letter "P" (planted) or "S" (swinging) rendered at the foot's current position. Gated by `overlayToggles.footState`.
- [x] 10.2 Add a **step-trigger ring** around each foot's `plantPos` at radius `stepThreshold` (on the ground plane). Gated by `overlayToggles.stepRing`.
- [x] 10.3 Add a **swing arc preview** as a dashed parabola from `swingFrom` to `swingTo` while `plantState === 'swinging'`. Gated by `overlayToggles.swingArc`.
- [x] 10.4 Add an **intent marker** at `intent.position` with an arrow along `intent.heading`. Distinct color from the head-target arrow. Gated by `overlayToggles.intent`.
- [x] 10.5 Add **hip-derivation lines** from each hip joint to its feet midpoint, drawn as a faint segment. Gated by `overlayToggles.hipDerivation`.
- [x] 10.6 Use the same `depthTest={false}` + `raycast={null}` patterns established in Slice 0.

## 11. Panel updates

- [x] 11.1 In `app/studio/StepAnimate.tsx`, extend the overlay-toggle row with the five new toggles (Foot State, Step Ring, Swing Arc, Intent, Hip Derivation).
- [x] 11.2 Remove the **Foot Angle Offset** and **Step Smoothing** sliders from the Extrinsic → Feet subsection.
- [x] 11.3 In the **Extrinsic → Feet** subsection, the remaining controls are: Step Threshold (`stepThreshold`), Swing Duration (`swingDuration`), Lift Height (`liftHeight`), Prediction Gain (`predictionGain`).
- [x] 11.4 In the **Extrinsic → Head / Target** subsection, rename the **Follow Distance** slider to **Arrival Radius** and rebind it to `arrivalRadius`. Add sliders for `idleDriftAmplitude` and `idleDriftFrequency`. Keep Wander Radius, Wander Speed, Max Speed sliders with their existing bindings; their UX labels are unchanged.
- [x] 11.5 Add a new **Extrinsic → Body** subsection with a `bodyHeight` slider.
- [x] 11.6 Every slider binds to a field on `AnimationConfig` via the existing `setAnimationField` setter. Ranges and step sizes use the same conventions as nearby sliders.

## 12. Rig generality verification

- [ ] 12.1 Author two distinct studio configs for testing: Rig A — short spine (e.g. 5 joints), close-set hips (front/back hip joints adjacent). Rig B — long spine (e.g. 10+ joints), widely-spaced hips, asymmetric segment lengths.
- [ ] 12.2 Confirm Rig A animates correctly with the new pipeline: feet plant, body does not slide laterally on head pivot, motion reads as walking.
- [ ] 12.3 Confirm Rig B animates correctly with the same code path and the same panel-tuned parameters as Rig A.
- [ ] 12.4 No code change is required between the two rigs. Any per-rig adjustment is in the studio's node placement, not in `app/game/`.

## 13. Verification

- [ ] 13.1 Studio step 3 renders. Dragon animates under the new pipeline.
- [ ] 13.2 Feet are visibly planted between steps. No continuous sliding of foot gizmos.
- [ ] 13.3 Sweep the attractor across the front of the head: the head joint rotates to gaze at the attractor; the body's hip joints do not drift laterally until a foot steps.
- [ ] 13.4 Move the attractor behind the dragon: feet step backwards; the body moves backwards. No facing requirement.
- [ ] 13.5 Every new overlay gizmo toggles independently and does not block pointer events.
- [ ] 13.6 Every new slider effects the live dragon as designed (e.g. increasing `liftHeight` produces visibly higher swing arcs).
- [ ] 13.7 Existing tuned values in `useStudioStore.animationConfig` survive page reload; the dragon's motion under those values is qualitatively similar to before (feet plant, body does not slide).
- [ ] 13.8 Home-page dragon (`HatchingDragon`) animates under the new pipeline without changes to the home page itself.
- [x] 13.9 `npx tsc --noEmit` passes.

## 14. Validate the OpenSpec change

- [x] 14.1 Run `openspec validate invert-locomotion-foot-anchored --strict` and resolve any reported issues.
- [ ] 14.2 Run `openspec status --change invert-locomotion-foot-anchored` and confirm all artifacts are `done`.
