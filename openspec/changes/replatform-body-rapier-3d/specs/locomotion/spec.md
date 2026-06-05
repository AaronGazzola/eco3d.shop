## MODIFIED Requirements

### Requirement: Body spec is derived from the rig

The system SHALL build the locomotion body as a **3D chain of Rapier rigid bodies** from the node skeleton, using the nodes' full `x/y/z` (the authored 3D rest pose). A builder (`body3d.ts`) SHALL walk the axial chain `flattenSkeleton(buildSkeletonTree(groups))` (head → spine → tail; legs excluded) and produce:

- One **dynamic rigid body** per axial segment, placed at the segment's rest world transform (position from the node skeleton; orientation aligning the segment's local long axis toward the next node).
- A **capsule collider** per body, half-length from node spacing and radius from `STD_SEGMENT_WIDTH`. The collider's **mass SHALL be set to the group's `nodeWeight`** (default `DEFAULT_AXIAL_WEIGHT` for head/spine/tail) — never derived from mesh geometry. The engine SHALL derive the rotational inertia tensor from the capsule shape + that mass.
- For each non-head segment, a **revolute joint** to its parent, anchored at the shared node (`parent.nodeBack`), with axis = the segment's local up (yaw undulation) and angle **limits** `[−yawBackwardLimit, +yawForwardLimit]` from `effectiveAngleCaps`.
- The head segment is the free **root** body (no joint above it).

The mesh SHALL NOT feed any dynamics quantity (mass, inertia, collider size all come from `nodeWeight` + node geometry + `STD_SEGMENT_WIDTH`).

#### Scenario: One rigid body per axial segment, mass from nodeWeight

- **WHEN** the body is built for a rig whose chain is head → spine1 → spine2 → tail with no authored `nodeWeight`
- **THEN** four dynamic rigid bodies exist in head→tail order, each with mass `DEFAULT_AXIAL_WEIGHT`, and three revolute joints connect them

#### Scenario: Joint limits come from angle caps

- **WHEN** the body is built for a rig whose `spine1.angleCaps.yaw` is `0.5 rad`
- **THEN** the revolute joint feeding `spine1` has a yaw limit of `±0.5 rad` (the engine stops it at the cap)

#### Scenario: Mesh size does not affect the body

- **GIVEN** two rigs identical except one segment's mesh is scaled 2× larger
- **THEN** that segment's rigid-body mass, collider size, and inertia are identical between the two rigs

### Requirement: Anisotropic resistive-force environment

