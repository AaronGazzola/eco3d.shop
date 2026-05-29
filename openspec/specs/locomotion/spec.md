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

### Requirement: Zero-force planar multibody solver

The system SHALL provide a planar multibody integrator at `app/game/locomotion/solver.ts` exposing `initSolverState(spec): SolverState`, `stepSolver(state, spec, dt): void`, `seedRootVelocity(state, vx, vz): void`, `perturbJointRates(state, spec, magnitude): void`, `centerOfMass(state, spec)`, `kineticEnergy(state, spec)`, `nodePositions(state, spec)`, and `diagnostics(state, spec, baseCom)`.

`SolverState` (defined in `types.ts`) SHALL carry generalized coordinates and rates: `rootX`, `rootZ`, `rootHeadingY`, `rootVelX`, `rootVelZ`, `rootHeadingRateY`, `jointAngles: number[]` (one per joint), and `jointRates: number[]` (matching length).

`stepSolver` SHALL build the full coupled mass matrix from per-segment translational and rotational Jacobians, compute Coriolis/centrifugal bias via finite-difference derivatives of the mass matrix, solve `M · qdd = τ − c` for accelerations, and integrate via semi-implicit Euler at a fixed sub-step of 2 ms. Frame timesteps larger than 50 ms SHALL be clamped to 50 ms before sub-stepping.

The generalized-force term `τ` SHALL include, per joint coordinate: (a) viscous joint damping `−JOINT_DAMPING · jointRate`; and (b) a one-sided penalty limit stop — when the joint angle exceeds `yawForwardLimit`, `τ −= LIMIT_STOP_STIFFNESS · (angle − yawForwardLimit) + LIMIT_STOP_DAMPING · jointRate`; when it falls below `−yawBackwardLimit`, the mirror term applies. `JOINT_DAMPING`, `LIMIT_STOP_STIFFNESS`, and `LIMIT_STOP_DAMPING` SHALL be non-zero constants. `τ` SHALL contain no actuation or environment forces in this change.

#### Scenario: Solver state initializes to rest at the spec's rest configuration

- **GIVEN** a non-null `BodySpec` produced by `buildBodySpec`
- **WHEN** `initSolverState(spec)` is called
- **THEN** the returned state has `rootX === 0`, `rootZ === 0`, `rootHeadingY === 0`, all rates zero, all `jointAngles` zero, and `jointAngles.length === spec.joints.length`

#### Scenario: Stepping at rest within caps is a no-op

- **GIVEN** a `SolverState` whose rates and joint angles are all zero (rest, inside all caps)
- **WHEN** `stepSolver(state, spec, dt)` is called for `dt === 0.016`
- **THEN** the state's positions and rates remain (to within floating-point round-off) at zero — joint damping and limit stops produce no force at rest inside caps

#### Scenario: A joint posed beyond its cap is pushed back inside

- **GIVEN** a `SolverState` with one `jointAngles[i]` set well beyond that joint's `yawForwardLimit` and all rates zero
- **WHEN** `stepSolver` is run repeatedly until kinetic energy returns below a small threshold
- **THEN** that joint's final angle is `≤ yawForwardLimit + epsilon` (the penalty stop has pulled it back inside the cap) and all rates have decayed toward zero

#### Scenario: An excited chain settles to rest

- **GIVEN** a `SolverState` at rest, then `perturbJointRates(state, spec, 1.5)` applied
- **WHEN** `stepSolver` is run for several seconds of simulated time
- **THEN** `kineticEnergy(state, spec)` decays monotonically (apart from brief limit-stop transients) toward ≈ 0, and every joint angle ends within `[−yawBackwardLimit, +yawForwardLimit]` to within epsilon

### Requirement: Animate store carries simulation and recording state

The `animateStore` SHALL expose:

- `simRunning: boolean` — default `false`
- `simResetSignal: number` — default `0`, incremented by `requestSimReset`
- `simKickSignal: number` — default `0`, incremented by `requestSimKick`
- `simDiagnostics: { kineticEnergy: number; comDriftFromStart: number; comX: number; comZ: number }` — default all zeros
- `simRecording: boolean` — default `false`
- `lastCapturePath: string | null` — default `null`

with setters `setSimRunning(running)`, `requestSimReset()`, `requestSimKick()`, `setSimDiagnostics(d)`, `setSimRecording(recording)`, and `setLastCapturePath(path)`.

Switching the active tab to `'calibrate'` SHALL set `simRunning` to `false` and `simRecording` to `false` in the same transition.

Calling `setSimRecording(true)` SHALL also clear `lastCapturePath` to `null` so the previously written path is not mistaken for the new recording.

#### Scenario: Recording start clears the last capture path

- **GIVEN** `lastCapturePath === 'documentation/diagnostics/capture-2026-05-28T12-00-00-000Z.md'`
- **WHEN** `setSimRecording(true)` is called
- **THEN** `simRecording` is `true` and `lastCapturePath` is `null`

