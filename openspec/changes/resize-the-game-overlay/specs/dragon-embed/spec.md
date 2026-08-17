## ADDED Requirements

### Requirement: The creature's world takes the shape of the overlay window

The overlay SHALL size the tank from the box the host reports, so that the region the creature moves in and
the window it is watched through are the same shape. The overhead camera maps the tank's width across the
window and its depth up the window, so a window and a tank that disagree put the creature somewhere the
streamer did not choose.

The tank's width SHALL be a base of 60 world units multiplied by the room figure, and the tank's depth
SHALL be that width divided by the box's aspect ratio. At a box of 480 by 320 and a room figure of 1 this
SHALL produce a tank 60 wide and 40 deep, which is the tank in use before this change, so an overlay that
is never resized behaves exactly as it did.

The tank's height SHALL NOT be derived from the box. Overhead framing does not depend on it and a grounded
creature does not use it.

The derived width and depth SHALL each be clamped to a stated range, so that an extreme window cannot
produce a tank the creature would take minutes to cross or one narrower than the creature itself.

The creature SHALL NOT be scaled. A rig is a physics body whose mass and inertia follow its size, so
changing the creature's size would invalidate the locomotion tuning. Room is made by sizing the tank.

Where the host reports no box, the tank SHALL keep the dimensions it already has, because a missing box is
the state every overlay passes through before its host has spoken.

#### Scenario: The window's shape becomes the tank's shape

- **GIVEN** an overlay whose box is twice as wide as it is tall
- **WHEN** the host reports that box
- **THEN** the tank's width is twice its depth

#### Scenario: The tank in use today is reproduced exactly

- **GIVEN** a box of 480 by 320 and a room figure of 1
- **WHEN** the tank dimensions are derived
- **THEN** the tank is 60 wide and 40 deep

#### Scenario: A narrower window is a narrower world

- **GIVEN** two boxes of equal width and different heights
- **WHEN** the tank dimensions are derived for each
- **THEN** the taller box yields the deeper tank
- **AND** both yield the same tank width

#### Scenario: The tank's height is left alone

- **GIVEN** two boxes of different shapes
- **WHEN** the tank dimensions are derived for each
- **THEN** both carry the same tank height

#### Scenario: An extreme window cannot produce an extreme world

- **GIVEN** a box whose aspect ratio is beyond the supported range
- **WHEN** the tank dimensions are derived
- **THEN** the width and the depth are each within the stated clamp

#### Scenario: A silent host leaves the world alone

- **GIVEN** an overlay whose host has reported no box
- **WHEN** the overlay renders
- **THEN** the tank keeps the dimensions it already had, and no failure is logged

### Requirement: The streamer sets how much room the creature has

The overlay SHALL accept a room figure from the host's settings, which multiplies the tank's width and so
decides how large the creature reads inside its window. Room is a preference the streamer chooses, and the
window's size is a measurement the host takes, so the two SHALL be separate quantities and either SHALL be
changeable without the other.

A smaller room figure SHALL make the creature read larger, because the same window then shows less world.

The room figure SHALL be read from the settings the host already sends, and SHALL fall back to 1 where the
setting is absent, not a number, or outside the supported range, so that a host which never sends it
behaves exactly as before.

#### Scenario: Less room makes a larger creature

- **GIVEN** two overlays with the same box and different room figures
- **WHEN** the tank dimensions are derived for each
- **THEN** the smaller room figure yields the smaller tank

#### Scenario: A host that says nothing about room is unchanged

- **GIVEN** settings carrying no room figure
- **WHEN** the tank dimensions are derived
- **THEN** the room figure used is 1

#### Scenario: A nonsense room figure is refused

- **GIVEN** settings carrying a room figure that is not a number, or is zero or negative
- **WHEN** the tank dimensions are derived
- **THEN** the room figure used is 1

#### Scenario: Room and window are independent

- **GIVEN** an overlay whose room figure changes while its box does not
- **WHEN** the tank dimensions are derived
- **THEN** the tank's aspect ratio is unchanged and its size differs
