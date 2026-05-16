## Why

The current dragon animation is **head-driven**: the head joint lerps toward the attractor each frame, and the rest of the spine follows by distance constraint. Legs lerp toward an ideal foot position computed from the moving body. This shape — inherited from `argonautcode/animal-proc-anim` — causes two reproducible bugs that no amount of parameter tuning can fix, because they are properties of the architecture:

1. **Feet do not plant.** Each foot's target moves every frame with the body. The foot reaches for it but can only lerp so far, so it slides around as the body translates. There is no world-anchor on a planted foot.
2. **Body slides laterally on head pivot.** When the attractor sweeps across the front of the head, the head joint rotates and the distance-constraint chain whips the whole body sideways. The body translates through the world with no foot-step to justify it. The chain has no world anchor — only the head does.

Both bugs share a root cause: the body has no world anchor. The only thing connecting the dragon to the world is the head joint pulling toward the attractor.

The canonical design (`documentation/animation_design.md` § 7, Slice 1) replaces this with a **foot-anchored** locomotion model derived from the published Trifox lizard system. Feet plant in world space. Hip joints are positioned each frame from the planted feet. The spine resolves in three sections (mid-spine pinned at both hips; head section trailing forward off the front hip with the attractor as a gaze target; tail section trailing back off the rear hip). The head joint *gazes* at the attractor by rotating locally — it does not translate the body. The body only translates as fast as feet step and replant.

This is the foundational motion slice. It subsumes what was previously framed as two separate slices (foot-stepping rework and head-behavior rework). Anticipation, arrival, idle drift, and gaze-vs-heading separation all fall out of the new model rather than being added as separate mechanisms.

## What Changes

### Runtime — new state

- **Intent state** — a single per-creature `{position, heading, velocity}` struct that steers toward `targetRef.current` with a seek + arrival rule (deceleration radius, max speed, optional idle drift when no attractor is set). Intent is the only consumer of attractor input. It has no rendered representation.
- **Per-foot state machine** — each leg gains a `plantState: 'planted' | 'swinging'`, a `plantPos: {x,y,z}` (world-anchored), and during swing: `swingFrom`, `swingTo`, `swingT`. While planted, the leg's `currentTarget` equals `plantPos`. While swinging, `currentTarget` interpolates along a parabolic arc from `swingFrom` to `swingTo` with vertical lift `liftHeight × 4t(1−t)` over `swingDuration` seconds.

### Runtime — solver pipeline (replaces today's head-driven `Solver`)

Each frame, in order:

1. **Update intent** from attractor via steering rule.
2. **Update each foot's plant state.** For each leg, compute `footDesired = intent.position + hipRestOffset_rotated_by_intent.heading + restFootOffset_rotated_by_intent.heading`. If planted and `|plantPos − footDesired| > stepThreshold` (with optional directional offset curve), transition to swinging with `swingTo = footDesired + intent.velocity × predictionGain` and `swingFrom = plantPos`. If swinging, advance `swingT`; on completion, replant at `swingTo`. Each foot writes its final position to `limb.currentTarget`.
3. **Position the hip joints** in `chain.joints` from the planted feet: `J_front = midpoint(frontLeftFoot, frontRightFoot) + bodyHeight × up`; same for `J_back`.
4. **Solve the mid-spine** between `J_front` and `J_back` via `Chain3D.resolveDualAnchor(startAnchor, endAnchor)`: a forward FABRIK pass from `J_front`, a backward FABRIK pass from `J_back`, iterated until distance + angle constraints converge.
5. **Solve the head section** (joints from `J_front` outward to joint 0) via one-anchored FABRIK with the head joint's angle constraint biased toward the attractor. The head rotates to gaze; it does not translate the body.
6. **Solve the tail section** (joints from `J_back` outward to the last joint) via the existing one-anchored Chain3D resolve, no target — distance + angle constraints alone.
7. **Solve each leg** via the existing `fabrik3d.ts`, between `limb.anchor` (hip joint position from step 3) and `limb.currentTarget` (foot position from step 2).