#### Scenario: Switching to Calibrate stops the sim and any recording

- **GIVEN** `animateTab === 'simulate'`, `simRunning === true`, `simRecording === true`
- **WHEN** `setAnimateTab('calibrate')` is called
- **THEN** `animateTab === 'calibrate'`, `simRunning === false`, and `simRecording === false`

### Requirement: useLocomotion drives the rendered scene from solver state while running

When `simRunning` is `true` and a non-null `BodySpec` resolves from the current rig, `useLocomotion` SHALL each frame:

1. Step the solver via `stepSolver(state, spec, dt)`.
2. Write `state.rootX` to the bound root group's `position.x`, `state.rootZ` to `position.z`, and `setFromAxisAngle(Y_AXIS, state.rootHeadingY)` to the root group's `quaternion`.
3. Write each chain joint's pivot quaternion as `setFromAxisAngle(Y_AXIS, state.jointAngles[i])` — *unclamped*, because A3 has no caps (the visual gate observes whether the solver naturally stays in its rest configuration with zero forces).
4. Hold the head pivot's quaternion at the identity.
5. Reset every leg's local `quaternion` to identity and `position` to `(0, 0, 0)`, the same A2 rule.

When `simRunning` is `false`, the A2 manual-pose path SHALL render the scene unchanged (sliders drive root + chain pivots, identity for the head, identity for legs).

#### Scenario: Rising edge of simRunning initializes solver state from manualPose

- **GIVEN** `simRunning === false`, `manualPose.rootX === 1.0`, `manualPose.rootYawRad === 0.5`, `manualPose.jointAnglesRad['spine1-id'] === 0.3`
- **WHEN** `setSimRunning(true)` is called and one frame is rendered
- **THEN** the solver state was initialized with `rootX === 1.0`, `rootHeadingY === 0.5`, and the joint angle for `spine1-id` set to `0.3` before the first `stepSolver` call; all rates start at zero

#### Scenario: Falling edge of simRunning returns rendering to manual pose

- **GIVEN** the solver is running with `state.rootX === 3.5` while `manualPose.rootX === 0`
- **WHEN** `setSimRunning(false)` is called and one frame is rendered
- **THEN** the bound root group's `position.x` is `0` (back to the manual-pose path), not `3.5`

### Requirement: Kick translation seeds a fixed root velocity

When `simKickSignal` changes value (increment), `useLocomotion` SHALL call `seedRootVelocity(state, KICK_ROOT_VELOCITY, 0)` exactly once on the current solver state, where `KICK_ROOT_VELOCITY` is a documented constant (default `0.5` world units per second). No other state field SHALL change.

Each click of the Kick translation button in the Simulate sidebar SHALL increment `simKickSignal` by one and therefore seed the velocity once. Clicking it twice in succession SHALL therefore double the seeded velocity.

#### Scenario: One kick seeds rootVelX and leaves everything else unchanged

- **GIVEN** a solver state with all coordinates and rates at zero, and a chain with one joint
- **WHEN** the user clicks Kick translation once
- **THEN** `state.rootVelX === 0.5`, `state.rootVelZ === 0`, `state.rootHeadingRateY === 0`, every joint rate is `0`, every joint angle is `0`, and `state.rootX/Z` are unchanged at `0`

#### Scenario: Two kicks double the seeded velocity

- **GIVEN** a solver state freshly initialized with all zeros
- **WHEN** the user clicks Kick translation twice in succession (before the first frame steps)
- **THEN** `state.rootVelX === 1.0`

### Requirement: Free body drifts in a straight line

When the solver is running, has been kicked exactly once with `KICK_ROOT_VELOCITY = 0.5`, and has all joint angles and joint rates at zero, the body SHALL drift along world `+x` at a constant rate.

After one simulated second of running, `state.rootX` SHALL be `0.5 ± 1e-3`, `state.rootZ` SHALL be `0 ± 1e-3`, `state.rootHeadingY` SHALL be `0 ± 1e-3`, every joint angle SHALL remain `0 ± 1e-3`, and `kineticEnergy(state, spec)` SHALL equal its value immediately after the kick to within `1e-3` of relative error.

This is the A3 visual gate.

#### Scenario: One-second straight-line drift

- **GIVEN** the rig is loaded, `simRunning === true` from rest, and Kick translation has been clicked once
- **WHEN** approximately 1 second of frames elapses (assumed steady ~60 Hz)
- **THEN** the rendered root group's `position.x` is approximately `0.5`, `position.z` is approximately `0`, the body's orientation is unchanged, and the chain has not bent

### Requirement: Solver diagnostics push to the store every 100 ms

While the solver is running, `useLocomotion` SHALL accumulate frame `dt` into a diagnostics timer; whenever the accumulator passes `0.1` seconds it SHALL invoke `setSimDiagnostics({ kineticEnergy, comX, comZ, comDriftFromStart, maxJointFracOfCap })` with values derived from the current solver state and the COM at the most recent solver-start moment, then subtract `0.1` from the accumulator.

