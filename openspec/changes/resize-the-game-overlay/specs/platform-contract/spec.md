## MODIFIED Requirements

### Requirement: The streamer names the creature

The overlay SHALL take the creature's name from the settings its host supplies, and SHALL fall back to
its own default where the setting is absent or empty.

The overlay SHALL take the room figure from those same settings, which says how much world the creature's
window shows and so how large the creature reads inside it. It SHALL fall back to 1 where the setting is
absent, is not a number, or is outside the supported range.

Every setting SHALL be mapped rather than adopted: the settings object is the host's, and the overlay reads
the keys it knows and holds its own defaults for the rest.

A setting the overlay does not recognise SHALL be ignored rather than breaking the game, so that the
host may carry keys this version has never heard of.

#### Scenario: A named creature

- **WHEN** the streamer sets a creature name and the overlay receives it
- **THEN** the creature carries that name

#### Scenario: An unset name falls back

- **WHEN** no creature name is set
- **THEN** the creature carries the default name

#### Scenario: A set room figure reaches the world

- **WHEN** the streamer sets a room figure and the overlay receives it
- **THEN** the creature's world is sized by that figure

#### Scenario: An unset room figure falls back

- **WHEN** no room figure is set
- **THEN** the room figure used is 1

#### Scenario: A nonsense room figure falls back

- **WHEN** the room figure is not a number, or is zero, negative, or beyond the supported range
- **THEN** the room figure used is 1

#### Scenario: An unknown setting is harmless

- **WHEN** the settings carry a key the overlay does not know
- **THEN** the game runs unchanged
