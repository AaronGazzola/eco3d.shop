## ADDED Requirements

### Requirement: The overlay mounts the game core through a host

The overlay page SHALL mount the game core through `PlatformHost` rather than mounting the research
studio's scene. It SHALL render the game render path, so the creature is animated, role-coloured, and
free of development affordances.

#### Scenario: The overlay and the home page show the same game

- **WHEN** the overlay and the home page are opened against the same save
- **THEN** the same creature is shown doing the same thing, because both mount the same core

#### Scenario: The studio scene is no longer the overlay's scene

- **WHEN** the import graph of the overlay page is traversed
- **THEN** it mounts the game core and does not mount the studio's scene component

## MODIFIED Requirements

### Requirement: The URL hash names both the rig and its motion configuration

The page SHALL read its parameters from the URL hash fragment, in the same encoding the studio's shared
link already uses, so that no parameter is sent to the server.

The hash SHALL carry a rig identity (`rig`) and MAY carry a leg weight (`legw`). Those parameters SHALL
be read by `PlatformHost` and handed to the core, never applied to a studio store by the page itself.

The hash SHALL NOT carry an encoded `SimConfig`. Motion is chosen by the core by name and resolved by
the motion layer, so a configuration in the link would let a link override the game's own choice of
motion, which is precisely the coupling this change removes. A `sim` parameter present in a link SHALL
be ignored, and its presence SHALL be logged with `console.error` so stale links are visible rather than
silently half-honoured.

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

#### Scenario: Parameters never reach the server

- **WHEN** the page is requested
- **THEN** the request line carries no rig identity and no encoded configuration

### Requirement: The studio produces the overlay link

The studio SHALL produce a link for the overlay carrying the rig identity and, where set, the leg
weight. It SHALL NOT encode a `SimConfig` into an overlay link, because the overlay no longer applies
one.

The studio SHALL keep producing its own shareable configuration links for tuning work. Those links are
for the studio, not for the overlay, and the two SHALL be distinct.

#### Scenario: An overlay link carries no configuration

- **WHEN** an overlay link is copied from the studio
- **THEN** the link names the rig and carries no encoded `SimConfig`

#### Scenario: Studio configuration links still work

- **WHEN** a configuration link is copied from the studio and opened in the studio
- **THEN** every tuned value is restored exactly as before
