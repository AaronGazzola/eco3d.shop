## MODIFIED Requirements

### Requirement: Two host implementations back the two surfaces

`StandaloneHost` SHALL back the home page, reporting a single actor, supplying actions raised by the
page's own interface, and reading settings from eco3d. `PlatformHost` SHALL back the overlay, reading its
save from the overlay link and its settings and events from the platform its frame is running in.

`PlatformHost` SHALL raise an action on behalf of an actor supplied by the platform, whose kind is a
viewer, distinct from the streamer who owns the surface. The core SHALL require no change to accept one,
because the actor has always been the host's to report.

#### Scenario: The home page runs the core

- **WHEN** a visitor loads the home page
- **THEN** the game core is mounted through `StandaloneHost` and the visitor's actions reach the core as
  that single actor

#### Scenario: The overlay runs the same core

- **WHEN** the overlay page is loaded with a link naming a rig
- **THEN** the same game core is mounted through `PlatformHost`, and the creature behaves as it does on
  the home page for the same save

#### Scenario: A viewer acts through the overlay

- **WHEN** the platform reports an action taken by a viewer
- **THEN** the core applies it and credits that viewer, with no branch in the core distinguishing them
  from the streamer
