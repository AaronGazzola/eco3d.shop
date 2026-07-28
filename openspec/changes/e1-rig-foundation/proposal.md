# E1 Rig Foundation

## Why

The 2026-07-26 direction reset (docs/roadmap.md, Linear AZ-183) retires the procedural-locomotion research program and the egg-hatch home game. The rig-authoring pipeline (STL segmentation → grouping → node-skeleton assignment with angle caps) is the sacrosanct foundation everything downstream renders through, but it is currently entangled with ~4k lines of dead locomotion code, a research studio, physics dependencies, and a legacy `model_configs` table that duplicates `dragon_models`. This change extracts and hardens the foundation so the E1 pose-cycle animation layer (AZ-184) and everything after it builds on a clean base.

## What Changes

- **BREAKING** Delete `app/game/locomotion/*` (CPG, MuJoCo runtime, Rapier driver, muscles, diagnostics), the `AnimatedModel` component, and the `app/admin/animate/**` research studio.
- **BREAKING** Delete the egg-hatch home game (`HomeScene`, `EggMesh`, `HatchingDragon`, `useGameStore` game phases); `app/page.tsx` becomes a minimal static landing page.
- Delete locomotion tooling: `scripts/observe-*`, `scripts/locomotion-*`, `scripts/mujoco/*`; remove `@dimforge/rapier3d-compat`, `@react-three/rapier`, `@mujoco/mujoco` deps and the related `next.config.ts` wasm handling.
- Delete the four stale locomotion OpenSpec changes (`add-locomotion-isolation-harness`, `add-mujoco-studio-locomotion`, `add-stance-phase-spine-drive`, `validate-articulated-locomotion-mujoco`) — the program is retired; their unchecked tasks must not linger.
- Split the static renderer (`StaticPosedModel`, `PosedDragon`, merge/fit helpers) out of `AnimatedModel.tsx` into a locomotion-free module; preserve the pure skeleton-tree utilities (`buildSkeletonTree`, `flattenSkeleton`) for the upcoming pose-cycle layer.
- **BREAKING** Unify rig tables: the admin studio saves to `dragon_models` (variant × stage) instead of `model_configs`; the `groups` schema (segment membership, node assignments, angle caps, rotation) is carried verbatim; `model_configs` is dropped after an audit confirms no orphaned rigs.
- Preserve in full: the STL import → segment-detection worker → grouping → node-skeleton assignment pipeline, per-joint angle caps, role tagging, and the `pick`/`group` admin studio UIs.

## Capabilities

### New Capabilities

- `rig-authoring`: the admin studio pipeline (STL import, segment detection, grouping, node-skeleton assignment with angle caps) and its persistence to the unified `dragon_models` table.
- `dragon-rendering`: static posed rendering of a rigged dragon (merged group geometry, phenotype coloring, model fit) with no locomotion or physics dependencies.

### Modified Capabilities

- `locomotion`: removed entirely — every requirement is retired with the program.

## Impact

- `app/game/locomotion/*`, `app/game/AnimatedModel.tsx`, `app/admin/animate/**`, `app/HomeScene.tsx`, `app/EggMesh.tsx`, `app/HatchingDragon.tsx`, `app/page.tsx`, `app/page.stores.ts`, `app/page.types.ts`, `app/page.actions.ts` (delete `listDragonConfigsAction`).
- Admin studio save path: `app/admin/_lib/actions.ts`, `app/admin/_lib/hooks.ts`, `app/admin/_lib/sharedStore.ts`, `app/admin/pick/**`, `app/admin/dragons/[variantId]/models/page.actions.ts`.
- Consumers of the static renderer: `app/game/dragons/[id]/page.tsx`.
- Database: `model_configs` dropped (migration); `dragon_models` becomes the single rig table. Scripts `seed-dragon-genetics.ts` and `dump-rig-geometry.ts` repointed to `dragon_models`.
- `package.json` (three physics deps removed), `next.config.ts`.
