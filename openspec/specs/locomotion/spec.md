# locomotion Specification

## Purpose
TBD - created by archiving change add-fk-renderer-phase-a2. Update Purpose after archive.
## Requirements
### Requirement: Body spec is derived from the rig

The system SHALL provide `buildBodySpec(groups, segments)` returning a `BodySpec | null`.

The rig's canonical node convention (mirrored by the group editor at `/admin/group` — see `NodeOverlay.tsx`'s `getCanonicalNodes`) places each chain joint at the **parent's `nodeBack`**. Only the head exposes a `nodeFront` (its snout, not a joint). All non-head chain groups carry a `nodeBack` that simultaneously marks the joint to the next downstream segment.

The rotation center for each chain segment SHALL therefore be resolved in this order: (1) the *parent* chain segment's `nodeBack` (the canonical joint location), (2) the segment's own `nodeBack` as a fallback when no parent exists or the parent has no `nodeBack`, (3) the segment's own `nodeFront` as a final fallback. Any stale `nodeFront` value on a non-head chain segment SHALL NOT participate in pivot selection — it is treated as residue from earlier rig conventions and ignored.

When the rig has at least one chain group whose center can be resolved this way, the function SHALL return a non-null `BodySpec`. When no chain group resolves, the function SHALL return `null`.

Each `PlanarSegment` SHALL carry the segment's `groupId`, `length` (distance to the next chain segment's rotation center, with a mesh-extent fallback at the tail), `mass` (density × mesh-AABB volume; density is a documented constant), `inertiaAboutComY` (box inertia formula), and rest-pose XZ positions of both the rotation center and the mesh centroid.

Each `PlanarJoint` SHALL carry `segmentIndex` (the child segment's index in the chain), `coordIndex = 3 + (segmentIndex - 1)`, `yawForwardLimit`, and `yawBackwardLimit` taken from `effectiveAngleCaps(childGroup)`.

The output SHALL be deterministic for the same input — equal `groups` and `segments` produce equal `BodySpec` values, segment ordering follows `flattenSkeleton(buildSkeletonTree(groups))`.

#### Scenario: A chainless rig returns null

- **WHEN** `buildBodySpec` is called with `groups` containing no `head` group
- **THEN** the function returns `null` without throwing

#### Scenario: Chain segments map to PlanarSegments in head→tail order

- **WHEN** `buildBodySpec` is called with a rig whose chain is head → spine1 → spine2 → tail
- **THEN** the returned `BodySpec.segments` has length 4 with `groupId` values in that order

#### Scenario: A joint inherits its child segment's angle caps

- **WHEN** `buildBodySpec` is called for a rig whose `spine1.angleCaps` is `{ yaw: 0.5, pitchUp: 0.3, pitchDown: 0.3 }`
- **THEN** the joint at `segmentIndex === 1` has `yawForwardLimit === 0.5` and `yawBackwardLimit === 0.5`

### Requirement: Manual pose state is the render source when not calibrating

The `animateStore` SHALL carry a `manualPose` field of shape `{ rootX: number; rootZ: number; rootYawRad: number; jointAnglesRad: Record<string, number> }` with setters that update individual fields and a `resetManualPose` action that returns all fields to zero / empty.

When `animateTab !== 'calibrate'`, `useLocomotion` SHALL on each frame:

- write `manualPose.rootX` to the bound root group's `position.x`,
- write `manualPose.rootZ` to the bound root group's `position.z`,
- write `manualPose.rootYawRad` (Y-axis) to the bound root group's `quaternion`,
- write each chain joint's pivot quaternion as `setFromAxisAngle(Y_AXIS, clamp(manualPose.jointAnglesRad[childGroupId] ?? 0, [-child.yawBackwardLimit, +child.yawForwardLimit]))`, and
- write the head pivot's quaternion to the identity.

When `animateTab === 'calibrate'`, the existing rest-pose-plus-calibrating-group behavior is preserved verbatim: every chain group's pivot is set to identity *except* the calibrating group, which receives the calibration yaw + pitch quaternion.

#### Scenario: Moving the root x slider translates the rendered body

- **GIVEN** `animateTab === 'simulate'` and the rig is loaded
- **WHEN** `manualPose.rootX` is set to `2`
- **THEN** the root group bound by `rootRef` has `position.x === 2` after the next frame

#### Scenario: A joint slider past the cap clamps the rendered joint

- **GIVEN** `animateTab === 'simulate'` and `spine1.yawForwardLimit === 0.5`
- **WHEN** `manualPose.jointAnglesRad['spine1-id']` is set to `1.2`
- **THEN** the spine1 pivot's quaternion equals `setFromAxisAngle(Y_AXIS, 0.5)` (the clamped value), not `1.2`

#### Scenario: Calibration overrides manual pose for the calibrating group only

- **GIVEN** `animateTab === 'calibrate'`, `calibratingGroupId === 'spine2-id'`, and `manualPose.jointAnglesRad` is `{ 'spine1-id': 0.3, 'spine2-id': 0.4 }`
- **WHEN** the next frame runs
- **THEN** `spine1`'s pivot is the identity, `spine2`'s pivot reflects the calibration yaw + pitch, and `manualPose` is not consulted for either

### Requirement: AnimatedModel's outer group binds the root ref

`AnimateScene` SHALL create a `useRef<THREE.Group | null>` and pass it as `rootRef` to `AnimatedModel`. `AnimatedModel` SHALL bind the passed `rootRef` to its outermost `<group>` (the one wrapping `ChainNode` and the top-level non-chain children).

When `rootRef` is undefined, `AnimatedModel` SHALL render without binding any ref (forward-compatible with callers that do not drive root pose).

#### Scenario: Mounted model exposes its root via the passed ref

- **GIVEN** `AnimateScene` is mounted with a non-empty rig
- **WHEN** the canvas finishes its first commit
- **THEN** `rootRef.current` is a `THREE.Group` instance whose name path roots the model

### Requirement: Legs render under their attached spine's pivot

In `AnimatedModel`, leg groups (`type === 'leg-left' | 'leg-right'`) SHALL render as children of their attached spine's `ChainNode` inner offset group (the same group that holds the spine's `GroupBody` and downstream chain children).

