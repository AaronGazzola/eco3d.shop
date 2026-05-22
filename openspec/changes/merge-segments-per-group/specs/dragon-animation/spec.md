## ADDED Requirements

### Requirement: One merged mesh per body group at render time

For each `BodyGroup` rendered by `AnimatedModel` and `StaticPosedModel`, the renderer SHALL emit a single `<mesh>` whose `BufferGeometry` contains the concatenation of all that group's segments' position arrays as a single `Float32Array` attribute. Per-segment `<SegmentMesh>` components SHALL NOT be emitted. Vertex normals SHALL be computed once per merged geometry.

#### Scenario: Group with multiple segments
- **WHEN** a `BodyGroup` contains N segments and the model is rendered
- **THEN** exactly one `<mesh>` is emitted for that group
- **AND** the mesh's `BufferGeometry` position attribute is a single `Float32Array` of length equal to the sum of all N segments' position-array lengths
- **AND** the position attribute's contents are the concatenation of the segments' position arrays in the order given by `BodyGroup.segmentIds`
- **AND** the mesh material color matches `BodyGroup.color`

#### Scenario: Group with a missing segment
- **WHEN** a `BodyGroup` references a `segmentId` not present in the resolved `segmentMap`
- **THEN** that segment is skipped (excluded from the merged buffer)
- **AND** the remaining present segments are still merged into the group's single mesh

#### Scenario: Group with zero present segments
- **WHEN** a `BodyGroup`'s `segmentIds` resolve to an empty array
- **THEN** the renderer SHALL emit no mesh for that group (no zero-length geometry)

### Requirement: Geometry merge is memoized on segment data

The merged `BufferGeometry` SHALL be constructed inside a React `useMemo` whose dependencies include the resolved segment data array for that group. The merge SHALL NOT re-run on every render — only when the group's segment list or any of its segments' position buffers change.

#### Scenario: Stable inputs, multiple renders
- **WHEN** a group's segment list and segments' position buffers do not change across N renders
- **THEN** the `useMemo` returns the same `BufferGeometry` instance for all N renders
- **AND** no new `Float32Array` is allocated for the merged buffer

#### Scenario: Segment reassignment in studio
- **WHEN** a user modifies a group's `segmentIds` in the studio
- **THEN** the `useMemo` recomputes the merged geometry on the next render of that group
- **AND** the new mesh reflects the updated segment list

### Requirement: Animation, picking, and scene-graph behavior preserved

The merged-geometry rendering SHALL NOT change the scene-graph structure used by the animation system (`ChainNode` pivots, the inner/outer position groups, the per-leg pivot mapping in `pivotsRef`). The `useLocomotion` hook SHALL continue to operate identically — no per-frame code is modified by this change.

#### Scenario: Animation still runs
- **WHEN** the rig is rendered with the merged-geometry change and an attractor is set
- **THEN** the cascade rotates, the head tracks, the legs apply per-frame pose updates, and feet step
- **AND** the visible behavior is identical to before the merge

#### Scenario: Attractor click still works
- **WHEN** the user clicks the floor in the animate scene
- **THEN** the floor's invisible plane mesh continues to receive the click and set the attractor
- **AND** the per-group merged meshes do not intercept the click any differently than the previous per-segment meshes did

### Requirement: Node-sphere debug overlay is unchanged

`GroupNodeSpheres` and the static-model node spheres SHALL continue to render as individual primitives keyed by node, unchanged by this refactor.

#### Scenario: showNodes enabled
- **WHEN** the model is rendered with `showNodes={true}`
- **THEN** each node continues to render as its own small sphere mesh in the same colors as before
- **AND** the merge applies only to the segment body geometry, not to the node overlay
