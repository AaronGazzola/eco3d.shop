## MODIFIED Requirements

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
