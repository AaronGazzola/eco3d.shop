## ADDED Requirements

### Requirement: Gravity is a configuration lever on the reduced-coordinate engine

The simulation SHALL expose the gravitational acceleration applied to the body as a configuration value
carried in `SimConfig` and therefore in a shared link, so that a run with no gravity is reproducible from
a link exactly as any other run is.

The value SHALL default to the downward pull in force today, so that every existing preset and every
previously shared link produces the same motion it produced before this change.

Because the reduced-coordinate engine writes gravity into the model it generates rather than reading it
each step, changing the value SHALL rebuild the model, in the same way that toggling any other structural
property already does. The rebuild SHALL NOT be triggered when the value is unchanged.

#### Scenario: An existing link is unaffected

- **GIVEN** a shared link produced before this change, carrying no gravity value
- **WHEN** the link is opened
- **THEN** the body behaves as it did before this change, with the downward pull in force

#### Scenario: Gravity off leaves the body floating

- **GIVEN** the gravity lever set to zero, with no wave driving the body
- **WHEN** the simulation runs for 10 seconds
- **THEN** the body's vertical position does not fall

#### Scenario: Changing gravity rebuilds the model

- **WHEN** the gravity lever is changed
- **THEN** the model is rebuilt, and the run that follows reflects the new value

### Requirement: The world is a bounded tank rather than an infinite plane

The simulation SHALL enclose the body in a bounded rectangular volume of six surfaces, replacing the
single infinite floor plane, so that a body under no gravity cannot leave the observable region.

The tank's dimensions SHALL be configuration values carried in `SimConfig`, so that a tank sized for the
overlay window and a tank sized for measurement are the same code reached by different links.

The body SHALL collide with every surface of the tank, and SHALL rebound from a surface it strikes. The
rebound SHALL be produced by the contact model rather than by any explicit reversal of velocity, so that
the angle a body leaves a wall at is a consequence of how it struck the wall.

The surfaces SHALL NOT be rendered as solid geometry in the overlay, since the tank reads as transparent
glass there.

#### Scenario: A body under no gravity stays inside

- **GIVEN** the gravity lever set to zero and a wave driving the body forward
- **WHEN** the simulation runs for 60 seconds
- **THEN** the body's position is within the tank's bounds at every sample

#### Scenario: Striking a wall turns the body around

- **GIVEN** a body travelling toward a wall
- **WHEN** the body reaches the wall
- **THEN** the component of its velocity normal to that wall reverses sign
- **AND** no code sets that velocity directly

#### Scenario: The tank is resizable

- **GIVEN** two links differing only in the tank dimensions
- **WHEN** each is run
- **THEN** the bounds the body is confined to differ accordingly

### Requirement: The legs contribute nothing to flight

While flying, the legs SHALL remain rigid against the body, SHALL contribute no propulsive force, and
SHALL contribute no resistance to travel through the fluid.

This is a property the runtime is required to preserve, not a new mechanism: drag is applied to trunk
segments only, and the leg capsules collide with nothing. The requirement exists so that a later change
cannot quietly reintroduce a leg contribution without a test failing.

#### Scenario: Removing the legs does not change the trajectory

- **GIVEN** a flight configuration
- **WHEN** the same configuration is run with the legs at their lightest and at ten times that weight
- **THEN** the distance travelled differs by less than the run-to-run variation of the harness

#### Scenario: The feet exert no force

- **WHEN** a flight configuration runs with foot thrust disabled
- **THEN** no force is applied at any foot at any step

### Requirement: The harness reports body attitude

The observation harness SHALL report, for every capture, the body's roll about its own long axis: the
peak roll angle reached, and the number of times the roll direction reverses per second.

Both SHALL be reported together, because the reversal count degrades into noise below roughly one degree
of peak, so neither number is interpretable alone.

The harness SHALL report roll for batch samples and for single runs through the same scoring code, so
that a batch row and a single-run report cannot describe the same capture differently.

#### Scenario: A tumbling body is visible in the numbers

- **GIVEN** a capture in which the body rolls past 90 degrees
- **WHEN** the capture is scored
- **THEN** the peak roll reported exceeds 90 degrees

#### Scenario: One scorer, two callers

- **GIVEN** one capture
- **WHEN** it is scored as a batch sample and as a single run
- **THEN** the roll figures reported are identical
