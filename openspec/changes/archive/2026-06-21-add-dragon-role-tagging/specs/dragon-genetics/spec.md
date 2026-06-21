# Dragon genetics — model creation + role tagging (delta)

## ADDED Requirements

### Requirement: Admins can create a stage model for a variant

The admin UI SHALL let an admin create a `dragon_models` row for a `(variant, stage)` pair by sourcing
geometry from an existing `model_config` (its `stl_key`, rig `groups`, and `model_rotation` are copied
onto the new model). Creation is restricted to admins.

#### Scenario: Create a model from a saved configuration

- **WHEN** an admin picks a variant, a stage, and a saved `model_config`, and confirms creation
- **THEN** a `dragon_models` row is persisted for that `(variant, stage)` carrying the configuration's
  `stl_key`, `groups`, and `model_rotation`, and it appears in the variant's list of stage models

#### Scenario: Non-admin cannot create a model

- **WHEN** a model-creation action is invoked without an admin session
- **THEN** the action refuses the write and no row is created

### Requirement: Admins can tag a model's segments to roles

The admin UI SHALL render a model's geometry as selectable 3D segments and let an admin assign one or
more selected segments to one of the variant's roles, building a `role_tags` map of `segmentId →
roleKey`. Untagged segments SHALL be visually distinct from tagged ones, and each role SHALL have a
distinct colour in the canvas so coverage is visible.

#### Scenario: Assign segments to a role

- **WHEN** an admin selects one or more segments and assigns them to a role
- **THEN** those segments are recorded as tagged to that role and painted that role's colour

#### Scenario: Re-tag a segment to a different role

- **WHEN** an admin assigns an already-tagged segment to a different role
- **THEN** the segment's role in the map is replaced with the new role

#### Scenario: Untag a segment

- **WHEN** an admin removes a segment's tag
- **THEN** the segment no longer appears in `role_tags` and renders as untagged

### Requirement: Tagging is persisted and reflected in rendering

The admin UI SHALL persist the edited `role_tags` to the `dragon_models` row through an admin-gated
action, and the saved tags SHALL be used by the render path so the model paints each role's resolved
colour.

#### Scenario: Saved tags drive the rendered colours

- **WHEN** an admin saves a model's `role_tags` and the variant is re-rendered
- **THEN** each tagged segment is painted the colour its role resolves to for the rendered genotype

#### Scenario: Edits replace prior tags on reload

- **WHEN** an admin reopens a previously saved model
- **THEN** the canvas shows the persisted `role_tags` as the starting state for further editing
