## MODIFIED Requirements

### Requirement: The URL hash names both the rig and its motion configuration

The page SHALL read its rig parameters from the URL hash fragment, in the same encoding the studio's
shared link already uses, so that no rig parameter is sent to the server.

The hash SHALL carry a rig identity (`rig`) and MAY carry a leg weight (`legw`). Those parameters SHALL
be read by `PlatformHost` and handed to the core, never applied to a studio store by the page itself.

The hash MAY additionally carry diagnostic flags, which change what is drawn for an observer and never
what the creature does. A diagnostic flag SHALL default to off when absent, so that a link written before
the flag existed behaves exactly as it did. The flags are `controls`, which turns on orbit controls and an
opaque background for looking around in a tab, and `bounds`, which draws the region the creature is
confined to.

The hash SHALL NOT carry an encoded `SimConfig`. Motion is chosen by the core by name and resolved by
the motion layer, so a configuration in the link would let a link override the game's own choice of
motion, which is precisely the coupling this change removes. A `sim` parameter present in a link SHALL
be ignored, and its presence SHALL be logged with `console.error` so stale links are visible rather than
silently half-honoured.

The page SHALL additionally read a platform token from the query string, which the host appends to the
address it was given. The token names the channel, never the creature: the rig remains the overlay's own
configuration and the host carries it through untouched.

Where the hash carries no rig identity, the page SHALL log the failure with `console.error` and render
nothing. It SHALL NOT fall back to a default, a first, or a most-recent rig, because a silently
substituted creature on a live stream is indistinguishable from the intended one.

#### Scenario: A rig identity is enough to run

- **GIVEN** a link carrying only a rig identity
- **WHEN** that link is opened on the embed page
- **THEN** the core runs against that rig and the creature cruises, with no configuration in the link

#### Scenario: A stale studio link is ignored, loudly

- **WHEN** a link carrying an encoded `SimConfig` is opened
- **THEN** the configuration is ignored, the core still runs, and the ignored parameter is logged

#### Scenario: A missing rig identity is an error

- **WHEN** `/game/embed` is opened with no rig identity in the hash
- **THEN** the failure is logged and nothing is rendered

#### Scenario: Rig parameters never reach the server

- **WHEN** the page is requested
- **THEN** the request line carries no rig identity and no encoded configuration

#### Scenario: A token is not a rig

- **WHEN** the page is opened with a token and no rig identity
- **THEN** nothing is rendered, because the token names a channel and not a creature

#### Scenario: A link written before diagnostic flags existed is unchanged

- **WHEN** a link carrying only a rig identity is opened
- **THEN** no boundary is drawn and no orbit controls are active

## ADDED Requirements

### Requirement: The overlay can draw the region the creature is confined to

The page SHALL be able to draw an outline of the tank's floor rectangle, so that the region the creature is
confined to and the creature itself are visible in the same frame. Without it, a creature outside the window
and a creature outside the tank look identical, and the camera and the physics cannot be told apart.

The outline SHALL be drawn from the tank bounds the simulation publishes, which is the same source the
camera is fitted from, so that the outline cannot disagree with either the physics or the camera.

The outline SHALL be the floor rectangle only, drawn at the tank's lowest bound. The remaining edges of the
tank SHALL NOT be drawn, because an edge above the floor projects outward under perspective and a line
expected to fall outside the window cannot serve as evidence that something has fallen outside the window.

The outline SHALL be drawn as lines and SHALL NOT be drawn as a filled or solid surface, so that it never
obscures the creature it is drawn to measure.

The outline SHALL be drawn only where the `bounds` flag is set in the hash, and SHALL NOT be drawn
otherwise, so that a live stream is unchanged unless the flag is asked for.

Where the flag is set but the simulation has published no bounds yet, the page SHALL draw no outline and
SHALL NOT log a failure, because bounds arrive several frames after mount and every healthy load passes
through that gap.

#### Scenario: The boundary is drawn when asked for

- **GIVEN** a link carrying a rig identity and the `bounds` flag
- **WHEN** the page has loaded and the simulation has published its bounds
- **THEN** a four-sided outline is drawn at the tank's lowest bound, matching the published bounds on both
  horizontal axes

#### Scenario: The boundary is absent by default

- **GIVEN** a link carrying a rig identity and no `bounds` flag
- **WHEN** the page has loaded and the simulation has published its bounds
- **THEN** no outline is drawn

#### Scenario: The boundary waits for bounds without complaining

- **GIVEN** a link carrying the `bounds` flag
- **WHEN** the page has mounted but the simulation has not yet published its bounds
- **THEN** no outline is drawn and no error is logged

#### Scenario: The boundary reads the same bounds the camera does

- **GIVEN** a link carrying the `bounds` flag
- **WHEN** the outline's corners and the camera's fitted volume are compared
- **THEN** both are derived from the same published bounds

### Requirement: The overlay's observation handle can reset the creature

The read-only observation handle the page installs SHALL additionally expose a reset, which restarts the
creature at its start position without reloading the page. The simulation runs in the browser, so restarting
the server leaves it running, and without a reset every observation begins from wherever the previous one
ended.

The reset SHALL restart the creature by the same path a structural change already takes, so that a reset and
a rebuild cannot drift apart in what they restore.

The handle SHALL otherwise remain read-only: beyond the reset it SHALL expose no way to drive the creature,
feed it, or alter its configuration.

#### Scenario: A reset returns the creature to its start position

- **GIVEN** an overlay page whose creature has travelled away from its start position
- **WHEN** the reset on the observation handle is called
- **THEN** the creature is at its start position, with no page reload

#### Scenario: A reset needs no server restart

- **GIVEN** an overlay page with a running creature
- **WHEN** the server is restarted and no reset is called
- **THEN** the creature continues from where it was, because the simulation runs in the browser

#### Scenario: The handle cannot drive the creature

- **WHEN** the observation handle is inspected
- **THEN** it exposes the world state, the channel and the reset, and no way to feed or steer the creature
