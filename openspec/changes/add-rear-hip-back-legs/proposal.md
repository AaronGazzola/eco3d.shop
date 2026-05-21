## Why

Step 5 of the animation roadmap (`documentation/animation_design.md` § 4) is verified: the dragon's head tracks the attractor, the cascade propagates through pre-hip spine joints, and the front feet step when their hip strains past threshold. The dragon can now turn its front half toward an attractor — but the rear hip and back legs are still frozen, so the body cannot complete a turn or take a real walking step. Step 6 of the roadmap is the next move: extend the same constraint solver to the rear hip and back legs so the full body responds to the attractor, and the diagonal-couplet alternation predicted by the design (§ 2 "How motion happens", § 4 Step 6 "passes if") can be observed.

## What Changes

- **Cascade chain extension.** `buildCascadeChain` currently stops at the first spine group bearing hip nodes (the front hip). It SHALL be extended to include every spine group between the head and the *second* hip-bearing spine group (the rear hip), inclusive. The tail still does not enter the cascade in this step.
- **Two-hip locomotion state.** `useLocomotion.ts` currently tracks one `HipState` and one `{ left, right }` foot pair. It SHALL track two hip states (front + rear) and two foot pairs (front + rear), each with the same plant/swing state machine that Step 5 introduced for the front hip.
- **Hip discovery generalization.** `legs.ts` exposes `findFrontHip` returning the *first* hip-bearing spine. A `findRearHip` SHALL be added that returns the *second* hip-bearing spine. `findLegsForHip` already accepts any hip id and needs no change.
- **Back-leg rendering.** The `applyLegBone` call site in `useLocomotion.ts` currently runs only for the front legs. It SHALL be called for the back legs too, passing the rear hip's pivot, its `nodeBack`, and its left/right hip nodes. `applyLegBone` itself needs no change — it is already generic over which hip + which leg.
- **Per-hip strain decisions.** Each hip SHALL run its own `computeStrain` → step-decision loop against its own foot pair, using its own `cascadeOut[hipIdx]` value as the wanted yaw. Stepping interlock SHALL be per-hip (one front foot at a time AND one back foot at a time — front and back may step simultaneously, since they have independent supports). Hip yaw easing during a swing SHALL remain per-hip (each hip's `appliedHipYaw` blends from its own `plantedYaw` to its own `targetYaw`).
- **Foot marker rendering.** `AnimatedModel.tsx` currently renders two front foot markers when `hasFrontLegs` is true. It SHALL render up to four markers (two front + two back) when the corresponding hips and legs are present, with distinct colors so each is identifiable.
- **Diagnostics snapshot.** `FrameSnapshot` SHALL grow to record both hips' state and all four feet (renamed/structured so the existing front-only fields are no longer ambiguous). The Step 5 recording format is broken in this change — diagnostics is internal-only, no backward compatibility is required.
- **Studio sidebar.** `app/admin/animate/StepAnimate.tsx` SHALL display both hip states and all four feet in the snapshot/recording display. Existing Clear attractor / Copy snapshot / Start / Stop / Copy recording / Clear recording controls are preserved.
- **Tail stays frozen.** Per the roadmap, Step 6 does NOT unfreeze the tail. Tail unfreezing is Step 8 and is explicitly out of scope.
- **Single-bone leg invariant preserved.** Per `documentation/animation_design.md` § 1 invariants — specifically §1.1 (bone lengths constant) and §1.4 (one BodyGroup = one rigid bone) — the back leg is, like the front leg, a single rigid segment from hip to foot. No multi-bone IK, no knee node, no runtime bone subdivision. Back-leg pose SHALL be derived by the existing `applyLegBone` rotation-around-hip transform (hip node from rear-hip pivot's quaternion, foot end from foot marker, segment length preserved).

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `dragon-animation`: adds requirements for rear-hip cascade participation, rear-leg stepping, two-hip diagnostics, and four-foot rendering.

## Impact

- **Edited files:**
  - `app/game/locomotion/chain.ts` — extend `buildCascadeChain` to include the second hip-bearing spine group.
  - `app/game/locomotion/legs.ts` — add `findRearHip`.
  - `app/game/locomotion/useLocomotion.ts` — refactor `feetRef` from `{ left, right }` to a per-hip structure; duplicate the step-decision/strain loop for the rear hip; call `applyLegBone` for back legs; expand the frame snapshot payload.
  - `app/game/locomotion/diagnostics.ts` — extend `FrameSnapshot` to carry per-hip state and all four feet.
  - `app/game/AnimatedModel.tsx` — render up to four foot markers; expose two pairs of marker refs through `FootMarkerRefs`.
  - `app/admin/animate/StepAnimate.tsx` — sidebar displays both hips and all four feet.
- **Untouched:**
  - `app/game/locomotion/cascade.ts` — `computeCascadeRotations` is already generic over chain length; no change.
  - `app/game/locomotion/foot.ts` — `makeFootState`, `footTargetAt`, `computeStrain`, `easeInOut`, and the `FootState` shape are already per-foot and parameterized by a hip's `(hipBackX, hipBackZ)`; no change.
  - `app/game/locomotion/headGaze.ts` — head behavior is unchanged.
  - Studio steps 1 and 2 (node placement, segment grouping) — no studio data shape changes.
  - `ModelConfigRow` / Supabase schema — unchanged.
- **No new external dependencies.**
- **No database / Supabase changes.**
- **Breaking change (internal):** the `FrameSnapshot` shape changes. Diagnostics is internal tooling for AI agents diagnosing animation issues by pasting recordings back into chat — no persisted recordings, no migration needed. The Step 5 snapshot/recording controls in the sidebar continue to work; their payload is broader.
