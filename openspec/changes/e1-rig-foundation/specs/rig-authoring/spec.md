## ADDED Requirements

### Requirement: Rig authoring pipeline is preserved verbatim

The admin studio SHALL retain the full rig-authoring pipeline unchanged in behavior: STL import via `useStlLoader` (fetch from `/api/r2`, parse with STLLoader), segment detection in `segmentDetector.worker.ts`, segment grouping and node-skeleton assignment (node types front/back/hipLeft/hipRight/foot) in `app/admin/group/**`, per-joint angle caps, and model rotation. The segmentation worker, `groupStore`, `GroupScene`, `NodeOverlay`, and `sharedStore` group/selection logic SHALL NOT be functionally modified by this change.

#### Scenario: Authoring flow unchanged after refactor

- **WHEN** an admin loads a rig in the studio, adjusts a joint's angle cap, and reassigns a segment to another group
- **THEN** the editing behavior is identical to before this change, and the resulting `groups` JSON has the same shape (segment membership, node assignments, angle caps) as previously authored rigs

### Requirement: Studio persists rigs to dragon_models

The rig studio SHALL load and save rigs directly against the `dragon_models` table, keyed by variant × stage. The pick tab SHALL list `dragon_models` rows labeled with variant name and stage instead of `model_configs` rows. Creating a new rig SHALL require selecting an existing `dragon_variants` row and a stage before authoring. The save action (`saveDragonModelAction`, replacing `saveModelConfigAction` in `app/admin/_lib/actions.ts`) SHALL write only the rig fields — `stl_key`, `groups`, `model_rotation` — and SHALL NOT write `role_tags`. Auth SHALL be validated with `auth.getUser()` before every query.

#### Scenario: Save round-trip through dragon_models

- **WHEN** an admin edits a rig for variant V at stage S and saves
- **THEN** the `dragon_models` row for (V, S) holds the updated `stl_key`, `groups`, and `model_rotation`, its `role_tags` value is unchanged, and reloading the studio for (V, S) renders the saved rig

#### Scenario: New rig requires a variant and stage

- **WHEN** an admin starts a new rig from the pick tab
- **THEN** the studio requires choosing a variant and stage, and the first save creates the `dragon_models` row for that pair

### Requirement: groups schema is carried verbatim into the unified table

Rig data moving from `model_configs` to `dragon_models` SHALL be byte-equivalent JSON: segment membership, node assignments, per-joint angle caps, and `model_rotation` are copied with no transformation, renaming, or field pruning.

#### Scenario: Migrated rig renders identically

- **WHEN** a rig previously authored in `model_configs` is present in `dragon_models` and loaded by the studio or the static renderer
- **THEN** segment grouping, node positions, and angle caps are identical to the original

### Requirement: model_configs is dropped only after a clean audit

A script `scripts/audit-model-configs.ts` SHALL list every `model_configs` row whose `stl_key` has no `dragon_models` counterpart. The migration dropping `model_configs` SHALL be pushed only when the audit reports zero orphans. All remaining code references to `model_configs` (`listModelConfigsAction`, `listDragonConfigsAction`, `listModelConfigsForCreateAction`, the create-model copy source, and scripts `seed-dragon-genetics.ts`, `dump-rig-geometry.ts`, `scripts/mujoco/dump-groups.ts`) SHALL be deleted or repointed to `dragon_models` before the drop.

#### Scenario: Audit gates the drop

- **WHEN** the audit script reports one or more orphaned `model_configs` rows
- **THEN** the drop migration is not pushed until each orphan is either attached to a variant/stage via the create-model flow or confirmed discardable

#### Scenario: No dangling references after the drop

- **WHEN** the drop migration has been pushed and `supabase/types.ts` regenerated
- **THEN** the codebase contains no reference to `model_configs` and `npm run build` passes