A leg whose `attachedToSpineId` does not resolve to a chain group SHALL render at the model root and `console.error` with the leg's `id` and the unresolved `attachedToSpineId`. The render does not throw.

A leg SHALL still register its `<group>` ref in `pivotsRef` so the Calibrate path can rotate it around its hip node.

#### Scenario: A leg attached to spine2 rotates with spine2

- **GIVEN** `legA.attachedToSpineId === 'spine2-id'`
- **WHEN** `manualPose.jointAnglesRad['spine2-id']` is set so spine2's pivot rotates by `0.3` rad
- **THEN** `legA`'s world transform reflects the same `0.3` rad rotation around spine1's `nodeBack` (the canonical joint between spine1 and spine2)

#### Scenario: A leg with a missing parent renders at the root with a console error

- **GIVEN** `legB.attachedToSpineId === 'gone-id'` and no group has `id === 'gone-id'`
- **WHEN** the model mounts
- **THEN** `legB` renders as a child of the model root, `console.error` is called once with `legB.id` and `'gone-id'`, and no exception is thrown

### Requirement: Simulate sidebar exposes manual pose sliders

The Simulate tab in `AnimateSidebar` SHALL render:

- one slider for `manualPose.rootX` with range `[-5, 5]`,
- one slider for `manualPose.rootZ` with range `[-5, 5]`,
- one slider for `manualPose.rootYawRad` with range `[-π, π]`,
- one slider per chain joint (head excluded), in head→tail order, bound to `manualPose.jointAnglesRad[childGroupId]` with a fixed range of `[-π/2, +π/2]` so the user can drag past the joint's cap and visually verify the render-side clamp, and
- a **Reset pose** button that invokes `resetManualPose`.

The Simulate tab SHALL NOT render Run / Pause, Perturb, Reset (the solver one), Record, or diagnostic readouts in this change.

#### Scenario: Joint slider count matches chain joint count

- **GIVEN** the rig has 5 chain groups (head + 3 spines + tail)
- **WHEN** the Simulate tab renders
- **THEN** the tab contains 4 joint sliders (one per chain joint) plus the 3 root sliders and the Reset pose button

#### Scenario: Reset pose clears all fields

- **GIVEN** `manualPose` has non-zero values in every field
- **WHEN** the user clicks **Reset pose**
- **THEN** `manualPose.rootX`, `rootZ`, `rootYawRad` are `0` and `jointAnglesRad` is `{}`

