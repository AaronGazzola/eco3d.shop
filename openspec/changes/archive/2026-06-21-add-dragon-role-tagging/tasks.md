# Tasks — Dragon role tagging (3D model creation + segment→role tagging)

## 1. Types

- [x] 1.1 `app/admin/dragons/[variantId]/models/page.types.ts` and `[modelId]/page.types.ts`: re-export
  `DragonModel`, `DragonModelInsert`, `DragonStage`, `RoleTags`, `DragonRole`, `DragonVariant` from
  `@/app/game/dragons.types`; add `CreateModelInput` (`variantId`, `stage`, `modelConfigId`) and a
  `RoleTagDraft = Record<string, string>` editor type. Reuse `BodyGroup` / `ModelConfigRow` from
  `@/app/admin/_lib/types`.

## 2. Server actions (admin-gated)

- [x] 2.1 `app/admin/dragons/[variantId]/models/page.actions.ts`: `listModelConfigsForCreate` (read `model_configs`:
  id, name, stl_key, groups, model_rotation), `listModelsForVariant(variantId)` (read `dragon_models`),
  and `createModelAction(input)` — admin-gated; copy the chosen config's `stl_key` / `groups` /
  `model_rotation` onto a new `dragon_models` row for `(variant_id, stage)` with empty `role_tags`.
  Surface the `(variant_id, stage)` uniqueness conflict as a friendly error.
- [x] 2.2 `app/admin/dragons/[variantId]/models/[modelId]/page.actions.ts`: `getModelAction(modelId)` (model +
  its variant's `dragon_roles`), `saveRoleTagsAction(modelId, roleTags)` (admin-gated update of
  `role_tags`), and `deleteModelAction(modelId)` (admin-gated). Reuse `checkIsAdminAction`; throw +
  `console.error` on failure, no fallbacks.

## 3. Hooks + stores

- [x] 3.1 `page.hooks.tsx` (both routes): react-query queries (`['dragon-models', variantId]`,
  `['dragon-model', modelId]`, `['model-configs']`) + mutations (create / save tags / delete) that
  invalidate the right keys and toast via `CustomToast`. Loading/error live in the hooks.
- [x] 3.2 `[modelId]/page.stores.ts` (zustand, no `persist`): the `roleTags` draft
  (`Record<string,string>`), the active `roleKey`, the pending segment-id selection, and actions
  (`setActiveRole`, `toggleSegment`, `assignSelectionToActiveRole`, `untagSegment`, `resetDraft`).

## 4. Model list + creator UI

- [x] 4.1 `app/admin/dragons/[variantId]/models/page.tsx` (`AdminGate` retractable-sidebar-gated): given a `variantId` (query param or
  picker), list that variant's stage models with links to the tagging canvas; a creator that picks a
  stage (`DragonStage` enum) and a `model_config`, then calls `createModelAction`. Loading skeletons on
  the data-dependent lists only. Surface "author a model in the studio first" when no configs exist.
- [x] 4.2 Add a link from the variant editor (`app/admin/dragons/[variantId]/page.tsx`) to this
  variant's stage models, so the section is reachable from C's editor.

## 5. 3D tagging canvas UI

- [x] 5.1 `app/admin/dragons/[variantId]/models/[modelId]/page.tsx` (`AdminGate` retractable-sidebar-gated): on mount load the model
  (`getModelAction`) and its STL into segments via `useStlSegments` (the render path's own loader, so segment ids match) (using the model's `stl_key` /
  `model_rotation`); seed the zustand draft from the persisted `role_tags`.
- [x] 5.2 Scene: render segments (reuse `StudioCanvas`); paint each by its draft role colour (untagged =
  neutral); click toggles a segment into the pending selection (highlighted). Derive a stable per-role
  colour map from the variant's roles.
- [x] 5.3 Sidebar: role legend (each role + colour + tagged-segment count), select the active role,
  "Assign selection to <role>", "Untag selection", "Clear selection", and a "Save" button that calls
  `saveRoleTagsAction` with the draft. Show unsaved-changes state.

## 6. Verification

- [x] 6.1 As an admin, create an `adult` model for the `demo` variant from a saved config, tag a few
  segments to each role, save, then confirm `/game/dragons/demo` renders those segments in the
  role colours on reload.
- [x] 6.2 Reopen the saved model and confirm the persisted `role_tags` load as the starting draft.
- [x] 6.3 Confirm gating: a non-admin session does not render the tool and create/save/delete refuse.

## 7. Documentation + validation

- [x] 7.1 Update `documentation/dragon-genetics.md`: role tagging landed; the seed's hand-built
  `role_tags` is superseded by this tool; `stl_key` is immutable on a saved model (re-source = new
  model); point at the remaining `add-dragon-orderability-map` follow-up.
- [x] 7.2 `npx tsc --noEmit` + `npx eslint app/admin/dragons` pass; `npx openspec validate
  add-dragon-role-tagging --strict` passes.