The system SHALL provide a 3D anisotropic resistive drag (`environment.ts`) applied as **external forces on the Rapier bodies**. For each axial body with world COM velocity `v`, segment long-axis unit `t̂` (from the body's orientation), length `L`, and angular velocity `ω`:

```
v_∥ = (v · t̂) · t̂          (along-body)
v_⊥ = v − v_∥              (perpendicular plane — a 3-vector)
F   = −L · (C_n · v_⊥ + C_t · v_∥)
τ   = −L · C_ω · ω
```

`F` SHALL be added at the body COM and `τ` as an external torque, each step before `world.step()`. Constants `C_n`/`C_t`/`C_ω` (`DRAG_NORMAL/TANGENT/ANGULAR`) are documented and re-confirmed at the 3D gate; the anisotropy ratio `C_n / C_t` SHALL be preserved at ≥ ~10:1. The drag is purely velocity-dependent (zero at rest) and dissipative.

#### Scenario: Stationary body has zero drag

- **GIVEN** all bodies at rest
- **THEN** the drag contributes zero force and zero torque

#### Scenario: Sideways drag exceeds along-axis drag

- **GIVEN** a body moving at unit speed perpendicular to its long axis vs along it
- **THEN** the perpendicular drag force magnitude is `C_n / C_t` (≥ ~10) times the along-axis magnitude

### Requirement: Emergent forward translation under coupled drive

When the coupled drive runs in the 3D Rapier world with the drag environment on (default `cpgDrive = 2.0`, `cpgExcitability = 0.09`, gain 12, gravity off), the body SHALL translate **head-first**. The CPG → Ekeberg torque pipeline (with the non-reversed `jointToCpgSegment = segmentIndex` mapping) drives the revolute joints into a head→tail travelling wave; the 3D drag converts it to a head-leading push. Over a recording of at least 3 seconds, the body's center-of-mass displacement projected on the snout (head-forward) axis SHALL be positive and grow monotonically. Absolute speed is a deferred tuning concern (AZ-33); direction + monotonicity are the gate, reproducing the planar swimming result in 3D.

#### Scenario: 3D coupled drive swims forward, head-first

- **GIVEN** the 3D body with coupled drive running and drag on
- **WHEN** the user records ≥ 3 seconds
- **THEN** the snout-projected COM motion increases monotonically (head leading, not tail-first)

#### Scenario: Drag off → no net translation

- **GIVEN** the 3D coupled drive with drag off
- **THEN** the body undulates without net forward COM translation (internal torques alone cannot translate the COM)

## ADDED Requirements

### Requirement: Deterministic fixed-step physics world

The system SHALL run one `RAPIER.World` with `gravity = (0, 0, 0)` (neutral-buoyancy water) at a **fixed timestep**, stepped a whole number of fixed substeps per frame with accumulated `dt` clamped, so that a given run reproduces its diagnostic capture on the same machine/build. `RAPIER.init()` SHALL complete before the world is built; the frame loop SHALL no-op until the world and rig are ready. No nondeterministic inputs (`Math.random`, wall-clock time) SHALL enter the step loop.

#### Scenario: World steps at a fixed timestep

- **GIVEN** a built 3D body
- **WHEN** the simulation runs for frames of varying real `dt`
- **THEN** the world advances in fixed-size substeps (frame-rate-independent), and two identical runs produce matching captures on the same machine

#### Scenario: Loop is inert until ready

- **GIVEN** `RAPIER.init()` has not resolved or no rig is loaded
- **THEN** the frame loop performs no stepping and does not throw

### Requirement: Controller torque drives the engine revolute joints

Each step, for each axial joint the system SHALL read the joint angle `φᵢ` and rate `φ̇ᵢ` from the engine, run the unchanged `stepCpg → oscillatorOutput·CPG_TO_MUSCLE_GAIN → 10 ms delay → ekebergTorque(mL, mR, φᵢ, φ̇ᵢ)` pipeline, and apply the resulting torque `τᵢ` as an **internal joint torque** (`+τᵢ·axis` to the child body, `−τᵢ·axis` to the parent). Because the torque is internal (equal and opposite), it SHALL NOT translate the body's center of mass on its own. The render path SHALL be driven from engine transforms: root frame from the head body's world pose, each chain pivot's local yaw from its revolute joint angle.

#### Scenario: Internal torque cannot move the COM

- **GIVEN** the coupled torque applied with drag off
- **THEN** the body's center of mass does not translate (only its shape changes)

#### Scenario: Render follows the engine

- **WHEN** the engine advances the body
- **THEN** the rig's root frame and per-joint pivot yaws are written from the corresponding Rapier body/joint transforms each frame

## REMOVED Requirements

### Requirement: Zero-force planar multibody solver

**Reason**: The custom planar reduced-order solver (`solver.ts`) is retired; the body now runs in the Rapier 3D engine (Decision 8).
**Migration**: Body dynamics are provided by `body3d.ts` + the Rapier world; see "Body spec is derived from the rig" and "Deterministic fixed-step physics world".

### Requirement: Solver accepts external joint torques

**Reason**: `stepSolver`'s `jointTorques` parameter is gone with the planar solver.
**Migration**: Joint torques are applied directly to Rapier revolute joints; see "Controller torque drives the engine revolute joints".

### Requirement: Solver accepts an environment-enabled flag

**Reason**: `stepSolver`'s `environmentEnabled` parameter is gone with the planar solver.
**Migration**: The drag is a per-step external force on the Rapier bodies, toggled by the existing `environmentEnabled` store flag; see "Anisotropic resistive-force environment".

### Requirement: Free body drifts in a straight line

**Reason**: This was a planar zero-force-solver gate (A3); the engine replaces that integrator.
**Migration**: Free-body behavior is now the engine's responsibility; the relevant gate is 3D emergent swimming.

### Requirement: Kick translation seeds a fixed root velocity

**Reason**: Planar A3 debug affordance tied to the removed solver state.
**Migration**: Dropped; not needed for the 3D swimming gate. Re-add as a Rapier impulse later if a debug kick is wanted.

### Requirement: Kick joints perturbs the chain without injecting net momentum

**Reason**: Planar A4 debug affordance (`perturbJointRates`) tied to the removed solver state.
**Migration**: Dropped; re-add as Rapier angular impulses later if needed.
