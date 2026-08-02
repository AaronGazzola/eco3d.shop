# rig-authoring Specification

## Purpose

The admin studio pipeline that turns an STL into a rigged dragon — STL import, segment detection, grouping, node-skeleton assignment with per-joint angle caps — and persists it to the unified `dragon_models` table (variant × stage).
## Requirements
### Requirement: Rig authoring pipeline is preserved verbatim

The admin studio SHALL retain the full rig-authoring pipeline unchanged in behavior: STL import via `useStlLoader` (fetch from `/api/r2`, parse with STLLoader), segment detection in `segmentDetector.worker.ts`, segment grouping and node-skeleton assignment (node types front/back/hipLeft/hipRight/foot) in `app/admin/group/**`, per-joint angle caps, and model rotation. The segmentation worker, `groupStore`, `GroupScene`, `NodeOverlay`, and `sharedStore` group/selection logic SHALL NOT be functionally modified by this change.

#### Scenario: Authoring flow unchanged after refactor

- **WHEN** an admin loads a rig in the studio, adjusts a joint's angle cap, and reassigns a segment to another group
- **THEN** the editing behavior is identical to before this change, and the resulting `groups` JSON has the same shape (segment membership, node assignments, angle caps) as previously authored rigs

### Requirement: Studio persists rigs to dragon_models

The rig studio SHALL load and save rigs directly against the `dragon_models` table, keyed by variant × stage. The pick tab SHALL list `dragon_models` rows labeled with variant name and stage instead of `model_configs` rows. Creating a new rig SHALL require selecting an existing `dragon_variants` row and a stage before authoring. The save action (`saveDragonRigAction` in `app/admin/_lib/actions.ts`) SHALL write only the rig fields — `stl_key`, `groups`, `model_rotation` — and SHALL NOT write `role_tags`. Auth SHALL be validated before every write.

#### Scenario: Save round-trip through dragon_models

- **WHEN** an admin edits a rig for variant V at stage S and saves
- **THEN** the `dragon_models` row for (V, S) holds the updated `stl_key`, `groups`, and `model_rotation`, its `role_tags` value is unchanged, and reloading the studio for (V, S) renders the saved rig

#### Scenario: New rig requires a variant and stage

- **WHEN** an admin starts a new rig from the pick tab
- **THEN** the studio requires choosing a variant and stage, and the first save creates the `dragon_models` row for that pair

### Requirement: groups schema is carried verbatim

Rig data in `dragon_models` SHALL be byte-equivalent JSON to what the studio authors: segment membership, node assignments, per-joint angle caps, and `model_rotation` are stored with no transformation, renaming, or field pruning.

#### Scenario: Rig renders identically after reload

- **WHEN** a rig is authored, saved to `dragon_models`, and reloaded by the studio or the static renderer
- **THEN** segment grouping, node positions, and angle caps are identical to what was authored

### Requirement: Studio stepper includes an Animate step

The studio stepper (`SidebarShell`) SHALL present three steps in order: Pick (`/admin/pick`), Group (`/admin/group`), and Animate (`/admin/animate`). The Animate step SHALL be enabled only once the loaded rig has groups.

#### Scenario: Animate step gated on groups

- **WHEN** a rig has no groups
- **THEN** the Animate step is disabled

#### Scenario: Animate step reachable after grouping

- **WHEN** the loaded rig has groups
- **THEN** the stepper shows step 3 "Animate" enabled, navigating to `/admin/animate`

