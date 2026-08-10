## ADDED Requirements

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

The page SHALL read its parameters from the URL hash fragment, in the same encoding the studio's shared
link already uses, so that no parameter is sent to the server.

The hash SHALL carry a rig identity (`rig`) and MAY carry an encoded `SimConfig` (`sim`) and a leg weight
(`legw`). An encoded `SimConfig` SHALL be applied absolutely — every key absent from the link SHALL take
its default rather than any other value — so the overlay cannot show a blend of the link and some other
state.

Where the hash carries no rig identity, the page SHALL log the failure with `console.error` and render
nothing. It SHALL NOT fall back to a default, a first, or a most-recent rig, because a silently
substituted creature on a live stream is indistinguishable from the intended one.

#### Scenario: A studio link reproduces its run

- **GIVEN** a link produced by the studio for a tuned configuration
- **WHEN** that link is opened on the embed page
- **THEN** every `SimConfig` value in force matches the studio's, and every value the link omits is at its
  default

#### Scenario: A missing rig identity is an error

- **WHEN** `/game/embed` is opened with no rig identity in the hash
- **THEN** the failure is logged and nothing is rendered

#### Scenario: Parameters never reach the server

- **WHEN** the page is requested
- **THEN** the request line carries no rig identity and no encoded configuration

### Requirement: The simulation runs on load

The page SHALL start the coupled simulation once the rig and its mesh are loaded, without any control
being operated. The run flag is not part of `SimConfig` and therefore cannot arrive in the link.

The simulation SHALL start exactly once per page load, and SHALL NOT be restarted by a later store
update.

#### Scenario: The creature is moving when the page settles

- **WHEN** the page has loaded a rig and its mesh
- **THEN** the simulation is running and the creature is in motion, with nothing clicked

### Requirement: The camera follows the creature

The embed page SHALL keep the creature framed as it travels, by tracking the rendered root each frame and
holding the camera at a fixed offset from the root, aimed at the root.

The follow camera SHALL be used only by the embed page. The studio's camera presets and orbit controls
SHALL be unchanged.

#### Scenario: A travelling creature stays in frame

- **GIVEN** a configuration whose creature advances at about 2.8 units per second
- **WHEN** the page has run for 30 seconds
- **THEN** the creature is still framed

#### Scenario: The studio is unaffected

- **WHEN** `/admin/animate` is opened
- **THEN** the camera still starts at the studio's default position and still responds to the camera
  presets and to dragging

### Requirement: The studio produces the overlay link

The Simulate sidebar SHALL offer a `Copy overlay link` control beside the existing `Copy link` control,
which copies a link to the embed page carrying the loaded rig's identity, the current `SimConfig`, and
the current leg weight.

The existing `Copy link` control SHALL keep pointing at the studio page and SHALL also gain the rig
identity, so that a shared studio link no longer depends on the recipient's own saved studio state.

Where no rig is loaded, the overlay link control SHALL be disabled, since a link without a rig identity
cannot render.

#### Scenario: One click yields a working overlay address

- **GIVEN** a rig loaded in the studio and a tuned configuration
- **WHEN** `Copy overlay link` is used and the copied address is opened in a browser with no session
- **THEN** the same creature renders, moving, under the same configuration

#### Scenario: No rig, no link

- **GIVEN** a studio with no rig loaded
- **THEN** the overlay link control is disabled
