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

### Requirement: CPG axial double-chain network

The system SHALL provide a central pattern generator at `app/game/locomotion/cpg.ts` modelling the axial double chain from Knüsel et al. (2020) §2–§3. For a `BodySpec` with `N` axial chain segments it SHALL maintain `2N` oscillators — a left oscillator per segment (indices `0..N-1`) and a right oscillator per segment (indices `N..2N-1`) — each with a phase `θ` and amplitude `r`.

`stepCpg(state, spec, drive, excitability, dt)` SHALL integrate, per oscillator `i`, the phase equation `θ̇ᵢ = 2π·νᵢ + Σⱼ rⱼ·wᵢⱼ·sin(θⱼ − θᵢ − φᵢⱼ)` and the amplitude equation `ṙᵢ = a·(Rᵢ − rᵢ)` (the proprioceptive feedback term is omitted — `s=0`), with `νᵢ = drive·excitability·eᵢ`, `Rᵢ = drive·P(drive, d_thᵢ)`, and `P(d, d_th) = 1/(1 + e^(b·(d − d_th)))`. Constants: `a=5`, `b=500`, axial excitability `eᵢ=1.1`, axial saturation threshold `d_thᵢ=3`. Integration SHALL use a fixed 2 ms sub-step with frame `dt` clamped to 50 ms; phases SHALL be kept finite (wrapped mod 2π).

`oscillatorOutput(state, i)` SHALL return `rᵢ·(1 + cos θᵢ)` (one-sided, ≥ 0). `signedActivation(state, k)` SHALL return `oscillatorOutput(left k) − oscillatorOutput(right k)` for segment `k`.

#### Scenario: Oscillator count matches the axial chain

- **WHEN** `initCpgState(spec)` is called for a `BodySpec` with `N` axial segments
- **THEN** the state holds `2N` phases and `2N` amplitudes, all amplitudes starting at 0 (or a documented small seed)

#### Scenario: Output is one-sided and amplitude tracks drive

- **GIVEN** a CPG stepped with `drive=1.0`, `excitability=1.0`, below the axial saturation threshold
- **WHEN** it is stepped until amplitudes converge
- **THEN** each `oscillatorOutput` stays ≥ 0 and each amplitude `r` approaches `drive·P(drive,3) ≈ drive` (since `P≈1` for `drive ≪ 3`)

#### Scenario: Drive above the saturation threshold collapses amplitude

- **GIVEN** the CPG stepped with `drive` well above `d_th = 3`
- **WHEN** amplitudes converge
- **THEN** each target amplitude `R = drive·P(drive,3)` is driven toward 0 (the saturation sigmoid `P → 0`)

### Requirement: Length-weighted intersegmental phase bias

The intersegmental couplings SHALL use a length-weighted phase bias: for the head→tail coupling between adjacent segments `k` and `k+1` (same chain side), `φ = (lengthₖ / Σ lengths) · 2π · BODY_WAVES` with strength `w=5`; the tail→head coupling SHALL use `−φ` with strength `w=1`. The intrasegmental left↔right coupling SHALL use `w=10, φ=π` (antiphase). `BODY_WAVES` SHALL be a single named constant (default `1.58`).

