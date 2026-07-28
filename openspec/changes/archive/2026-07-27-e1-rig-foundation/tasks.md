## 1. Governance cleanup

- [x] 1.1 Delete stale locomotion OpenSpec change directories: `openspec/changes/add-locomotion-isolation-harness/`, `add-mujoco-studio-locomotion/`, `add-stance-phase-spine-drive/`, `validate-articulated-locomotion-mujoco/`

## 2. Extract survivors from the locomotion graph

- [x] 2.1 Create `app/game/skeleton.ts` with `buildSkeletonTree`, `flattenSkeleton`, `SkeletonNode` moved verbatim from `app/game/locomotion/chain.ts` (strip any physics imports)
- [x] 2.2 Create `app/game/StaticDragon.tsx` with `StaticPosedModel`, `PosedDragon`, and the helpers `mergeGroupPositions`, `useMergedGeometry`, `useGroupSegments`, `useModelFit`, `partitionSegmentsByColor`, `collectNodes`, `MergedGroupMesh`, `StaticGroupBody`, `RoleColoredGroupBody` moved verbatim from `app/game/AnimatedModel.tsx`
- [x] 2.3 Repoint imports: `app/HatchingDragon.tsx` (temporary, deleted in 4.x) and `app/game/dragons/[id]/page.tsx` to `@/app/game/StaticDragon`; verify `npm run build` passes

## 3. Delete locomotion

- [x] 3.1 Delete `app/game/locomotion/` (all 13 files), `app/game/AnimatedModel.tsx`, `app/admin/animate/` (all 7 files)
- [x] 3.2 Delete `scripts/observe-*.mjs`, `scripts/.observe-auth.json`, `scripts/locomotion-*.ts`, `scripts/mujoco/` (including cached `*-mujoco.json`)
- [x] 3.3 Remove `@dimforge/rapier3d-compat`, `@react-three/rapier`, `@mujoco/mujoco` from `package.json`; remove mujoco/rapier wasm handling from `next.config.ts`; run `npm install`
- [x] 3.4 Remove links/routes referencing `/admin/animate` from admin navigation; verify `npm run build` passes and `rg -i "locomotion|AnimatedModel|mujoco|rapier" app/ scripts/ next.config.ts` returns no matches

## 4. Delete the egg-hatch home game

- [x] 4.1 Delete `app/HomeScene.tsx`, `app/EggMesh.tsx`, `app/HatchingDragon.tsx`, `app/page.stores.ts`, and the `GamePhase` types in `app/page.types.ts`
- [x] 4.2 Delete `listDragonConfigsAction` from `app/page.actions.ts` (delete the file if empty)
- [x] 4.3 Rewrite `app/page.tsx` as a minimal static landing (existing layout + auth-aware header, product statement copy, no 3D scene, no data fetch); verify `npm run build` passes

## 5. Unify rig persistence on dragon_models

- [x] 5.1 In `app/admin/_lib/actions.ts`: replace `saveModelConfigAction` with `saveDragonModelAction` (upsert `stl_key`, `groups`, `model_rotation` on the `dragon_models` row for the given id; never write `role_tags`; validate auth) and `listModelConfigsAction` with `listDragonModelsAction` (rows joined with variant name + stage)
- [x] 5.2 Update `app/admin/_lib/sharedStore.ts` and `app/admin/_lib/hooks.ts` (`useSaveConfig`, load path) to carry a `dragon_models` id + variant/stage instead of a `model_configs` id
- [x] 5.3 Update `app/admin/pick/` to list `dragon_models` rows labeled "variant — stage" and to create a new rig by selecting an existing `dragon_variants` row + stage (insert the row on first save)
- [x] 5.4 Update `app/admin/dragons/[variantId]/models/page.actions.ts`: remove `listModelConfigsForCreateAction` and the copy-from-config insert path (models are now authored directly in the studio); link "edit rig" from the models list into the studio
- [x] 5.5 Repoint `scripts/seed-dragon-genetics.ts` and `scripts/dump-rig-geometry.ts` from `model_configs` to `dragon_models`
- [ ] 5.6 Verify studio round-trip against the remote DB: load an existing `dragon_models` rig, edit an angle cap, save, reload — rig renders identically and `role_tags` unchanged

## 6. Drop model_configs

- [x] 6.1 Create `scripts/audit-model-configs.ts`: list every `model_configs` row whose `stl_key` has no `dragon_models` counterpart; run it against the remote DB
- [x] 6.2 Resolve any orphans (attach worth-keeping rigs to a variant/stage via the studio; confirm the rest discardable) until the audit reports zero
- [x] 6.3 Create migration via `npx supabase migration new drop_model_configs` (drop table `model_configs`), push with `npx supabase db push`, regenerate `supabase/types.ts`
- [x] 6.4 Verify `npm run build` passes and `rg "model_configs" app/ scripts/ supabase/types.ts` returns no matches

## 7. Spec housekeeping

- [x] 7.1 Delete `openspec/specs/locomotion/` (retired capability; delta spec in this change records the removal)
