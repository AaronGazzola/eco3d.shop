## ADDED Requirements

### Requirement: Cascade chain includes both hip-bearing spine groups

The cascade chain produced by `buildCascadeChain` SHALL extend from the head through every spine group up to and including the *second* hip-bearing spine group (the rear hip). The first hip-bearing spine group (the front hip) SHALL be a regular member of the same chain, not its terminator.

When the rig has only one hip-bearing spine group, the chain SHALL terminate at that group as it does today (front-hip-only behavior). When the rig has two or more, the chain SHALL terminate at the second.

The tail SHALL NOT be included in the cascade in this change; the tail's pivot SHALL continue to render at rest (identity quaternion via the existing render path).

#### Scenario: Two-hip rig produces a two-hip chain

- **WHEN** the studio config has hip nodes placed on two distinct spine groups
- **THEN** `buildCascadeChain` returns the head plus every spine group from spine[0] through the second hip-bearing spine group, inclusive

#### Scenario: One-hip rig produces a single-hip chain

- **WHEN** the studio config has hip nodes placed on only one spine group
- **THEN** `buildCascadeChain` returns the head plus every spine group up to and including that single hip-bearing group (today's behavior is preserved)

#### Scenario: Tail is excluded from the cascade

- **WHEN** the studio config has a tail body group placed after the rear hip
- **THEN** the tail group is not present in the cascade chain returned by `buildCascadeChain`

### Requirement: Rear hip discovery via `findRearHip`

A `findRearHip(groups)` function SHALL be added to `app/game/locomotion/legs.ts` that returns the *second* spine group bearing hip nodes (`nodeHipLeft` or `nodeHipRight`), or `null` if fewer than two hip-bearing spines exist. The order SHALL match the natural traversal order used by `buildCascadeChain` (i.e., the order in which spine groups appear in the `groups` array).

`findFrontHip` SHALL continue to return the first hip-bearing spine and SHALL NOT be modified.

#### Scenario: Two hip-bearing spines

- **WHEN** the groups array contains spine[A] with hip nodes and spine[B] also with hip nodes, in that order
- **THEN** `findFrontHip` returns spine[A] and `findRearHip` returns spine[B]

#### Scenario: One hip-bearing spine

- **WHEN** the groups array contains exactly one spine group with hip nodes
- **THEN** `findFrontHip` returns that spine and `findRearHip` returns `null`

### Requirement: Rear hip participates in the strain/step state machine independently of the front hip

Each hip present in the cascade SHALL maintain its own `HipState` (`plantedYaw`, `targetYaw`) and its own pair of `FootState`s (left and right), seeded from the corresponding spine group's `nodeHipLeft`/`nodeHipRight` and its legs' `nodeFoot` placements.

Each frame, for each hip:

1. Let `wantedYaw = cascadeOut[hipIndex]` where `hipIndex` is that hip's position in the cascade chain.
2. If neither of that hip's feet is in the `stepping` phase: compute strain on both via `computeStrain(foot, hipBackX, hipBackZ, wantedYaw)`; if either exceeds `STRAIN_THRESHOLD`, transition the appropriate foot (chosen as the front-hip code does today: by sign of `wantedYaw − plantedYaw` when both are strained, otherwise the strained one) to `stepping` with `swingTarget = footTargetAt(foot, hipBackX, hipBackZ, wantedYaw)` and set that hip's `targetYaw = wantedYaw`.
3. If one of that hip's feet is in the `stepping` phase: advance its `swingT` by `dt / STEP_DURATION`; compute that hip's `appliedYaw = plantedYaw + (targetYaw − plantedYaw) × easeInOut(swingT)`; on `swingT >= 1`, replant the foot at its `swingTarget` and set `plantedYaw = targetYaw`.

Front-hip swing state SHALL NOT block rear-hip swing decisions, and vice versa. Within a single hip, at most one foot SHALL be in the `stepping` phase at any time.

#### Scenario: Independent strain decisions per hip

- **WHEN** a frame begins with both hips' feet planted and the cascade demands a yaw at both hip indices
- **THEN** each hip independently evaluates its own feet's strain against its own `wantedYaw` slot and independently decides whether to initiate a step

#### Scenario: Simultaneous front and back swings allowed

- **WHEN** the front-hip's left foot is mid-swing and the rear-hip's right foot becomes strained past threshold
- **THEN** the rear-hip's right foot enters the `stepping` phase on this frame without waiting for the front-hip swing to complete

#### Scenario: Within one hip, only one foot swings at a time

- **WHEN** a hip's left foot is already in the `stepping` phase
- **THEN** that same hip's right foot does not enter the `stepping` phase on this frame, even if its strain exceeds threshold

#### Scenario: Per-hip yaw easing

- **WHEN** the front-hip's foot is mid-swing at `swingT = 0.5` and the rear-hip's feet are both planted
- **THEN** the front-hip's `appliedYaw` is `plantedYaw + 0.5 × easeInOut(0.5) × (targetYaw − plantedYaw)` and the rear-hip's `appliedYaw` is its own `plantedYaw` — the two hips do not share easing state

### Requirement: Back-leg pose derived from two skeleton nodes via single-bone rotate-around-hip

Each back leg's render transform SHALL be derived by the existing `applyLegBone` helper, called with the rear-hip pivot, the rear-hip's `nodeBack` position, the leg's owning hip node (`nodeHipLeft` or `nodeHipRight`), and the leg's `FootState`.

The back leg SHALL remain a single rigid segment from hip to foot. Its length (the distance between its hip node and its foot node in the rest pose) SHALL be preserved across all frames (invariant §1.1). Its hip end SHALL coincide with the rear hip's transported hip-socket position (invariant §1.2). When the foot marker is closer or farther than the bone's length, the bone SHALL rotate to point at the marker; its foot end SHALL trace the corresponding arc on a sphere around the hip socket. No multi-bone IK, no knee node, no runtime bone subdivision SHALL be introduced.

#### Scenario: Back-leg length preserved across the swing

- **WHEN** a back foot is mid-swing at any `swingT` in `[0, 1]`
- **THEN** the distance between the back leg's transported hip-socket position and the back leg's foot end equals (within numerical tolerance) the rest-pose distance between the leg's hip node and its foot node

#### Scenario: Back-leg hip end welded to socket

- **WHEN** the rear-hip pivot rotates by any quaternion produced by the cascade
- **THEN** the back leg's hip end coincides with the rear-hip's `nodeHipLeft` or `nodeHipRight` position transported through the rear-hip pivot's quaternion — there is no gap or overlap at the hip socket

#### Scenario: Foot marker out of reach does not stretch the bone

- **WHEN** the foot marker's distance from the transported hip socket differs from the rest bone length
- **THEN** the back leg rotates to point at the marker; the foot end is placed at the bone's length along that direction, NOT at the marker itself; the bone length is unchanged

### Requirement: Up to four foot markers rendered in the viewport

`AnimatedModel.tsx` SHALL render foot markers for every hip whose legs have `nodeFoot` placements:

- A front-left and front-right marker when `findFrontHip(groups)` returns a hip whose left and right legs both have `nodeFoot`.
- A rear-left and rear-right marker when `findRearHip(groups)` returns a hip whose left and right legs both have `nodeFoot`.

Each marker SHALL have a distinct color so the four are visually distinguishable. `FootMarkerRefs` SHALL be restructured to `{ front: { left, right } | null, rear: { left, right } | null }` and passed to `useLocomotion` so the hook can write each foot's world position to the corresponding marker.

#### Scenario: Two-hip rig renders four markers

- **WHEN** the studio config has both hips set up with all four legs having `nodeFoot` placements
- **THEN** four foot markers render in the viewport, one per foot, in four distinct colors

#### Scenario: One-hip rig renders two markers

- **WHEN** the studio config has only the front hip set up
- **THEN** only the two front foot markers render; no rear markers appear

#### Scenario: Markers track foot world positions across swings

- **WHEN** a back foot is in the `stepping` phase mid-swing
- **THEN** the rear-left or rear-right marker's world position reflects the foot's current XZ interpolation between `swingStart` and `swingTarget` plus the vertical lift `sin(swingT × π) × LIFT_HEIGHT`

### Requirement: Diagnostics snapshot includes both hips and all four feet

`FrameSnapshot` (in `app/game/locomotion/diagnostics.ts`) SHALL be restructured so that hip-related fields are nested per hip rather than singular:

- The previous top-level `frontHipId`, `hipBack`, `hipState`, `wantedHipYaw`, `appliedHipYaw`, `leftFoot`, `rightFoot` SHALL be removed or moved.
- Two new top-level fields SHALL be added: `frontHip` and `rearHip`, each of type `HipSnapshot | null`.
- `HipSnapshot` SHALL contain: `id`, `hipBack: { x: number; z: number } | null`, `cascadeIndex: number`, `wantedYaw: number`, `appliedYaw: number`, `plantedYaw: number`, `targetYaw: number`, `leftFoot: FootSnapshot | null`, `rightFoot: FootSnapshot | null`.

When a hip is not present in the cascade for the current frame, its corresponding `HipSnapshot` SHALL be `null`. `FootSnapshot` retains its current shape.

The `FrameSnapshot.pivots` array SHALL continue to include a `PivotSnapshot` for every cascade member, including the rear hip when present.

#### Scenario: Two-hip rig snapshot has both hip slots populated

- **WHEN** a snapshot is recorded for a frame where both hips are in the cascade
- **THEN** `snap.frontHip` and `snap.rearHip` are both non-null `HipSnapshot` objects with their respective ids, hip-back positions, and foot pairs

#### Scenario: One-hip rig snapshot has only the front slot

- **WHEN** the rig has only the front hip placed
- **THEN** `snap.frontHip` is populated and `snap.rearHip` is `null`

#### Scenario: Pivot snapshot includes the rear hip

- **WHEN** a snapshot is recorded for a two-hip cascade
- **THEN** `snap.pivots` contains entries for every group in the cascade including the rear-hip spine group, each with its requested yaw and applied quaternion

### Requirement: Studio sidebar displays both hip states and all four feet

The Animate step sidebar (`app/admin/animate/StepAnimate.tsx`) SHALL render the current per-hip snapshot for both hips when present. The existing controls (Clear attractor, Copy snapshot, Start/Stop recording, Copy recording, Clear recording) SHALL be preserved unchanged in behavior; their payload SHALL reflect the new four-foot/two-hip snapshot shape.

#### Scenario: Sidebar shows both hips in a two-hip rig

- **WHEN** the user views the Animate step with a two-hip dragon configured
- **THEN** the sidebar displays the front hip's state (planted yaw, target yaw, left and right foot phase + strain) and the rear hip's state in the same layout, visibly distinct

#### Scenario: Sidebar reflects only present hips

- **WHEN** the user views the Animate step with a one-hip rig
- **THEN** the sidebar displays the front hip's state and does not render a rear-hip section (no "null" placeholder UI)

#### Scenario: Copy snapshot includes the new shape

- **WHEN** the user clicks "Copy snapshot" in a two-hip rig
- **THEN** the clipboard payload contains the full `FrameSnapshot` JSON including `frontHip` and `rearHip` fields