### Solver capability added

- **`Chain3D.resolveDualAnchor(startAnchor, endAnchor)`** — both-ends-pinned FABRIK iteration. Reuses the existing distance-projection + angle-clamp logic; the addition is a backward pass from the end anchor and a convergence loop. Existing `Chain3D.resolve(target)` (one-anchored) is preserved for the head and tail sections.

### Config changes to `AnimationConfig` (`app/studio/page.types.ts`)

**Added:**

- **Intent steering:** `intentDamping` (number), `idleDriftAmplitude` (number), `idleDriftFrequency` (number).
- **Per-foot (initially shared across all four; per-foot overrides come in a later slice):** `swingDuration` (number), `liftHeight` (number), `predictionGain` (number).
- **Body:** `bodyHeight` (number, hip height above feet midpoint), `groundY` (number, defaults to 0).

**Renamed:**

- `followDistance` → `arrivalRadius`. Same semantic role (distance at which the body decelerates and arrives), name aligned with the steering literature and the new model's vocabulary. A one-time migration in the store seeds `arrivalRadius` from any persisted `followDistance` value, then drops the old key.

**Removed (obsolete under the new model):**

- `limbAngleOffset` — the previous foot-desired math used `heading + limbAngleOffset × side` to bias the foot direction relative to the body's heading. The new model derives the foot's desired position from `intent.position + hipOffset + restFootOffset rotated by intent.heading`, with `restFootOffset` coming directly from the studio's `nodeHip → nodeFoot` placement. The slider has no role; the per-side asymmetry it provided is now an emergent property of studio node placement.
- `stepSmoothing` — the previous foot motion was a continuous lerp toward a moving target, with `stepSmoothing` as the lerp factor. The new model has no continuous lerp — a foot is either planted (fixed in world space) or swinging along a parabolic arc parametrized by `swingDuration`. There is nothing for a smoothing factor to act on.

**Rebound (field unchanged, meaning shifts):**

- `maxSpeed` — now bounds the intent state's translation speed instead of the head joint's. Same field, same UX label, equivalent effect on overall pace.
- `wanderRadius`, `wanderSpeed` — unchanged. They belong to the wandering behavior (which writes the attractor), not to the locomotion model.
- `stepThreshold` — semantics narrow to the per-foot drift threshold; the global value becomes the default for all four feet.
- `showAttractor`, `angleConstraint` — unchanged.

### Renderer changes

- `app/game/AnimatedModel.tsx`: positions spine groups using `joint.y` (was hardcoded `0`), and leg groups using `anchor.y` for hip position and the (anchor.y, currentTarget.y) difference for vertical leg orientation. This realizes the "current-state caveat, not an invariant" already noted in `documentation/skeleton_to_model_mapping.md` § 3.

### Panel changes

In `app/studio/StepAnimate.tsx` (Extrinsic tab):

- **Feet** subsection — controls: Step Threshold (`stepThreshold`), Swing Duration (`swingDuration`), Lift Height (`liftHeight`), Prediction Gain (`predictionGain`). The Foot Angle Offset and Step Smoothing sliders are **removed** since their underlying fields are obsolete.
- **Head / Target** subsection — controls: Wander Radius, Wander Speed, Max Speed, Arrival Radius (renamed from Follow Distance), Idle Drift Amplitude, Idle Drift Frequency, Show Attractor checkbox, left-click hint. Bindings for Wander Radius, Wander Speed, Max Speed retain the same `AnimationConfig` fields; their meanings now drive the intent state. Arrival Radius binds to the renamed `arrivalRadius` field.
- **Body** subsection (new) — Body Height (`bodyHeight`).

### Debug overlay additions

In `app/studio/AnimationDebugOverlay.tsx`:

