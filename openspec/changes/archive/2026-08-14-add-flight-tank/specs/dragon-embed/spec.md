## MODIFIED Requirements

### Requirement: The camera follows the creature

The embed page SHALL present the tank through a camera that is FIXED for the lifetime of the page,
positioned side-on to the tank and aimed at the tank's centre. The camera SHALL NOT track, chase or
re-aim at the creature, and SHALL NOT refit its distance as the creature moves.

The camera SHALL be perspective, and its distance SHALL be fitted once so that the whole tank is framed
at the page's aspect ratio. Perspective is the point rather than an implementation detail: a creature
flying toward the near face of the tank MUST appear larger, and one flying toward the far face MUST
appear smaller, which is what makes the window read as a volume seen through glass rather than as a flat
picture.

Where the page's size changes, the camera SHALL re-fit to frame the tank at the new aspect ratio, since a
browser source may be resized. Re-fitting on resize is not tracking: it responds to the window, never to
the creature.

The fixed camera SHALL be used only by the embed page. The studio's camera presets and orbit controls
SHALL be unchanged.

#### Scenario: The camera does not move as the creature does

- **GIVEN** a flight configuration whose creature crosses the tank
- **WHEN** the page has run for 30 seconds
- **THEN** the camera's position and aim are the same as at the first frame

#### Scenario: Distance reads as size

- **GIVEN** a creature at the far face of the tank and the same creature at the near face
- **WHEN** each is captured
- **THEN** the creature occupies a visibly larger area of the frame at the near face

#### Scenario: The whole tank is in frame

- **WHEN** the page has settled
- **THEN** all eight corners of the tank project inside the viewport

#### Scenario: Resizing re-frames the tank

- **GIVEN** a page framed at one size
- **WHEN** the page is resized to a different aspect ratio
- **THEN** the whole tank is in frame again

#### Scenario: The studio is unaffected

- **WHEN** `/admin/animate` is opened
- **THEN** the camera still starts at the studio's default position and still responds to the camera
  presets and to dragging
