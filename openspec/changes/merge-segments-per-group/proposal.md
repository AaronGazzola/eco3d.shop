## Why

Initial mount of the `/admin/animate` page (and any other page rendering the rig) freezes the browser for several seconds. A Firefox Performance trace shows 65% of samples (~9,130) inside the react-three-fiber Fiber reconciler's commit-phase functions and 16% in GC — the cost is structural: r3f is mounting roughly 200+ mesh fibers (one `<SegmentMesh>` per rig segment ≈ 156, plus ~60 node spheres, plus 4 foot markers). Each mounted mesh allocates a `BufferGeometry`, sets the position attribute, calls `computeVertexNormals()`. React Strict Mode in dev doubles all of it. The freeze is reproducible regardless of whether the locomotion `useFrame` runs — git-stashing all recent animation work still produces the same freeze, confirming the cost is in component count + per-mount geometry setup, not in any per-frame code.

The rig already groups segments by body part (head, spine, spine-2, …, leg-left, leg-right, tail). Visually, every segment within a single group shares the same color and is rendered with the same material. The split into one mesh per segment is incidental data structure, not a rendering requirement.

## What Changes

- Replace the per-segment `<SegmentMesh>` render with one merged `BufferGeometry` per `BodyGroup`. The merged geometry concatenates all of that group's segments' position arrays into a single `Float32Array`, sets it as the position attribute once, computes vertex normals once.
- One `<mesh>` per group instead of one per segment. With the current rig (~15 groups, ~156 segments) this is roughly a 10× reduction in mesh component count.
- The merge happens in a `useMemo` keyed on the group's `segmentIds` array and the resolved segment data — recomputed only when a group's segment list changes (which is rare; it happens during `/admin/group`'s editing flow, not during animation).
- `StaticPosedModel` (the non-animated renderer used elsewhere — preview tile, hatching) gets the same treatment.
- `AnimatedModel` keeps its scene-graph structure unchanged (ChainNode pivots, the leg-rendering pipeline, etc.). The only change is *what's inside* each `GroupBody`.
- Behavioral invariants preserved: each group's color stays per-group (already grouped); the segment ids list still drives which triangles end up in the merged buffer; the rig still renders identically.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dragon-animation`: rendering performance characteristic changes — initial mount cost drops by ~10× via geometry merging per body group. No visible rig behavior changes. No animation behavior changes. Per-frame work is untouched.

## Impact

- `app/game/AnimatedModel.tsx` — `SegmentMesh`/`GroupBody`/`GroupNodeSpheres`/`StaticPosedModel` are restructured to merge per-group geometry. The number of `<mesh>` elements rendered drops from one-per-segment to one-per-group.
- No changes to `app/game/locomotion/*` — the per-frame loop, the projection, foot state, leg rendering are all unaffected.
- No changes to data shape — `SegmentData.positions` is still `Float32Array`, `BodyGroup.segmentIds` is still a string array.
- No new dependencies.
- Dev-mode mount time should drop dramatically; production build should also benefit but by a smaller factor (StrictMode double-mount only happens in dev).
- No regression on the leg-pair/foot-marker rendering path (those meshes are not part of the per-segment count being merged — they're individual primitives outside `GroupBody`).
