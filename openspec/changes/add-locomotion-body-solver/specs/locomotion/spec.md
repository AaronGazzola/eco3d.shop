## ADDED Requirements

### Requirement: Planar body model derived from the rig

The system SHALL provide a pure function `buildBodySpec(groups)` (in `app/game/locomotion/body.ts`) that derives a planar multibody specification from the rig's body groups, reading rig data only and never mutating the rig, config, or any store.

The body spec SHALL contain one rigid **segment** per chained group in head → spine → tail order (the chain produced by `buildSkeletonTree` / `flattenSkeleton`), and SHALL NOT include leg groups as solver segments in this phase.

For each segment the spec SHALL define:
- a **length** derived from node spacing (the x-z distance between that segment's joint node and the next segment's joint node);
- a **mass** and a **planar rotational inertia** about the segment's joint axis, both approximated deterministically from that group's merged mesh geometry via a single global density constant, so heavier/longer parts of the model get proportionally more mass;
- a **1-DOF yaw joint about the Y axis** located at the group's `nodeBack`;
- **joint limits** taken from `effectiveAngleCaps(group)` — forward range `yaw` and backward range `yawBack` (falling back to `yaw` when `yawBack` is absent).

The only model-specific inputs SHALL be the number of segments, the node positions, the mesh geometry, and the angle caps. No per-model physical constant SHALL be hard-coded.

#### Scenario: Segment count and order follow the skeleton chain

- **WHEN** `buildBodySpec` is called with a rig of one head, K spine groups, and one tail
- **THEN** the spec contains K+2 segments in head → spines → tail order, with no leg groups among them

#### Scenario: Lengths come from node spacing

- **WHEN** two adjacent chained groups have joint nodes a known x-z distance apart
- **THEN** the corresponding segment length in the spec equals that distance (within floating-point tolerance), independent of the `y` component

#### Scenario: Joint limits come from the caps

- **WHEN** a spine group has `angleCaps.yaw = A` and `angleCaps.yawBack = B`
- **THEN** that segment's joint limits are forward A and backward B; and when `yawBack` is absent, the backward limit equals `yaw`

#### Scenario: Mass distribution tracks geometry

- **WHEN** one group's mesh occupies a larger x-z extent than another's
- **THEN** the larger group's segment has the greater mass in the spec, using the same global density constant for both

### Requirement: Passive planar reduced-order solver

The system SHALL provide a custom reduced-order integrator (in `app/game/locomotion/solver.ts`) over the generalized coordinates `q = [xᵣ, zᵣ, ψ, θ₁ … θₙ]` — root x-z position, root heading about Y, and one relative yaw per joint — with matching velocities.

Each step the solver SHALL build the configuration-dependent generalized mass matrix `M(q)`, include Coriolis/centrifugal terms, and solve `M q̈ = τ − C q̇` for the generalized accelerations. In this phase the generalized forces `τ` SHALL consist of **only** passive joint damping and joint-limit-stop reactions. The solver SHALL NOT apply muscle/actuation torques, hydrodynamic forces, contact forces, friction, or gravity.

The solver SHALL advance with a symplectic (semi-implicit) Euler scheme on a fixed internal sub-step decoupled from the render frame interval, so that behavior is frame-rate independent and stable.

The solver SHALL expose `initSolverState` (rest configuration: all `θ = 0`, root at origin, zero velocities), a `perturb` operation that injects an angular-velocity kick into the joint velocities, and diagnostics for total kinetic energy and center-of-mass position.

#### Scenario: Free chain conserves momentum

- **WHEN** the solver is initialized at rest, perturbed with a joint-velocity kick, and stepped for several seconds with no external forces
- **THEN** the center of mass stays fixed within a tight tolerance (internal effects produce no net translation), with the remaining segments counter-rotating to balance the kicked joint

#### Scenario: Damping dissipates energy to rest

- **WHEN** a perturbed free chain is stepped forward over time
- **THEN** total kinetic energy decreases monotonically toward zero and the chain settles to rest (no energy growth, no divergence)

#### Scenario: Limit stops keep joints within caps

- **WHEN** a joint is perturbed hard toward its cap
- **THEN** the joint angle is driven back inside its cap by the limit stop and does not blow through it

#### Scenario: Frame-rate independence

- **WHEN** the same perturbation is integrated under different render frame intervals (e.g. 30 fps vs 120 fps)
- **THEN** the resulting settled configuration and COM are equivalent within tolerance, because the integrator sub-steps to a fixed internal step

### Requirement: Solver output drives the rig with caps enforced

When the Simulate tab is running the simulation, the system SHALL write each frame, from the live solver state and without triggering React re-renders during the animation loop: each joint's integrated yaw to its existing pivot in `pivotsRef` (rotation about Y), and the body pose `(xᵣ, zᵣ, ψ)` to a dedicated scene root group (position `(xᵣ, 0, zᵣ)`, rotation `ψ` about Y) mounted around `AnimatedModel`.

Every joint angle written to a pivot SHALL be hard-clamped to that joint's cap, so the rendered rig can never exceed a cap regardless of any solver transient. The write path SHALL NOT modify `AnimatedModel`'s internal rendering or affect the home-page render path.

When the Simulate tab is not running the simulation, the rig SHALL render its rest pose (and the Calibrate tab SHALL behave exactly as before this change).

#### Scenario: Joints and body pose render from the solver

- **WHEN** the simulation is running with a perturbed chain
- **THEN** the rig's joint pivots reflect the solver's joint angles each frame and the model's root group reflects the integrated body pose

#### Scenario: Rendered angles never exceed caps

- **WHEN** the solver momentarily overshoots a cap during a stiff limit-stop transient
- **THEN** the angle written to the pivot is still clamped to the cap, so the visible rig stays within range

#### Scenario: Rest pose when not running

- **WHEN** the Simulate tab is open but the simulation is not running
- **THEN** the rig renders its rest pose, and switching to the Calibrate tab behaves identically to before this change

### Requirement: Minimal Simulate-tab verification controls

The Simulate tab SHALL replace its placeholder text with the minimal controls needed to drive and observe the verification gate: a **Run/pause** toggle, a **Reset to rest** action, a **Perturb** action (apply an angular-velocity kick), and a read-only **diagnostics** display showing at least total kinetic energy, center-of-mass displacement since reset, and the maximum absolute joint angle relative to its cap.

This control set SHALL be limited to verification scaffolding; the full Phase H control surface (drive, behaviors, environment) SHALL NOT be added in this phase. Simulation control state SHALL live in `animateStore` and SHALL NOT be persisted.

#### Scenario: Run, perturb, and observe

- **WHEN** the user opens the Simulate tab, presses Run, and presses Perturb
- **THEN** the rig begins moving from the kick, the diagnostics show kinetic energy rising then decaying toward zero, and the COM-displacement readout stays near zero

#### Scenario: Reset returns to rest

- **WHEN** the user presses Reset to rest after perturbing
- **THEN** the solver state returns to the rest configuration (all joints zero, root at origin, zero velocities) and the rig renders its rest pose

#### Scenario: Controls are verification-only

- **WHEN** the Simulate tab is inspected
- **THEN** it exposes only Run/pause, Reset, Perturb, and the diagnostics readout — no drive, behavior, environment, or attractor controls — and none of this state is written to persisted storage
