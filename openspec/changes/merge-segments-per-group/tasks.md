## 1. Build the merge helper

- [x] 1.1 In `app/game/AnimatedModel.tsx`, add a helper function `mergeGroupPositions(segments: SegmentData[]): Float32Array` that allocates a single `Float32Array` sized to the sum of `s.positions.length` and copies each segment's positions into it via `.set(positions, offset)`.
- [x] 1.2 Add a `useMergedGeometry(segments: SegmentData[]): THREE.BufferGeometry` hook (or inline `useMemo`) that calls `mergeGroupPositions`, creates a new `THREE.BufferGeometry`, sets the `position` attribute as a `BufferAttribute` over the merged array with itemSize 3, calls `computeVertexNormals()`, and returns the geometry.
- [x] 1.3 `npx tsc --noEmit` passes.

## 2. Refactor GroupBody to render a single merged mesh

- [x] 2.1 Change `GroupBody` to resolve its segments from the `segmentMap` (using `group.segmentIds`) into a memoized `SegmentData[]` array (skipping any unresolved ids). Implementation: extracted to a shared `useGroupSegments` hook.
- [x] 2.2 If the resolved array is empty, render no mesh for that group (return only the optional node-sphere overlay). Implementation: `MergedGroupMesh` returns `null` when `segments.length === 0`, `GroupBody` still renders `GroupNodeSpheres` when `showNodes`.
- [x] 2.3 Otherwise, call `useMergedGeometry` to produce a single merged `BufferGeometry`, and render one `<mesh geometry={merged}><meshStandardMaterial ... /></mesh>` with the group's color and existing material properties.
- [x] 2.4 Remove the per-segment `<SegmentMesh>` mapping inside `GroupBody`. Implementation: `SegmentMesh` deleted entirely — `StaticPosedModel` now uses the same merged path via `StaticGroupBody` + `MergedGroupMesh`.
- [x] 2.5 `npx tsc --noEmit` passes.

## 3. Verify AnimatedModel's ChainNode path

- [x] 3.1 Confirm `ChainNode` still wraps each group's `<GroupBody>` in its pivot / inner / outer groups exactly as before. No changes to ChainNode's structure or props.
- [x] 3.2 Confirm `pivotsRef.current` still gets populated with one entry per chain-member group (the pivot ref points to the rotating inner group, not the merged body mesh). The `ref` callback on the inner pivot group is unchanged.
- [x] 3.3 `npx tsc --noEmit` passes.

## 4. Apply the same merge to StaticPosedModel

- [x] 4.1 In `StaticPosedModel`, replace its per-segment `<SegmentMesh>` mapping with the same `GroupBody`-style merged render, respecting its `opacity` prop. Implementation: new `StaticGroupBody` component delegates to `MergedGroupMesh` with the model-level `opacity`.
- [x] 4.2 `opacity` is per-call (model-level), applied to the single merged material per group — no semantic loss.
- [x] 4.3 `npx tsc --noEmit` passes.

## 5. Browser verification

- [ ] 5.1 Hard-refresh `/admin/animate` with a real two-hip rig loaded. Confirm the initial freeze is shorter (target: subjectively unblocked within ~1s on the dev server).
- [ ] 5.2 Confirm the rig renders identically — same colors, no missing/extra geometry, lighting looks the same.
- [ ] 5.3 Confirm animation still works: click the floor, the head tracks, the cascade bends, the legs apply per-frame pose updates, feet step on large turns.
- [ ] 5.4 Confirm `showNodes` still renders all node spheres correctly.
- [ ] 5.5 Switch to the Calibrate tab and confirm the per-group rotation preview still works (each group's pivot still rotates independently when the calibrate slider is moved).
- [ ] 5.6 Visit `/admin/group` and confirm segment selection still works — the page uses `StaticPosedModel`. Per-segment picking may be unaffected if `/admin/group` uses overlay logic that doesn't rely on per-segment meshes; if the merge breaks picking there, fall back to leaving `StaticPosedModel` on per-segment meshes for that page only (gate by a prop).
- [ ] 5.7 Re-run the Firefox Performance trace from the symptom report. Confirm the wide bars in the r3f Fiber reconciler stack have shrunk substantially and GC time has dropped well below 16%.

## 6. Optional follow-up (out of scope but noted)

- [ ] 6.1 (deferred) If the Performance trace still shows significant cost in `GroupNodeSpheres`, convert it to use `InstancedMesh` — open a separate change.

## 7. Validate the OpenSpec change

- [x] 7.1 Run `openspec validate merge-segments-per-group --strict` and resolve reported issues.
- [x] 7.2 Run `openspec status --change merge-segments-per-group` and confirm all artifacts are `done`.
