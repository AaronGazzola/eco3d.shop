## ADDED Requirements

### Requirement: Zero-force planar multibody solver

The system SHALL provide a planar multibody integrator at `app/game/locomotion/solver.ts` exposing `initSolverState(spec): SolverState`, `stepSolver(state, spec, dt): void`, `seedRootVelocity(state, vx, vz): void`, `centerOfMass(state, spec)`, `kineticEnergy(state, spec)`, `nodePositions(state, spec)`, and `diagnostics(state, spec, baseCom)`.

`SolverState` (defined in `types.ts`) SHALL carry generalized coordinates and rates: `rootX`, `rootZ`, `rootHeadingY`, `rootVelX`, `rootVelZ`, `rootHeadingRateY`, `jointAngles: number[]` (one per joint), and `jointRates: number[]` (matching length).

`stepSolver` SHALL build the full coupled mass matrix from per-segment translational and rotational Jacobians, compute Coriolis/centrifugal bias via finite-difference derivatives of the mass matrix, solve `M · qdd = τ − c` for accelerations, and integrate via semi-implicit Euler at a fixed sub-step of 2 ms. Frame timesteps larger than 50 ms SHALL be clamped to 50 ms before sub-stepping.

In this change, the generalized-force term `τ` SHALL be the zero vector — no joint damping, no penalty limit stops, no actuation. The constants `JOINT_DAMPING`, `LIMIT_STOP_STIFFNESS`, and `LIMIT_STOP_DAMPING` SHALL be declared and exported as zero. (A4 will overwrite their values; the names exist now so importers compile across the boundary.)

#### Scenario: Solver state initializes to rest at the spec's rest configuration

- **GIVEN** a non-null `BodySpec` produced by `buildBodySpec`
- **WHEN** `initSolverState(spec)` is called
- **THEN** the returned state has `rootX === 0`, `rootZ === 0`, `rootHeadingY === 0`, all rates zero, all `jointAngles` zero, and `jointAngles.length === spec.joints.length`

#### Scenario: Stepping with zero rates and zero forces is a no-op

- **GIVEN** a `SolverState` whose rates and joint angles are all zero
- **WHEN** `stepSolver(state, spec, dt)` is called for `dt === 0.016`
- **THEN** the state's positions and rates remain (to within floating-point round-off) at zero

#### Scenario: A non-zero root velocity advances rootX linearly with zero joint motion

- **GIVEN** a `SolverState` with `rootVelX === 1`, `rootVelZ === 0`, `rootHeadingRateY === 0`, all joint rates zero, all joint angles zero
- **WHEN** `stepSolver(state, spec, dt)` is called repeatedly so total simulated time reaches `1.0` second
- **THEN** `state.rootX` is `1.0 ± 1e-6`, `state.rootZ` is `0 ± 1e-6`, `state.rootHeadingY` is `0 ± 1e-6`, every `jointAngles[i]` is `0 ± 1e-6`, and every joint and root rate is unchanged from its starting value

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

While the solver is running, `useLocomotion` SHALL accumulate frame `dt` into a diagnostics timer; whenever the accumulator passes `0.1` seconds it SHALL invoke `setSimDiagnostics({ kineticEnergy, comX, comZ, comDriftFromStart })` with values derived from the current solver state and the COM at the most recent solver-start moment, then subtract `0.1` from the accumulator.

When `simRunning` becomes `false`, the diagnostics push SHALL stop until the solver runs again, but the last-pushed values SHALL remain in the store.

#### Scenario: Diagnostics reflect the drift

- **GIVEN** the solver is running, kicked once, after 1 second of simulated time
- **WHEN** the next diagnostics push fires
- **THEN** `simDiagnostics.comDriftFromStart` is `≥ 0.49 && ≤ 0.51`, `simDiagnostics.kineticEnergy` equals (within `1e-3` relative) the kinetic energy at the moment after the kick, and `simDiagnostics.comX` is approximately `0.5` plus the rest-pose COM X.

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
- a **Record / Stop** toggle button bound to `simRecording` with the path of the last successful capture displayed beneath it when set,
- a diagnostics readout panel showing `simDiagnostics.kineticEnergy` (exponential notation, 2 sig figs) and `simDiagnostics.comDriftFromStart` (exponential notation, 2 sig figs).

While `simRunning` is `true`, the manual pose sliders SHALL be visibly disabled (reduced opacity and `pointer-events: none`) so the user cannot edit fields the solver is currently overwriting; the **Reset pose** button SHALL also be disabled. The solver-control buttons remain enabled.

#### Scenario: Pose sliders disable while running

- **GIVEN** the Simulate tab is open with a rig loaded
- **WHEN** the user clicks Run
- **THEN** the manual pose sliders and the Reset pose button visibly dim and stop accepting input; Run / Pause, Reset, Kick translation, and Record / Stop remain active

#### Scenario: Sidebar shows the last capture path

- **GIVEN** the user has completed one Record → Stop cycle that succeeded
- **WHEN** the cycle completes
- **THEN** the path returned by `/api/diagnostics` appears beneath the Record button in monospaced text
