## MODIFIED Requirements

### Requirement: The world is a bounded tank rather than an infinite plane

The simulation SHALL enclose the body in a bounded rectangular volume, so that a body driven forward
cannot leave the observable region.

The tank's dimensions SHALL be configuration values carried in `SimConfig`, so that a tank sized for the
overlay window and a tank sized for measurement are the same code reached by different links.

**The tank's bottom SHALL be glass only where there is nothing to stand on.** Where gravity is non-zero
the world SHALL keep the walking floor plane the legs collide with, the tank SHALL contribute its four
side walls and its ceiling and SHALL NOT contribute a bottom surface of its own, and the walking floor
SHALL be the tank's floor. Where gravity is zero the tank SHALL contribute all six surfaces and the
walking floor plane SHALL be absent.

The feet and the walking floor SHALL remain on their own contact pair, and the tank's walls SHALL remain
on theirs, so that enclosing a body never adds a contact between a trunk surface and the ground.

Where gravity is non-zero the tank SHALL stand on the walking floor, so that the volume the tank publishes
begins at the surface underfoot. Where gravity is zero the tank SHALL be centred on the body's start
position in all three axes.

The body SHALL collide with every surface of the tank, and SHALL rebound from a surface it strikes. The
rebound SHALL be produced by the contact model rather than by any explicit reversal of velocity, so that
the angle a body leaves a wall at is a consequence of how it struck the wall.

The surfaces SHALL NOT be rendered as solid geometry in the overlay, since the tank reads as transparent
glass there.

#### Scenario: A body under no gravity stays inside

- **GIVEN** the gravity lever set to zero and a wave driving the body forward
- **WHEN** the simulation runs for 60 seconds
- **THEN** the body's position is within the tank's bounds at every sample

#### Scenario: A body with weight stands on the ground inside the tank

- **GIVEN** the gravity lever at its normal value, a tank enabled, and a wave driving the body forward
- **WHEN** the simulation runs for 60 seconds
- **THEN** the body's height stays within the range it holds with the tank switched off
- **AND** no part of the body passes below the walking floor
- **AND** the body's horizontal position is within the tank's bounds at every sample

#### Scenario: Enclosing a body does not take away its ground

- **GIVEN** a configuration with gravity and a tank
- **WHEN** the generated model's world surfaces are read
- **THEN** the walking floor plane is present on the feet's contact pair
- **AND** no glass bottom surface is present

#### Scenario: The tank's floor and the ground are the same plane

- **GIVEN** a configuration with gravity and a tank
- **WHEN** the published tank bounds are read
- **THEN** the lowest bound equals the height of the walking floor

#### Scenario: Striking a wall turns the body around

- **GIVEN** a body travelling toward a wall
- **WHEN** the body reaches the wall
- **THEN** the component of its velocity normal to that wall reverses sign
- **AND** no code sets that velocity directly

#### Scenario: The tank is resizable

- **GIVEN** two links differing only in the tank dimensions
- **WHEN** each is run
- **THEN** the bounds the body is confined to differ accordingly

## ADDED Requirements

### Requirement: A grounded tank preset records the approved swim inside a container

The preset ladder SHALL carry a MuJoCo preset that is the approved `base swim` inside the same tank the
flight baseline uses, differing from the flight baseline in the gravity lever and in nothing else, so
that the pair remains a controlled comparison of the medium rather than two separate tunings.

#### Scenario: The grounded and flying presets differ by one lever

- **WHEN** the grounded tank preset and the flight baseline preset are compared field by field
- **THEN** the only field that differs is gravity

#### Scenario: The grounded preset carries what was measured

- **WHEN** the grounded tank preset's description is read
- **THEN** it reports the speed, the height held and the behaviour at a wall that were observed from a
  capture, and not values carried over from the flight baseline
