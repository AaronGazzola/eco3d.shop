## ADDED Requirements

### Requirement: Static renderer lives in a locomotion-free module

`StaticPosedModel`, `PosedDragon`, and their helpers (`mergeGroupPositions`, `useMergedGeometry`, `useGroupSegments`, `useModelFit`, `partitionSegmentsByColor`, `collectNodes`, `MergedGroupMesh`, `StaticGroupBody`, `RoleColoredGroupBody`) SHALL move from `app/game/AnimatedModel.tsx` into `app/game/StaticDragon.tsx` with unchanged rendering behavior. The module SHALL import nothing from any locomotion, physics, or simulation package. `AnimatedModel.tsx` and its `AnimatedModel` export SHALL be deleted.

#### Scenario: Dragon detail page renders unchanged

- **WHEN** `app/game/dragons/[id]/page.tsx` renders `PosedDragon` for an existing dragon after the refactor
- **THEN** the rendered output (geometry merge, phenotype coloring, fit/centering) is identical to before the split

#### Scenario: No physics in the import graph

- **WHEN** the import graph of `app/game/StaticDragon.tsx` is traversed
- **THEN** it contains no module from `app/game/locomotion/`, `@dimforge/rapier3d-compat`, `@react-three/rapier`, or `@mujoco/mujoco`

### Requirement: Pure skeleton-tree utilities are preserved

`buildSkeletonTree`, `flattenSkeleton`, and the `SkeletonNode` type SHALL move from `app/game/locomotion/chain.ts` to `app/game/skeleton.ts` as pure functions over the authored `groups` rig data, with no physics imports. They SHALL produce the same tree for a given rig as before the move.

#### Scenario: Skeleton derivation survives locomotion deletion

- **WHEN** `app/game/locomotion/` has been deleted and `buildSkeletonTree` is called with an authored rig's groups
- **THEN** it returns the same head→tail axial chain with leg attachments and per-joint angle caps as the pre-deletion implementation

### Requirement: Retired surfaces are removed

The following SHALL be deleted with no replacement: `app/game/locomotion/**`, `app/admin/animate/**`, `app/HomeScene.tsx`, `app/EggMesh.tsx`, `app/HatchingDragon.tsx`, the `useGameStore` game-phase store in `app/page.stores.ts`, the `GamePhase` types in `app/page.types.ts`, `listDragonConfigsAction` in `app/page.actions.ts`, `scripts/observe-*`, `scripts/locomotion-*`, `scripts/mujoco/**`, the deps `@dimforge/rapier3d-compat`, `@react-three/rapier`, `@mujoco/mujoco`, and the related wasm handling in `next.config.ts`. `app/page.tsx` SHALL render a minimal static landing page (existing layout and auth-aware header preserved, no 3D scene, no data dependency).

#### Scenario: Home page is a static landing

- **WHEN** a visitor loads `/`
- **THEN** a static landing page renders with the existing header, no egg/hatch game, and no locomotion or game-store imports

#### Scenario: Clean build with no retired references

- **WHEN** `npm run build` runs after the deletions
- **THEN** it passes, and searching the app source for `locomotion`, `AnimatedModel`, `mujoco`, or `rapier` yields no matches outside openspec history
