## Context

`AnimatedModel.tsx` and `StaticPosedModel.tsx` render each `SegmentData` entry as its own `<SegmentMesh>` React component, which in turn instantiates a `THREE.BufferGeometry`, sets the position attribute, and calls `computeVertexNormals()`. The rig has ~156 segments distributed across ~15 body groups; render is one fiber + one BufferGeometry per segment.

Profiling showed initial mount freezes the page for multiple seconds. 65% of samples were inside r3f's Fiber reconciler commit-phase functions; 16% in GC. Component count and per-mount geometry setup is the cost. The locomotion `useFrame` is not implicated (verified by bisection — fully disabling it does not eliminate the freeze).

Segments within a body group share a color and a material; they're not animated independently. The split exists because the studio's `/admin/group` step lets users assign individual mesh segments to groups one at a time. At runtime, the per-segment granularity provides nothing.

## Goals / Non-Goals

**Goals:**

- Reduce mounted mesh component count from ~156 (one per segment) to ~15 (one per group) by merging each group's segments into a single `BufferGeometry`.
- Keep the merged geometry computation in a `useMemo` so it runs once per group, not every render.
- Preserve all visual behavior: same colors, same triangle layout, same lighting (vertex normals computed identically).
- Preserve the existing scene-graph structure that the animation system depends on: ChainNode pivots, the leg-rendering pipeline, the position/quaternion writes in `applyLegBone`, foot markers, etc. The only change is the *contents* of `GroupBody`.

**Non-Goals:**

- Changing per-frame animation behavior. Step pipeline, projection, foot state, slerp, leg bone rendering — all untouched.
- Changing data shapes outside the renderer. `SegmentData`, `BodyGroup`, `ModelConfigRow` keep their existing shapes. The merge happens at render time.
- Merging across body groups. Different groups have different colors and need separate materials; merging them would break the existing per-group color rendering.
- Changing how the studio's `/admin/group` step builds segments. That flow still operates on individual segments; only the runtime rendering merges them.
- Pre-computing merged buffers on the server / in the database. The merge is a render-time `useMemo` keyed on the segment list. Server data shape is unchanged.
- Modifying `useLocomotion.ts` or any locomotion module.

## Decisions

**Decision 1: Merge at render time via `useMemo`, not at data-load time.**

The merge produces a `BufferGeometry` whose positions are the concatenation of all the group's segments' `Float32Array` position buffers. This is cheap (a single `Float32Array` allocation sized to the sum of segment lengths, plus a series of `.set()` copies — O(total vertices), runs once per group when the segment list changes). Doing it at render time means we don't need to change the data layer or invalidate cached server data; the change is fully contained in the rendering layer.

Alternative considered: pre-merge at config-save time, store merged buffers in the database. Rejected because (a) it requires a server schema change, (b) it complicates the `/admin/group` editing flow (which mutates segment assignments interactively), (c) the runtime cost of merging is small and only happens once per group lifecycle.

**Decision 2: Geometry construction stays inside a per-group React component.**

Each group gets a small wrapping component (a refactored `GroupBody`) that builds its merged geometry in a `useMemo` keyed on the array of segment data resolved from `segmentIds`. The component still renders a single `<mesh>` with the merged geometry and the group's color material — same shape as before, just one mesh per group instead of one per segment.

Alternative considered: lift the merge to a top-level `useMemo` in `AnimatedModel` that produces a `Map<groupId, BufferGeometry>`. Rejected because the per-group wrapper keeps the merge co-located with its usage and avoids fanning out the data structure. The performance difference between the two approaches is negligible since each is `useMemo`-cached.

**Decision 3: `computeVertexNormals()` runs once on the merged geometry, not once per segment.**

The original code calls `computeVertexNormals` per segment (once per `SegmentMesh` mount). The merged version computes normals on the concatenated positions in one pass. Result is identical — normal computation is local to each triangle, and concatenating triangles before computing normals produces the same per-vertex normals as concatenating after. The cost is the same total work but happens once per group instead of once per segment, and within a single allocated buffer (better cache behavior).

