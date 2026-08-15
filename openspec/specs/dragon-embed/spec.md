# dragon-embed Specification

## Purpose
TBD - created by archiving change add-dragon-overlay-embed. Update Purpose after archive.
## Requirements
### Requirement: Public embed page renders one rig and nothing else

The system SHALL serve a page at `/game/embed` that renders a single rig with locomotion running, and no
other interface element. The page SHALL NOT require a session, SHALL NOT render the admin login form,
and SHALL NOT render the studio sidebar, the step navigation or the sidebar trigger.

The scene SHALL be drawn on a transparent background, with no floor grid and no orbit controls, so the
page can be composited over live video and cannot be disturbed by a stray click in a browser source.

The page SHALL load the rig from `dragon_models` by the identity given in the URL and SHALL fetch its
mesh through the existing mesh route, reusing the studio's rig-loading and mesh-loading code rather than
duplicating it. Until both the rig and its mesh have loaded, the page SHALL render nothing visible.

#### Scenario: No session is required

- **GIVEN** a browser with no Supabase session
- **WHEN** `/game/embed` is opened with a valid rig identity
- **THEN** the rig renders, and no login form is shown at any point

#### Scenario: Nothing but the creature is drawn

- **WHEN** the page has finished loading
- **THEN** no sidebar, no step navigation, no floor grid and no background fill are drawn
- **AND** the page's background is transparent

#### Scenario: Dragging does not move the camera

- **WHEN** a pointer is dragged across the page
- **THEN** the camera does not rotate, pan or zoom

### Requirement: The URL hash names both the rig and its motion configuration

The page SHALL read its rig parameters from the URL hash fragment, in the same encoding the studio's
shared link already uses, so that no rig parameter is sent to the server.

The hash SHALL carry a rig identity (`rig`) and MAY carry a leg weight (`legw`). Those parameters SHALL
be read by `PlatformHost` and handed to the core, never applied to a studio store by the page itself.

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

### Requirement: The simulation runs on load

The page SHALL start the coupled simulation once the rig and its mesh are loaded, without any control
being operated. The run flag is not part of `SimConfig` and therefore cannot arrive in the link.

The simulation SHALL start exactly once per page load, and SHALL NOT be restarted by a later store
update.

#### Scenario: The creature is moving when the page settles

- **WHEN** the page has loaded a rig and its mesh
- **THEN** the simulation is running and the creature is in motion, with nothing clicked

### Requirement: The camera follows the creature

The embed page SHALL present the tank through a camera that is FIXED for the lifetime of the page, aimed
at the tank's centre. The camera SHALL NOT track, chase or re-aim at the creature, and SHALL NOT refit
its distance as the creature moves.

The face the camera watches through SHALL be taken from the running motion rather than fixed by the page.
A motion watched from overhead SHALL be framed looking down at the tank, fitting its width and its depth;
a motion watched side-on SHALL be framed square-on to a vertical face, fitting its width and its height.
An overhead camera SHALL be given an explicit up direction, since looking straight down leaves the roll
of the frame otherwise undefined.

The camera SHALL be perspective, and its distance SHALL be fitted once so that the region the creature
can occupy is framed at the page's aspect ratio. That region is not the whole tank for every face. A
side-on camera SHALL frame the whole volume, since a creature with no weight can be anywhere in it. An
overhead camera SHALL frame the tank's FLOOR, since a creature with weight is on it; the glass above is
headroom the creature never enters, and framing it would shrink the creature for nothing and would make
how large the creature looks depend on how tall the tank is.

An overhead camera SHALL be aimed at the floor rather than at the tank's mid-height, so that a tank
taller than the fitted distance cannot invert the aim.

Perspective is kept so that a creature moving toward the camera's face grows
and one moving away shrinks, which is what makes the window read as a volume seen through glass. That cue
is a property of perspective and of the face, not a requirement placed on every motion: a creature that
holds one distance from the face it is watched through will not change size, and that is not a fault.

The fit SHALL be computed by a function of the tank's bounds, the face, the aspect ratio and the field of
view alone, holding no reference to the rendering surface or to any store, so that the claim that the
whole tank is framed can be checked by projection rather than inferred from a picture.

Where the page's size changes, the camera SHALL re-fit to frame the tank at the new aspect ratio, since a
browser source may be resized. Re-fitting on resize is not tracking: it responds to the window, never to
the creature.

The fixed camera SHALL be used only by the embed page. The studio's camera presets and orbit controls
SHALL be unchanged.

#### Scenario: The camera does not move as the creature does

- **GIVEN** a motion whose creature crosses the tank
- **WHEN** the page has run for 30 seconds
- **THEN** the camera's position and aim are the same as at the first frame

#### Scenario: The motion chooses the face

- **GIVEN** two motions declaring different faces
- **WHEN** each is run on the embed page
- **THEN** the camera's viewing direction differs accordingly
- **AND** no page code names a face

#### Scenario: The region the creature can occupy is in frame

- **GIVEN** a tank, a face and an aspect ratio
- **WHEN** the fit is computed and the corners of that region are projected through it
- **THEN** every corner lands inside the viewport
- **AND** for a side-on face the region is all eight corners of the tank
- **AND** for an overhead face the region is the four corners of its floor

#### Scenario: Headroom does not shrink the creature

- **GIVEN** two tanks with the same floor and different heights
- **WHEN** each is fitted overhead at the same aspect ratio
- **THEN** the floor projects to exactly the same size in both

#### Scenario: Overhead has a defined roll

- **GIVEN** the overhead face
- **WHEN** the fit is computed
- **THEN** it yields an up direction that is not parallel to the viewing direction
- **AND** the creature's long axis of travel lies across the frame rather than up it

#### Scenario: Resizing re-frames the tank

- **GIVEN** a page framed at one size
- **WHEN** the page is resized to a different aspect ratio
- **THEN** the whole tank is in frame again

#### Scenario: The studio is unaffected

- **WHEN** `/admin/animate` is opened
- **THEN** the camera still starts at the studio's default position and still responds to the camera
  presets and to dragging

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

