# dragon-rendering Specification

## Purpose

Static, physics-free rendering of a rigged dragon (merged group geometry, phenotype coloring, model fit) and the pure skeleton-tree utilities derived from the authored rig.

## Requirements

### Requirement: Static renderer lives in a locomotion-free module

`StaticPosedModel`, `PosedDragon`, and their helpers (`mergeGroupPositions`, `useMergedGeometry`, `useGroupSegments`, `useModelFit`, `partitionSegmentsByColor`, `collectNodes`, `MergedGroupMesh`, `StaticGroupBody`, `RoleColoredGroupBody`) SHALL live in `app/game/StaticDragon.tsx`. The module SHALL import nothing from any locomotion, physics, or simulation package.

#### Scenario: Dragon detail page renders the static model

- **WHEN** `app/game/dragons/[id]/page.tsx` renders `PosedDragon` for an existing dragon
- **THEN** the rendered output applies geometry merge, phenotype coloring, and fit/centering with no physics dependency

#### Scenario: No physics in the import graph

- **WHEN** the import graph of `app/game/StaticDragon.tsx` is traversed
- **THEN** it contains no module from `@dimforge/rapier3d-compat`, `@react-three/rapier`, or `@mujoco/mujoco`

### Requirement: Pure skeleton-tree utilities

`buildSkeletonTree`, `flattenSkeleton`, and the `SkeletonNode` type SHALL live in `app/game/skeleton.ts` as pure functions over the authored `groups` rig data, with no physics imports. They SHALL produce a head→tail axial chain with leg attachments and per-joint angle caps.

#### Scenario: Skeleton derived from an authored rig

- **WHEN** `buildSkeletonTree` is called with an authored rig's groups
- **THEN** it returns the head→tail axial chain with leg attachments and per-joint angle caps for that rig

### Requirement: Home page is a static landing

`app/page.tsx` SHALL render a static landing page (existing layout and auth-aware header preserved, no 3D scene, no data dependency).

#### Scenario: Landing renders without a game scene

- **WHEN** a visitor loads `/`
- **THEN** a static landing page renders with the existing header and no 3D game scene
