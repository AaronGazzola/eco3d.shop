# E1 Rig Foundation — Design

## Context

Two rig tables exist with near-identical shape. `model_configs` (`stl_key`, `groups`, `model_rotation`, `name`, `user_id`) is the rig studio's save target via `saveModelConfigAction` (app/admin/_lib/actions.ts). `dragon_models` (`stl_key`, `groups`, `model_rotation`, `role_tags`, `stage`, `variant_id`) is what the game and genetics layers read; rows are created by copying a `model_config`'s rig verbatim (app/admin/dragons/[variantId]/models/page.actions.ts). The locomotion program (~4k lines in app/game/locomotion/, the animate studio, three physics deps) and the egg-hatch home game are retired per docs/roadmap.md. `AnimatedModel.tsx` mixes the retired animated renderer (locomotion imports) with the static renderer (`StaticPosedModel`, `PosedDragon`, merge/fit helpers) that live pages depend on.

## Goals / Non-Goals

**Goals:**

- One rig table (`dragon_models`) authored directly by the studio; `model_configs` dropped with zero rig data loss.
- Zero locomotion/physics imports reachable from any surviving module; three physics deps removed.
- Static renderer isolated in its own module; pure skeleton-tree utilities preserved for AZ-184.
- Repo governance restored: no stale locomotion OpenSpec changes, `locomotion` spec retired.

**Non-Goals:**

- No pose-cycle animation (AZ-184, next change).
- No new home-page product design — the landing page is a minimal static placeholder until E3.
- No genetics, tycoon, or commerce work; no changes to `dragon_variants`, genetics tables, or role-tagging behavior.
- No mesh-merge performance work (AZ-34 stays in the backlog).

## Decisions

- **Studio saves to `dragon_models` keyed by variant × stage.** The pick tab lists `dragon_models` rows (joined with variant name + stage) instead of `model_configs`. Creating a new rig requires choosing an existing variant and stage up front. Rationale: the copy step between the two tables is the only reason both exist; every downstream reader already uses `dragon_models`. Alternative (keep `model_configs` as a scratch space) rejected: it recreates the drift this change exists to remove.
- **Studio save writes rig fields only** (`stl_key`, `groups`, `model_rotation`) — never `role_tags`, which remain owned by the TagScene save path. Prevents the studio clobbering genetics authoring.
- **`groups` JSON carried verbatim.** No schema translation anywhere: segment membership, node assignments (front/back/hip/foot), per-joint angle caps, and rotation move as-is. The existing create-model copy already proves shape compatibility.
- **Audit before drop.** A script (`scripts/audit-model-configs.ts`) lists every `model_configs` row whose `stl_key` has no `dragon_models` counterpart. The drop migration is only pushed after the audit reports zero orphans; any orphan worth keeping is first attached to a variant/stage via the existing create-model flow. Rationale: `dragon_models` rows were all seeded from `model_configs`, so orphans are expected to be dead drafts — but we verify instead of assuming.
- **Static renderer moves to `app/game/StaticDragon.tsx`**, containing `StaticPosedModel`, `PosedDragon`, and the module-local merge/fit helpers (`mergeGroupPositions`, `useMergedGeometry`, `useGroupSegments`, `useModelFit`, `partitionSegmentsByColor`, `collectNodes`, `MergedGroupMesh`, `StaticGroupBody`, `RoleColoredGroupBody`). `AnimatedModel.tsx` is then deleted whole. Alternative (edit AnimatedModel.tsx in place) rejected: the file name and history invite locomotion re-entanglement.
- **Skeleton-tree utilities survive.** `buildSkeletonTree`, `flattenSkeleton`, `SkeletonNode` move from `app/game/locomotion/chain.ts` to `app/game/skeleton.ts`, stripped of any physics imports. Rationale: they are pure derivations of the authored rig and are the exact substrate AZ-184's pose cycles need; deleting and re-writing them next change is churn with regression risk on the sacrosanct binding.
- **Stale locomotion changes are deleted, not archived.** Archiving would merge their deltas into a spec being removed; the program is retired wholesale. The `locomotion` spec itself is removed via a delta spec marking every requirement REMOVED, and the spec directory is deleted at archive time.
- **Home page becomes a static landing** (title, short pitch, auth-aware header unchanged). `useGameStore`, `GamePhase`, egg/hatch components, and `listDragonConfigsAction` are deleted with it.

## Risks / Trade-offs

- [Rig data loss on drop] → Audit script gates the drop migration; `groups` copied verbatim with no transformation; remote-only DB means the migration runs once, after audit passes.
- [Hidden importer of a deleted module] → `npm run build` (full type-check) after each deletion phase; grep for `locomotion`, `AnimatedModel`, `model_configs`, `mujoco`, `rapier` before closing.
- [Studio regression on the preserved pipeline] → The segmentation worker, group store, and node overlay are not edited — only the load/save actions change; manual studio smoke (load rig → edit cap → save → reload) is part of verification.
- [AZ-184 needs more of chain.ts than the tree builders] → Acceptable; anything else it needs is authored fresh against the pose-cycle spec.

## Migration Plan

1. Code lands first (studio pointed at `dragon_models`); `model_configs` untouched and unread.
2. Run audit script against the remote DB; resolve any orphans via the create-model flow.
3. Push the `drop table model_configs` migration; regenerate `supabase/types.ts`.

Rollback before step 3 is a git revert; after step 3, restore requires re-creating the table from a dump (acceptable: by then it has no readers).

## Open Questions

None — variant/stage targeting, orphan handling, and skeleton-utility preservation are settled above.