`maxJointFracOfCap` SHALL be the maximum over all joints of `|jointAngle| / cap`, where `cap` is `yawForwardLimit` for non-negative angles and `yawBackwardLimit` for negative angles.

When `simRunning` becomes `false`, the diagnostics push SHALL stop until the solver runs again, but the last-pushed values SHALL remain in the store.

#### Scenario: Cap fraction reflects an over-cap transient then settles

- **GIVEN** the solver is running and the body has been perturbed
- **WHEN** the chain swings such that a joint momentarily exceeds its cap, then settles
- **THEN** `simDiagnostics.maxJointFracOfCap` rises above `1.0` during the transient and returns to `≤ 1.0` once the body comes to rest

### Requirement: Record/Stop captures a solver run

The Simulate sidebar SHALL expose a **Record / Stop** toggle. When `simRecording` is `true` and the solver is running, `useLocomotion` SHALL append a `CaptureSample` (built by `buildSample(t, state, spec, baseCom)`) to an in-memory buffer at a target rate of one sample per 50 ms of solver time, where `baseCom` is captured at the moment `simRecording` rose to `true` and `t` is solver time elapsed since that moment.

On the falling edge of `simRecording`, `useLocomotion` SHALL invoke `serializeCapture(buildCaptureSpec(spec), subsampleSamples(buffer, 160))`, POST the resulting markdown to `/api/diagnostics`, and on a successful response set `lastCapturePath` to the returned path. On any non-2xx response or thrown error, `useLocomotion` SHALL log the error via `console.error` and set `lastCapturePath` to `'failed — see console'`.

Recording while the solver is paused SHALL not push samples but SHALL NOT clear the buffer; resuming the solver continues the same recording with `t` continuing from where it left off in solver-time.

#### Scenario: A complete capture writes a markdown file

- **GIVEN** `simRunning === true`, a kick has fired, the user clicks Record, runs for 2 seconds of solver time, then clicks Stop
- **WHEN** the POST to `/api/diagnostics` returns `200` with `{ path: 'documentation/diagnostics/capture-X.md' }`
- **THEN** `lastCapturePath === 'documentation/diagnostics/capture-X.md'` and the file exists with at least one `## scalars` row whose `rootX` is close to `1.0`

### Requirement: Simulate sidebar exposes solver controls

The Simulate tab in `AnimateSidebar` SHALL render, above the existing manual-pose sliders and Reset pose button:

- a **Run / Pause** toggle button bound to `simRunning`,
- a **Reset** button bound to `requestSimReset`,
- a **Kick translation** button bound to `requestSimKick`,
- a **Kick joints** button bound to `requestSimPerturb`,
- a **Record / Stop** toggle button bound to `simRecording` with the path of the last successful capture displayed beneath it when set,
- a diagnostics readout panel showing `simDiagnostics.kineticEnergy` (exponential, 2 sig figs), `simDiagnostics.comDriftFromStart` (exponential, 2 sig figs), and `simDiagnostics.maxJointFracOfCap` (percentage, 0 decimals).

While `simRunning` is `true`, the manual pose sliders SHALL be visibly disabled (reduced opacity and `pointer-events: none`) so the user cannot edit fields the solver is currently overwriting; the **Reset pose** button SHALL also be disabled. The solver-control buttons remain enabled.

#### Scenario: Kick joints button is present and excites the chain

- **GIVEN** the Simulate tab is open, a rig loaded, and the solver running
- **WHEN** the user clicks **Kick joints**
- **THEN** the chain visibly whips and then settles, and the `Max joint / cap` readout rises during the transient before returning toward or below 100%

#### Scenario: Pose sliders disable while running

- **GIVEN** the Simulate tab is open with a rig loaded
- **WHEN** the user clicks Run
- **THEN** the manual pose sliders and the Reset pose button visibly dim and stop accepting input; Run / Pause, Reset, Kick translation, Kick joints, and Record / Stop remain active

### Requirement: Kick joints perturbs the chain without injecting net momentum

When `simPerturbSignal` changes value (increment), `useLocomotion` SHALL call `perturbJointRates(state, spec, PERTURB_MAGNITUDE)` exactly once on the current solver state, where `PERTURB_MAGNITUDE` is a documented constant (default `1.5` rad/s). `perturbJointRates` SHALL seed alternating joint rates (`+magnitude`, `−magnitude`, …) and set the root rates so that the body's net linear and angular momentum remain zero — the chain whips internally but its center of mass does not translate.

Each click of the **Kick joints** button in the Simulate sidebar SHALL increment `simPerturbSignal` by one.

#### Scenario: Joint kick leaves COM stationary

- **GIVEN** a solver state at rest with COM at `C`
- **WHEN** `perturbJointRates(state, spec, 1.5)` is applied and the solver steps forward
- **THEN** the joints acquire non-zero rates, but the COM does not drift away from `C` beyond a small numerical tolerance over the settling window (no net momentum injected)