- **Foot state badge** — small text label ("P" / "S") next to each foot gizmo.
- **Step-trigger ring** — circle around each planted foot's `plantPos` at radius `stepThreshold`.
- **Swing arc preview** — dashed parabola from `swingFrom` to `swingTo` while swinging.
- **Intent marker** — distinct gizmo at `intent.position` with a heading arrow along `intent.heading`.
- **Hip-derivation lines** — faint segment from each hip joint to its feet midpoint, so the body's anchor relationship is visible.

Each gated by a new toggle in `useStudioStore.overlayToggles`.

## Capabilities

### Modified Capabilities

- **`dragon-animation`** — locomotion model is inverted from head-driven to foot-anchored. The renderer contract is preserved (`joints`, `limb.anchor`, `limb.currentTarget` remain the only outputs the renderer reads). The studio workflow is preserved (no changes to step 1 or step 2; the same studio node data feeds the new runtime). The animation panel grows new controls but its Intrinsic / Extrinsic tab structure is unchanged.

### New Capabilities

None. The work extends the existing `dragon-animation` capability.

## Impact

- **New files:**
  - None expected at the file level; new logic lives inside the existing animation files.
- **Edited files:**
  - `app/game/chain3d.ts` — adds `resolveDualAnchor` method. Existing `resolve` preserved.
  - `app/game/animations/solver.ts` — pipeline replaced with the seven-step ordering above.
  - `app/game/useCreature.ts` — accepts new config fields; per-frame loop calls the new solver pipeline.
  - `app/game/AnimatedModel.tsx` — reads `joint.y` / `anchor.y` (was hardcoded `0` for spine/leg groups).
  - `app/game/modelConfigToCreatureConfig.ts` — derives `hipJointFrontIndex`, `hipJointBackIndex` from the studio's hip-bearing spine groups; preserved derivations (`segmentLengths`, `hipOffset`, `limbReach`, `parentRestAngle`) unchanged.
  - `app/studio/page.types.ts` — adds new fields to `AnimationConfig`; adds new overlay toggle keys to `OverlayToggles`.
  - `app/studio/page.stores.ts` — defaults for the new fields; persisted via the existing `partialize`.
  - `app/studio/StepAnimate.tsx` — adds the new sliders to the Extrinsic tab's existing subsections plus a new Body subsection.
  - `app/studio/AnimationDebugOverlay.tsx` — adds the new gizmos and toggles.
  - `app/game/animations/dragon/wandering.ts` — adjusted to write intent input (`intent.position` target) instead of writing the head's chase target directly. Behavior name and registration unchanged.
- **Untouched:**
  - Studio steps 1 and 2 (segment editor + node placement) — no changes to the data they produce.
  - `app/studio/NodeOverlay.tsx`, `app/studio/StepGroup.tsx`, `app/studio/StepSegments*.tsx`.
  - The `ModelConfigRow` shape persisted via Supabase — no schema changes.
  - The studio↔runtime↔renderer contract from `documentation/skeleton_to_model_mapping.md` — only the *Y-axis caveat* is acted on; the three-bucket contract is preserved verbatim.
  - The home-page `HatchingDragon` path — the new solver works there too; no API regressions to its `AnimatedModel` usage.
- **No new external dependencies.**
- **No database / Supabase changes.**
- **Breaking change (internal):** the runtime's solver pipeline changes. Any code outside `app/game/animations/` that relied on the head joint being the "lead" of the chain will need to be updated. Audit: `dragon/wandering.ts` is the only known consumer; `Director` and behavior infrastructure are untouched.
- **Persistence migration:** existing tuned values in `useStudioStore.animationConfig` partially survive. `angleConstraint`, `stepThreshold`, `wanderRadius`, `wanderSpeed`, `maxSpeed`, `showAttractor` continue under the same field names. `followDistance` is migrated to `arrivalRadius` (one-time read at store hydration). `limbAngleOffset` and `stepSmoothing` are dropped since their underlying mechanics no longer exist; previously-tuned values for those two fields are not preserved.
