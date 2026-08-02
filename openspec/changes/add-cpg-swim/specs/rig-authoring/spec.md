## MODIFIED Requirements

### Requirement: Studio stepper

The studio sidebar SHALL present the authoring workflow as ordered steps: 1 Pick Model, 2 Group Segments, 3 Animate, 4 Locomotion. Step 2 SHALL require loaded segments. Steps 3 and 4 SHALL require at least one body group. Step 4 SHALL NOT require a saved rig, because locomotion state is not persisted. Navigation SHALL move between adjacent steps and jump to any step whose requirement is met.

#### Scenario: Locomotion is reachable once groups exist

- **WHEN** a rig with at least one body group is loaded
- **THEN** step 4 is enabled and opens the locomotion studio

#### Scenario: Locomotion is blocked without groups

- **WHEN** no body group exists
- **THEN** step 4 is disabled
