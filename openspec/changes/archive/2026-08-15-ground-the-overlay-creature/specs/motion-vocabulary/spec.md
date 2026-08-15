## REMOVED Requirements

### Requirement: `cruise` resolves to the published flight baseline

**Reason**: `cruise` no longer names flight. Flight reaches a wall and is pitched into the ceiling, and
the steering that would fix it has not been built, so the overlay's creature is grounded until it has.
The requirement's name and its scenarios are both specific to flying.

**Migration**: Replaced in full by "`cruise` resolves to the published cruising baseline" below, which
keeps the substance — the core names a motion and the motion layer chooses the configuration — and drops
the assumption that cruising means flying. `flight base` stays published; nothing resolves to it.

## ADDED Requirements

### Requirement: `cruise` resolves to the published cruising baseline

The motion layer SHALL resolve `cruise` to the baseline preset the animation track currently publishes
for a creature going about its business. Replacing that preset with an improved one, or repointing
`cruise` at a different one, SHALL change how the creature moves without any change to the game core.

`cruise` SHALL resolve to the grounded tank baseline: the creature travels along the floor of its
container.

#### Scenario: An improved baseline reaches the game

- **WHEN** the cruising baseline preset is republished with different values
- **THEN** the creature in the game moves differently and no game code changed

#### Scenario: Cruising is grounded

- **WHEN** `cruise` is resolved
- **THEN** the configuration it yields has gravity and a tank
- **AND** no file under the game core changed to make that so

### Requirement: A published motion declares the face its container is watched through

Each published motion SHALL declare which face of its tank the creature is watched through, and the
surface that presents the tank SHALL take the face from the running motion rather than holding one of its
own.

This exists so that a motion and its camera cannot disagree. Repointing a motion at a preset that is
watched from a different direction SHALL change the camera by that act alone.

#### Scenario: Every published motion names a face

- **WHEN** the published motion table is read
- **THEN** every entry carries a face

#### Scenario: The resolved motion carries its face out

- **WHEN** a motion name is resolved
- **THEN** the result carries the face that motion is watched through
- **AND** a name that fell back to `cruise` carries `cruise`'s face
