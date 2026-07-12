## ADDED Requirements

### Requirement: Skeleton exports to a reduced-coordinate MuJoCo model

The system SHALL export the creature's `BodyGroup` skeleton to a MuJoCo MJCF model in reduced coordinates: a floating-base trunk chain with one hinge DOF per inter-segment joint about that joint's bend axis, and a two-hinge (lift + sweep) hip per leg with no intermediate carrier body. Segment geometry, mass, bend axes, and angle limits SHALL be derived from the same skeleton functions the in-app builder uses (`buildSkeletonTree`/`flattenSkeleton`/`effectiveAngleCaps`), so the model matches the rendered creature.

#### Scenario: Model mirrors the app skeleton

- **WHEN** the exporter runs on the creature groups fixture
- **THEN** the MJCF has one trunk body per usable segment, one hinge per spine joint with range equal to that joint's `[−capBackward, capForward]`, and two hinges per leg with ranges equal to `[−capSwing, capStance]`, and no carrier bodies

### Requirement: Every joint is a position servo

The model SHALL actuate every hinge with a position servo — a MuJoCo `position` actuator with a finite force limit equal to that joint's stall torque — applied identically to spine and leg joints. There SHALL be no spring or PD-muscle actuation.

#### Scenario: Servo holds under load

- **WHEN** a foot is held by a grip constraint and the CPG commands a spine target
- **THEN** the spine joint drives toward its target and transmits force to the body up to its force limit, rather than sagging like a spring

### Requirement: Grip is a switchable constraint driven by the CPG clock

Each foot SHALL be pinnable to a world anchor by an equality (`connect`) constraint that is enabled and disabled at runtime from the CPG girdle-phase grip clock (`gripShift`/`gripDuration`), leaving the foot free to rotate. When not gripping, the foot SHALL interact with a ground plane by contact.

#### Scenario: Grip toggles on the CPG clock

- **WHEN** `girdleClockPhase` enters a foot's grip window
- **THEN** that foot's `connect` constraint activates, pinning the foot to its current world point; when the window ends the constraint deactivates and the foot returns to plain ground contact

### Requirement: The oracle is driven by the real CPG

The validation runner SHALL drive the model using the project's existing `cpg.ts` functions unchanged (`buildCpgSpec`, `stepCpg`, `signedActivation`, `girdleClockPhase`), stepping at the same `1/120` s timestep, and mapping CPG output to servo targets and grip state the same way `useLocomotion` does. It SHALL NOT reimplement or modify CPG behavior.

#### Scenario: Same CPG, different physics

- **WHEN** the runner steps a given config
- **THEN** the CPG state evolves identically to the in-app CPG for that config, and only the physics engine differs

### Requirement: Recorded go/no-go verdict

The change SHALL produce a committed report comparing the oracle's forward travel, body tilt/roll, and body-wave coherence against the corresponding Rapier presets for the base-wave, base-walk, and sweep&grip configs, with an explicit conclusion on whether servo-actuated reduced-coordinate physics reproduces the paper's walk.

#### Scenario: Verdict is recorded either way

- **WHEN** the validation runs complete
- **THEN** `documentation/diagnostics/mujoco-validation.md` records the metrics, the captures, and an explicit go or no-go decision, including the servo gains and mass settings used when the decision is go
