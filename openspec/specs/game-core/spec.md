# game-core Specification

## Purpose
TBD - created by archiving change add-game-core-and-hosts. Update Purpose after archive.
## Requirements
### Requirement: The game core is host-agnostic and runs without a browser

The game core SHALL hold world state, the rules that advance it, and the actions that change it. The
core SHALL NOT import React, any store used by the research studio, any module under
`app/admin/animate/`, or anything that reads a URL, a browser API, or a network response. The core SHALL
be advanceable by an explicit tick so that it can be exercised headlessly.

#### Scenario: The core advances with no browser present

- **WHEN** the core is constructed in a Node script, given a save and a fixed sequence of ticks
- **THEN** its state advances deterministically and no browser API is touched

#### Scenario: The studio is not in the import graph

- **WHEN** the import graph of the game core module is traversed
- **THEN** it contains no module from `app/admin/animate/` and no React import

### Requirement: The Host interface is the core's only route to its environment

The core SHALL obtain everything environmental through a single Host interface: which save to load, who
is acting, the current settings, and the events that have arrived since the previous tick. The core
SHALL NOT receive environmental values by any other route.

#### Scenario: An action is attributed to an actor supplied by the host

- **WHEN** an action reaches the core
- **THEN** the actor is the one the host reported, and the core has no other means of learning it

#### Scenario: A second surface needs no core change

- **WHEN** a new surface is added by implementing the Host interface
- **THEN** the core is used unchanged, because no surface-specific branch exists inside it

### Requirement: Two host implementations back the two surfaces

`StandaloneHost` SHALL back the home page, reporting a single actor, supplying actions raised by the
page's own interface, and reading settings from eco3d. `PlatformHost` SHALL back the overlay. In this
change `PlatformHost` SHALL read its save and settings from the overlay link, preserving the behaviour
the overlay has today.

#### Scenario: The home page runs the core

- **WHEN** a visitor loads the home page
- **THEN** the game core is mounted through `StandaloneHost` and the visitor's actions reach the core as
  that single actor

#### Scenario: The overlay runs the same core

- **WHEN** the overlay page is loaded with a link naming a rig
- **THEN** the same game core is mounted through `PlatformHost`, and the creature behaves as it does on
  the home page for the same save

### Requirement: The same mechanics are available on both surfaces

Every action the core exposes SHALL be reachable from both hosts. A mechanic SHALL NOT be implemented in
a surface; a surface SHALL only raise actions and render state.

#### Scenario: A mechanic added once appears in both places

- **WHEN** a new action is added to the core
- **THEN** both surfaces can raise it without a change to the core, because neither surface holds game
  rules

