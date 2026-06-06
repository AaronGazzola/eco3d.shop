# Locomotion — Phase D walking (delta)

## ADDED Requirements

### Requirement: Limb CPG oscillators and interlimb couplings

The CPG SHALL include four limb oscillators (one per leg) coupled by the reference's Table 2 interlimb
weights and phase biases, and to the axial chain, so that a diagonal-trot gait emerges rather than
being hand-prescribed.

#### Scenario: Diagonal trot emerges from couplings

- **WHEN** the limb oscillators run with rostrocaudal `w=3`, caudorostral `w=30`, lateral `w=10`
  (all `φ=π`), limb→axial `w=30, φ=4`, and axial→limb `w=2.5, φ=−4`
- **THEN** the four limbs settle into a diagonal-trot phase relationship (diagonal pairs in phase,
  opposite diagonals antiphase) without per-limb phase being set by hand

#### Scenario: Trunk wave locks to the legs

- **WHEN** the limb↔axial couplings are active
- **THEN** the axial standing/short body wave is phase-locked to the limb cycle

### Requirement: Limb transfer function (position control)

Each limb oscillator's phase SHALL be mapped directly, via a piecewise-linear transfer function at a
stance duty factor approximating the reference (≈77% stance), to a desired 1-DOF hip position — NOT
through the Ekeberg muscle. The hip SHALL be driven toward that target position via the joint's motor.

#### Scenario: Stance vs swing sweep

- **WHEN** a limb oscillator advances through its cycle
- **THEN** the leg sweeps backward slowly during the stance fraction (≈ duty factor) and forward
  quickly during swing, the hip tracking the transfer-function target position

#### Scenario: Position-driven, not muscle-driven

- **WHEN** the limb hip is actuated
- **THEN** it is driven toward the transfer-function position via Rapier's joint motor (energy-stable),
  not via the Ekeberg muscle and not via an explicit external torque

### Requirement: Physical limbs with emergent ground contact

The leg groups SHALL be promoted from render-only passengers to physical bodies — a single 1-DOF hip
joint at the hip node plus a foot collider — and foot plant/slip/lift SHALL emerge from the contact
model, not from a scripted lift or a second actuated DOF.

#### Scenario: Foot grips during stance

- **WHEN** a foot is in contact during the slow stance sweep on the ground plane
- **THEN** friction between the foot collider and ground produces forward propulsion (the foot does
  not skate), with contact/lift emerging from the physics — not scripted

### Requirement: Terrestrial walk mode

A walk mode SHALL run the body under gravity on a ground plane with friction (distinct from the swim's
gravity-off neutral buoyancy), with the body supported by leg stance.

#### Scenario: Walks forward and stays upright

- **WHEN** the creature runs in walk mode on flat ground
- **THEN** it progresses forward with a diagonal-trot gait, the body stays upright (does not tip or
  roll over), and kinetic energy stays bounded (no motor energy pump)
