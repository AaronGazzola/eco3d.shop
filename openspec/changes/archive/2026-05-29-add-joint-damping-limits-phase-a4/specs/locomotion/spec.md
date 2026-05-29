## MODIFIED Requirements

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

### Requirement: Solver diagnostics push to the store every 100 ms

While the solver is running, `useLocomotion` SHALL accumulate frame `dt` into a diagnostics timer; whenever the accumulator passes `0.1` seconds it SHALL invoke `setSimDiagnostics({ kineticEnergy, comX, comZ, comDriftFromStart, maxJointFracOfCap })` with values derived from the current solver state and the COM at the most recent solver-start moment, then subtract `0.1` from the accumulator.

`maxJointFracOfCap` SHALL be the maximum over all joints of `|jointAngle| / cap`, where `cap` is `yawForwardLimit` for non-negative angles and `yawBackwardLimit` for negative angles.

When `simRunning` becomes `false`, the diagnostics push SHALL stop until the solver runs again, but the last-pushed values SHALL remain in the store.

#### Scenario: Cap fraction reflects an over-cap transient then settles

- **GIVEN** the solver is running and the body has been perturbed
- **WHEN** the chain swings such that a joint momentarily exceeds its cap, then settles
- **THEN** `simDiagnostics.maxJointFracOfCap` rises above `1.0` during the transient and returns to `≤ 1.0` once the body comes to rest

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

## ADDED Requirements

### Requirement: Kick joints perturbs the chain without injecting net momentum

When `simPerturbSignal` changes value (increment), `useLocomotion` SHALL call `perturbJointRates(state, spec, PERTURB_MAGNITUDE)` exactly once on the current solver state, where `PERTURB_MAGNITUDE` is a documented constant (default `1.5` rad/s). `perturbJointRates` SHALL seed alternating joint rates (`+magnitude`, `−magnitude`, …) and set the root rates so that the body's net linear and angular momentum remain zero — the chain whips internally but its center of mass does not translate.

Each click of the **Kick joints** button in the Simulate sidebar SHALL increment `simPerturbSignal` by one.

#### Scenario: Joint kick leaves COM stationary

- **GIVEN** a solver state at rest with COM at `C`
- **WHEN** `perturbJointRates(state, spec, 1.5)` is applied and the solver steps forward
- **THEN** the joints acquire non-zero rates, but the COM does not drift away from `C` beyond a small numerical tolerance over the settling window (no net momentum injected)
