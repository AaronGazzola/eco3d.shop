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

### Requirement: Limb transfer function with foot lift

Each limb oscillator's phase SHALL be mapped, via a transfer function, to the leg's motion — fore-aft
swing plus a swing-phase foot lift — with a stance duty factor approximating the reference.

#### Scenario: Stance vs swing

- **WHEN** a limb oscillator advances through its cycle
- **THEN** the leg retracts (propels) with the foot planted during the stance fraction (≈ duty factor)
  and protracts with the foot lifted clear of the ground during swing

### Requirement: Physical limbs with ground contact

The leg groups SHALL be promoted from render-only passengers to physical bodies — a motor-driven hip
at the hip node plus a foot collider — so that stance contact and friction produce propulsion.

#### Scenario: Foot grips during stance

- **WHEN** a foot is planted during stance on the ground plane
- **THEN** friction between the foot collider and ground produces forward propulsion (the foot does
  not skate)

#### Scenario: Limbs actuated through motors

- **WHEN** the limb hip is driven from the transfer-function target
- **THEN** actuation uses Rapier's joint motor (energy-stable), not an explicit external torque

### Requirement: Terrestrial walk mode

A walk mode SHALL run the body under gravity on a ground plane with friction (distinct from the swim's
gravity-off neutral buoyancy), with the body supported by leg stance.

#### Scenario: Walks forward and stays upright

- **WHEN** the creature runs in walk mode on flat ground
- **THEN** it progresses forward with a diagonal-trot gait, the body stays upright (does not tip or
  roll over), and kinetic energy stays bounded (no motor energy pump)
