# motion-vocabulary Specification

## Purpose
TBD - created by archiving change add-game-core-and-hosts. Update Purpose after archive.
## Requirements
### Requirement: Motion is requested by name, never by configuration

The game core SHALL request creature motion by a primitive name. The core SHALL NOT construct, hold, or
pass a `SimConfig`, and SHALL NOT read the research studio's preset module. Resolving a name to a
configuration SHALL happen only inside the motion layer.

#### Scenario: The core asks for a motion by name

- **WHEN** the core wants the creature to cruise
- **THEN** it names `cruise`, and the configuration that produces cruising is chosen by the motion layer

#### Scenario: No configuration reaches the core

- **WHEN** the import graph of the game core is traversed
- **THEN** no simulation configuration type is imported into it

### Requirement: An unknown primitive falls back to cruise

The motion layer SHALL resolve any primitive name it does not recognise to `cruise`, and SHALL record
that the fallback was taken. It SHALL NOT throw, and SHALL NOT leave the creature motionless.

#### Scenario: A primitive the animation track has not built yet

- **WHEN** the core requests `pursue` and no configuration is published under that name
- **THEN** the creature cruises, the fallback is recorded, and play continues uninterrupted

#### Scenario: A published primitive is used directly

- **WHEN** the core requests a name that is published
- **THEN** that configuration is applied and no fallback is recorded

### Requirement: `cruise` resolves to the published flight baseline

The motion layer SHALL resolve `cruise` to the flight baseline preset produced by the animation track.
Replacing that preset with an improved one SHALL change how the creature flies without any change to the
game core.

#### Scenario: An improved baseline reaches the game

- **WHEN** the flight baseline preset is republished with different values
- **THEN** the creature in the game flies differently and no game code changed