When all segments are equal length, the per-interval bias SHALL reduce to a uniform value and the total head→tail lag SHALL equal `2π·BODY_WAVES` (matching the paper's uniform `±0.415` rad at `N=25`, `BODY_WAVES≈1.58`).

#### Scenario: Equal segments give uniform bias

- **GIVEN** a `BodySpec` whose axial segments are all equal length
- **WHEN** `buildCpgSpec` builds the couplings
- **THEN** every head→tail intersegmental bias is equal and their sum across the chain equals `2π·BODY_WAVES` within floating-point tolerance

#### Scenario: Unequal segments weight bias by length

- **GIVEN** a `BodySpec` where segment A is twice the length of segment B
- **WHEN** `buildCpgSpec` builds the couplings
- **THEN** the head→tail bias across segment A is twice that across segment B, and the total across the chain still equals `2π·BODY_WAVES`

### Requirement: CPG preview runs without driving the body

`animateStore` SHALL expose `cpgDrive` (default `1.0`), `cpgExcitability` (default `1.0`), `cpgRunning` (default `false`), and `cpgRecording` (default `false`) with setters. While `cpgRunning` is true and the active tab is Simulate (not calibrating), `useLocomotion` SHALL step the CPG each frame using `cpgDrive` and `cpgExcitability`. The CPG step SHALL NOT write to any body pivot or the root group — the rendered rig stays at its manual/rest pose throughout B1.

Switching the active tab to Calibrate SHALL set `cpgRunning` and `cpgRecording` to `false`.

#### Scenario: Running the CPG leaves the body at rest

- **GIVEN** the Simulate tab with a rig loaded and `cpgRunning` true
- **WHEN** several frames elapse
- **THEN** the CPG state advances (phases increase) but every chain pivot and the root group remain at their manual/rest transforms

### Requirement: CPG space-time capture

`diagnostics.ts` SHALL provide `buildCpgCaptureSpec(spec)` and `buildCpgSample(t, state, spec)`, and `serializeCapture` (or a CPG-specific serializer) SHALL emit a **space-time** section: one row per segment (head at top, tail at bottom), columns advancing in time, each cell a glyph chosen by the sign and magnitude of that segment's signed activation. The capture SHALL also include a per-segment phase snapshot (showing head→tail phase lag) and the measured fundamental frequency of segment 0 (from its signed-activation zero crossings).

While `cpgRecording` is true and the CPG is running, `useLocomotion` SHALL append a CPG sample at ~50 ms intervals. On the falling edge of `cpgRecording`, it SHALL serialize the buffer and POST it to `/api/diagnostics`, writing the returned path to `lastCapturePath`.

#### Scenario: A traveling wave reads as diagonal stripes

- **GIVEN** the CPG has been run and recorded for a few seconds at `drive=1.0`
- **WHEN** the capture is written and read
- **THEN** the space-time section shows bands of one sign progressing monotonically from the head row toward the tail row across columns (a head→tail traveling wave), and the per-segment phase snapshot shows lag increasing monotonically head→tail

#### Scenario: Measured frequency matches drive × excitability × e

- **GIVEN** a recorded CPG run at `drive=d`, `excitability=1.0`, axial `e=1.1`
- **THEN** the reported fundamental frequency is within tolerance of `ν = d·1.0·1.1` Hz

### Requirement: Simulate sidebar exposes CPG controls

The Simulate tab in `AnimateSidebar` SHALL render a **CPG (Phase B1)** section containing: a **drive** slider (range `0–2`, bound to `cpgDrive`), an **excitability** slider (range `0–2`, default `1.0`, bound to `cpgExcitability`), a **Run / Pause CPG** toggle bound to `cpgRunning`, and a **Record / Stop** toggle bound to `cpgRecording` with the last capture path shown beneath it. These controls are additive and SHALL NOT remove the existing A-phase solver controls.

#### Scenario: CPG controls are present and live

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user moves the drive slider and clicks Run CPG
- **THEN** `cpgDrive` updates and the CPG begins stepping (verifiable by a subsequent capture), with the solver controls still present
### Requirement: Ekeberg axial muscle torque

The system SHALL provide an Ekeberg virtual-muscle model at `app/game/locomotion/muscles.ts`. For an axial joint with physical angle `φ`, angular rate `φ̇`, and segment muscle activations `Mˡ`, `Mʳ`, the joint torque SHALL be:

`T = α·(Mˡ − Mʳ) − β·(Mˡ + Mʳ + γ)·φ − δ·φ̇`

with constants from reference Table 5 (simulation column): `α=0.4`, `β=1.2`, `γ=0.2`, `δ=0.1`. A per-segment activation delay of `DELAY_MS=10` SHALL sit between the supplied activation input and the `Mˡ/Mʳ` used in the torque (a ring buffer of recent inputs).

#### Scenario: Pure active term with zero joint angle

- **GIVEN** a joint at `φ=0`, `φ̇=0`, with `Mˡ=2`, `Mʳ=0` (after the delay)
- **THEN** the torque equals `α·(2−0) = 0.8` N·m (only the active term contributes; the stiffness term is zero at `φ=0`)

#### Scenario: Stiffness term restores toward zero

- **GIVEN** a joint at `φ>0` with both activations driven to 0 (`Mˡ=Mʳ=0`)
- **THEN** the torque is `−β·γ·φ − δ·φ̇` — a negative (restoring) torque proportional to the angle, i.e. a spring pulling the joint back toward 0

### Requirement: Solver accepts external joint torques

`stepSolver(state, spec, dt, jointTorques?)` SHALL accept an optional `jointTorques: number[]` (one entry per joint, ordered to match `spec.joints`). When provided, each `jointTorques[i]` SHALL be added to the generalized force at `spec.joints[i].coordIndex`, alongside the existing joint damping and penalty limit stops. When omitted (or all-zero), `stepSolver` SHALL behave identically to its Phase A4 form.

#### Scenario: Omitted torques reproduce A4 behaviour

- **GIVEN** a perturbed chain stepped with no `jointTorques` argument
- **THEN** it settles to rest exactly as in Phase A4 (damping + limit stops only)

#### Scenario: A constant torque holds a joint off-zero

- **GIVEN** a single joint fed a constant positive `jointTorques[i]` within its cap range, all activations such that the muscle stiffness is small
- **WHEN** the solver steps to equilibrium
- **THEN** that joint settles at a non-zero angle where the applied torque balances joint damping + any stiffness, rather than returning to 0

### Requirement: Muscle test mode drives the body from a test sinusoid

`animateStore` SHALL expose `muscleTestRunning` (default `false`), `muscleTestFreq` (default `0.8` Hz), `muscleTestAmplitude` (default `1.0`), and `muscleTestPhasePerSeg` (default `0`) with setters. The muscle module SHALL provide a test activation source producing, per segment `k`, an antiphase one-sided pair `Mˡ = amp·(1+cos(ωt − k·phasePerSeg))` and `Mʳ = amp·(1+cos(ωt − k·phasePerSeg + π))`, `ω = 2π·freq`.

When `muscleTestRunning` is true (Simulate tab, not calibrating, `bodySpec` present), `useLocomotion` SHALL seed solver state from the manual pose on the rising edge, then each frame compute the test activations → Ekeberg torques (per joint, using the current joint angle/rate) → `stepSolver(state, spec, dt, torques)`, and write the resulting joint angles and root pose to the rig. Joint caps SHALL remain enforced by the A4 penalty limit stops (no hard clamp).

Switching to Calibrate SHALL set `muscleTestRunning` to false.

#### Scenario: A driven joint oscillates and then springs back

- **GIVEN** the muscle test running with `amplitude=1.0`, `freq=0.8`, `phasePerSeg=0`
- **WHEN** the user watches one axial joint, then clicks Pause (activations → 0)
- **THEN** while running the joint traces a bounded oscillation, and after Pause the muscle stiffness + damping return it toward 0 and hold it there (the restoring force absent in A4)

#### Scenario: Capture records the driven motion

- **GIVEN** the muscle test running and a Record→Stop cycle
- **THEN** a capture is written whose per-joint angle rows show the sinusoidal drive bounded by the joint caps, and whose KE is non-zero while driven

### Requirement: Simulate sidebar exposes the muscle test

The Simulate tab in `AnimateSidebar` SHALL render a **Muscle test (Phase B2)** section: a **Run / Pause** toggle bound to `muscleTestRunning`, a **frequency** slider (bound to `muscleTestFreq`), an **amplitude** slider (bound to `muscleTestAmplitude`), and a **phase / segment** slider (bound to `muscleTestPhasePerSeg`). Recording reuses the existing Record/Stop control and capture path. These controls are additive to the A-phase solver controls and the B1 CPG controls.

#### Scenario: Muscle test controls are present

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user clicks Run on the Muscle test block
- **THEN** the body begins to flex under muscle torque, with the solver, CPG, and muscle-test controls all present
### Requirement: Coupled CPG → muscle → body drive

`useLocomotion` SHALL provide a coupled driving mode that, each frame while active (Simulate tab, not calibrating, `bodySpec` present): (1) steps the CPG via `stepCpg(cpgState, cpgSpec, drive, excitability, dt)`; (2) for each axial joint `i`, reads the mapped CPG segment `k`'s left/right oscillator outputs as muscle activations, passes them through the per-segment 10 ms activation delay, and computes the Ekeberg torque using the current solver joint angle and rate; (3) steps the body via `stepSolver(state, spec, dt, jointTorques)`; (4) writes the resulting joint angles and root pose to the rig. The CPG and body SHALL be separate integrators sharing the frame clock; the CPG SHALL NOT read body state.

A joint-to-CPG-segment map SHALL be built once per `bodySpec` and SHALL satisfy: the number of axial joints equals the number of CPG segments minus one (the head segment carries no parent joint). This relationship SHALL be asserted so an indexing mismatch fails loudly.

#### Scenario: Coupled run produces a travelling body undulation

- **GIVEN** a rig loaded, coupled mode active, `drive≈1.0`, `excitability=1.0`
- **WHEN** the pipeline runs for a few seconds
- **THEN** the body bends in a head→tail travelling wave (each joint's angle oscillates, with phase lag accumulating head→tail), and with no environment it undulates roughly in place (no sustained net translation)

#### Scenario: Body wave corresponds to the CPG wave

- **WHEN** a coupled run is captured
- **THEN** the per-joint body-angle progression matches the CPG signed-activation progression head→tail (same direction of travel), with the body lagging the command by the muscle/body response

#### Scenario: Joint/segment count mismatch fails loudly

- **GIVEN** a `bodySpec` whose axial joint count does not equal CPG segment count − 1
- **THEN** building the coupled map throws (or `console.error`s and refuses to drive) rather than silently mis-indexing

### Requirement: Single active simulation mode

The animate store SHALL ensure at most one body-driving simulation mode is active at a time among: passive (A-phase Run), muscle test (B2), and coupled CPG drive (B3); plus the no-body CPG preview (B1). Enabling the coupled run SHALL disable the muscle test and the passive run. Switching to Calibrate SHALL disable all of them.

#### Scenario: Enabling coupled run disables the muscle test

- **GIVEN** the B2 muscle test is running
- **WHEN** the user starts the B3 coupled CPG drive
- **THEN** the muscle test stops and only the coupled pipeline drives the body

### Requirement: Combined body + CPG capture for a coupled run

A capture taken during a coupled run SHALL contain both the body section (per-joint angle rows, KE, COM drift, `maxJointFracOfCap`, node polyline, ASCII top-down) and the CPG space-time section (segment × time signed activation), so the commanded wave and the resulting body shape can be read side by side.

#### Scenario: Coupled capture shows both sections

- **WHEN** a coupled run is recorded and stopped
- **THEN** the written capture file contains both the body scalars/joints/shape sections and the CPG space-time section for the same run

### Requirement: Simulate sidebar exposes the coupled CPG drive

The Simulate tab SHALL render a **CPG drive (Phase B3)** control: a Run/Pause toggle for the coupled pipeline, reusing the B1 `drive` and `excitability` sliders and the existing Record/Stop + capture path. It SHALL be visually distinct from, and mutually exclusive with, the passive run, the B1 CPG preview, and the B2 muscle test.

#### Scenario: Coupled run control is present and exclusive

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user clicks Run on the CPG drive (Phase B3) control
- **THEN** the body undulates under CPG drive and the other driving modes are not simultaneously active