**Decision 4: The merge key is the resolved segment data array, not just `segmentIds`.**

The `useMemo` dependency is `[segmentArray]` where `segmentArray` is derived from `segmentIds` via the `segmentMap`. This way, if a segment's position buffer is replaced (e.g., re-loaded STL), the merge invalidates. If only the `segmentIds` membership changes (e.g., user reassigns a segment to a different group), it also invalidates. We use array reference equality, so the parent must memoize the segment-resolution step or every render rebuilds the geometry. The parent already does this via `segmentMap` and the group iteration — the array we pass into the memo is a stable derivation given stable inputs.

**Decision 5: Node spheres are unchanged.**

`GroupNodeSpheres` already renders many small spheres for visualizing node positions. Each is a tiny `<mesh>` with `sphereGeometry`. These are debug visualizations; they're not part of the per-segment count being merged. They stay as-is because (a) they're already keyed by node, not segment, (b) they're often toggled off in production, (c) merging spheres of varying positions is more complex than merging triangle soups (would need per-instance transforms — InstancedMesh, a larger refactor).

A follow-up change can convert `GroupNodeSpheres` to `InstancedMesh` if it remains a hot spot after this change.

**Decision 6: Foot markers and attractor marker are unchanged.**

These are single-mesh primitives (one ring + one circle for attractor; one sphere per foot marker, max 4). They're not part of the per-segment count and don't merit merging.

## Risks / Trade-offs

- **Risk: vertex normals differ subtly from per-segment normals if segments share borders.** → Normals are computed face-local on the input position triangle list. Concatenating two segments' positions then computing normals produces identical normals to computing them separately *unless* triangles span across the concatenation boundary — which they don't (each segment contributes its own triangles, no triangles span segments). Verified by construction.

- **Risk: merging breaks raycasting (click-to-pick) on individual segments.** → The runtime rig doesn't pick segments; the only `onClick` on the scene is the floor plane for setting the attractor (`AnimateScene.tsx`), and it remains a separate mesh. The studio's `/admin/group` flow does pick individual segments, but it uses `StaticPosedModel` with `opacity` props per-group and per-segment selection state — verify the change keeps the group-selection picking semantics that `/admin/group` relies on. **Mitigation**: scope the merge to render paths used by `AnimateScene` first; keep `/admin/group`'s render path on per-segment meshes initially. Split into two phases in tasks.md if needed.

- **Risk: a group with very many segments produces a very large `BufferGeometry`, exceeding GPU buffer size limits.** → Modern GPUs support buffers in the tens of MB. A worst-case group with 50 segments × 1000 triangles = 50,000 triangles = 150,000 vertices = 1.8MB. Well within limits.

- **Risk: GroupBody now re-renders the merged mesh whenever its memo key changes.** → Acceptable. The memo key only changes when segments are reassigned (rare, edit-time only). At animation time the memo holds.

- **Trade-off: merged geometry can't be selectively hidden/styled per segment.** → Acceptable. We don't have a use case that requires it. Per-segment selection lives in `/admin/group` and is solved differently (selection state + opacity).

- **Trade-off: the first render after a group's segments change does extra work (merging).** → One-time cost amortized over many subsequent frames. Net positive even ignoring the mount-freeze fix.

- **Risk: r3f's render scheduler interacts with the `useMemo`-built `BufferGeometry` and disposes it incorrectly on unmount.** → The original code already creates `BufferGeometry` via `useMemo` and relies on r3f's automatic dispose. The merged version uses the identical pattern. No new lifecycle concerns.

## Migration Plan

The change is purely additive on the rendering side. No data migrations, no server changes, no API changes. Roll it out by:

1. Land the merged-geometry refactor in `AnimatedModel.tsx`.
2. Hard-refresh `/admin/animate` to confirm the freeze is gone.
3. Verify in `/admin/group` that segment selection / display still works (StaticPosedModel path).
4. If anything regresses, revert the single file.

No feature flag needed; the change is fast to revert.
