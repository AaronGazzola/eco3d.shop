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
glass there. An outline of the tank's floor MAY be drawn as lines for diagnosis, off by default and shown
only where a link asks for it, since a line is not a surface and confining a creature is not observable
without seeing what confines it.

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

#### Scenario: No glass is drawn on a stream

- **GIVEN** an overlay link that does not ask for a boundary outline
- **WHEN** the overlay renders
- **THEN** no tank surface and no tank outline is drawn

## ADDED Requirements

### Requirement: The simulation can be reset without reloading the page

The simulation SHALL expose an explicit reset that restarts the body at its start position. Gravity and the
tank are baked into the generated model, so the simulation already rebuilds when one of them changes and a
rebuild already restarts the body; a reset SHALL be that same rebuild, requested directly rather than
reached as a side effect of changing a value nobody wanted to change.

The reset SHALL be carried by a value the staleness check reads, and that value SHALL NOT be part of
`SimConfig`. `SimConfig` is what makes a preset reproducible and what is persisted, so a reset counter
inside it would make two identical presets compare unequal and would persist a reset as configuration.

Requesting a reset SHALL rebuild the model exactly once per request.

A reset SHALL NOT change any configuration value, so that a run taken after a reset is comparable with the
run taken before it.

#### Scenario: A reset restarts the body where it started

- **GIVEN** a running simulation whose body has travelled away from its start position
- **WHEN** a reset is requested
- **THEN** the model is rebuilt and the body is at its start position

#### Scenario: A reset is not configuration

- **GIVEN** a simulation configuration
- **WHEN** a reset is requested
- **THEN** no configuration value differs from its value before the reset
- **AND** the persisted configuration is unchanged

#### Scenario: A preset stays reproducible across a reset

- **GIVEN** the same preset applied before and after a reset
- **WHEN** the two configurations are compared
- **THEN** they compare equal

#### Scenario: One request is one rebuild

- **GIVEN** a running simulation
- **WHEN** a single reset is requested
- **THEN** the model is rebuilt once and not twice
