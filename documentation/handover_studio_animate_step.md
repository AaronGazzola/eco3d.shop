# Handover — Studio "Animate" step + perf investigation

## What was built

A third step ("Animate") was added to the Dragon Studio flow. After a user picks a model (step 1) and groups segments + places nodes (step 2), they can click an **Animate →** button at the bottom of the node-assignment panel to enter step 3, where the same dragon they just configured starts animating in the same scene with a sidebar of animation-only controls.

## File map

### New files
- `app/studio/StepAnimate.tsx` — sidebar UI for step 3. Sliders for stiffness, foot angle offset, step threshold, step smoothing, wander radius, wander speed, max speed, follow distance + show-attractor toggle. Excludes anything controlled by node placement (segment count, segment length, body half-width, limb reach, limb-node grid).

### Modified files
- `app/studio/page.types.ts` — added `AnimationConfig` type.
- `app/studio/page.stores.ts` — widened `step` to `1 | 2 | 3`; added `animationConfig`, `showAttractor`, `setAnimationField`, `setShowAttractor`. Both are persisted via `partialize`. Defaults sourced from `CREATURE_DEFAULTS.lizard` (`app/page.constants.ts`).
- `app/studio/StudioSidebar.tsx` — added third step entry, rewrote `canEnterStep` gate (step 3 requires `segments.length > 0 && groups.length > 0`).
- `app/studio/StepGroup.tsx` — primary "Animate →" button at the bottom of the panel, shown whenever `groups.length > 0`.
- `app/studio/StudioScene.tsx` — added `AnimateContent` (renders `<AnimatedModel>` + `<TargetController>` + invisible click plane) and a `StepGate` that swaps between `SceneContent` (steps 1/2) and `AnimateContent` (step 3). Builds a synthetic `ModelConfigRow` from store state and runs it through `modelConfigToCreatureConfig`. Computes `chainOrigin` and `initialJoints` from the placed nodes so the dragon starts in its placed pose at frame 0 (otherwise the chain initializes along +z from world origin and the dragon teleports away from where the nodes were placed).
- `app/page.types.ts` — added optional `chainOrigin?: { x: number; z: number }` and `initialJoints?: { x: number; z: number }[]` to `CreatureConfig`. Both are optional; the home page leaves them undefined and behavior is unchanged there.
- `app/game/useCreature.ts` — uses `config.chainOrigin` for the chain's origin if provided. If `config.initialJoints` is provided, after `Chain3D` construction it overwrites `chain.joints[i]` with the placed joint positions and seeds `headingRef` + `chain.angles[*]` from the joint 0→1 vector so FABRIK starts from a sensible heading.

### Earlier (pre-session) staged changes that were committed alongside
- `app/game/AnimatedModel.tsx`, `app/game/ConfigPanel.tsx`, `app/game/SkeletonScene.tsx`, `app/game/modelConfigToCreatureConfig.ts`, `app/page.stores.ts`, `app/page.tsx`, `app/page.types.ts` — these had been edited before this session began (they were already partially staged in the `git status` snapshot at session start) and form the upstream "per-segment 2-node + animated dragon on home page" work this animate step builds on.

## Outstanding issue: performance lag in step 3

The user reports the studio's step 3 lags heavily once the dragon starts animating, while the home page is "fine."

### What was investigated

Both render paths funnel into the same `<AnimatedModel>` component driven by the same `useCreature` hook — there is no inherent canvas-level perf difference. I identified three candidate causes; **#1 is most likely**, but it was **not confirmed with the user** before the session ended.

### Suspect 1 — apples-vs-oranges comparison (UNCONFIRMED, ASK FIRST)

`SkeletonScene.tsx:61-71` is a fork:

```tsx
{selectedConfig && segments.length > 0 ? (
  <AnimatedModel ... />     // heavy: 1 mesh per STL segment, per group → 100s of draw calls
) : (
  <SkeletonRenderer ... />  // light: ~5 InstancedMeshes
)}
```

`selectedConfig` is **not** in the persist partialize for `useCreatureStore`, so it's `null` on every fresh load until the user clicks an entry in `ModelList`. If the user has been comparing studio step 3 against the home page in its default (no-model-selected) state, they're comparing the heavy `AnimatedModel` path against the light `SkeletonRenderer` path — different scenes, not a fair comparison.

**First action for the next agent:** ask the user whether their "home page is fine" baseline is **with** a saved model picked from `ModelList` (so `<AnimatedModel>` renders) or **without** (so `<SkeletonRenderer>` renders). If without, the studio is performing as expected for `<AnimatedModel>` and the perceived regression is the comparison itself. If they confirm a saved model is selected and home is still smooth, suspect #1 is ruled out and a real studio-specific regression exists — investigate further.

### Suspect 2 — chain rebuilds on every animation slider change (REAL, NOT YET FIXED)

In `app/studio/StudioScene.tsx:238-246`:

```ts
const creatureConfig = useMemo(() => {
  const base = modelConfigToCreatureConfig(modelConfig, segments)  // ← always re-runs
  return { ...base, ...animationConfig, chainOrigin, initialJoints }
}, [modelConfig, segments, animationConfig, ...])
```

Every `animationConfig` change calls `modelConfigToCreatureConfig` again, which returns a **new `segmentLengths` array** (it's built via `chain.map(...)` inside that fn — `app/game/modelConfigToCreatureConfig.ts:51-57`). `useCreature.ts:38` lists `config.segmentLengths` in its effect deps, so it tears down `Chain3D` and `limbStates` and rebuilds them. Every slider tick = chain rebuild = frame hitch.

The home page has the same pattern (`SkeletonScene.tsx:80-83` lists `config` in its deps), but on the home page the panel sliders are no-ops when `selectedConfig` is set (the activeConfig path ignores `config`), so users typically don't notice.

**Fix (safe to apply):** split the memo so the structural derivation is stable across `animationConfig` changes:

```ts
const baseCreatureConfig = useMemo(
  () => modelConfigToCreatureConfig(modelConfig, segments),
  [modelConfig, segments]
)
const creatureConfig = useMemo(() => ({
  ...baseCreatureConfig,
  ...animationConfig,
  chainOrigin: headXZ ?? undefined,
  initialJoints: initialJoints.length > 0 ? initialJoints : undefined,
}), [baseCreatureConfig, animationConfig, headXZ?.x, headXZ?.z, initialJoints])
```

After this, `baseCreatureConfig.segmentLengths` survives spread into `creatureConfig` (object spread preserves the same reference for non-overwritten properties), so `useCreature`'s effect dep is stable when `animationConfig` changes. Only `angleConstraint` (stiffness slider) actually overrides a chain-affecting field, and rebuilding the chain when stiffness changes is correct behavior.

This won't fix the perceived idle lag if there's no slider interaction, but it'll make slider drags smooth.

### Suspect 3 — one MeshStandardMaterial per segment (PRE-EXISTING, BIGGER FIX)

`AnimatedModel.tsx:174-211` renders `<meshStandardMaterial>` inside each `<SegmentMesh>`. A dragon with ~150 segments → ~150 materials → ~150 draw calls per frame. Same on home page when a config is loaded; not studio-specific.

If suspects 1 and 2 don't account for the lag, the next step is batching: per group, merge the segment geometries (`THREE.BufferGeometryUtils.mergeBufferGeometries`) into a single buffer and render one mesh per group, or use `InstancedMesh` per group. This is a proper refactor that affects `AnimatedModel` and so impacts the home page too — coordinate with the user before doing it.

### Other notes that bear on perf

- The persist middleware on `useStudioStore` writes to localStorage on `set()` calls. None of the per-frame work calls `set()` — chain joints, target ref, and limb FABRIK state are all in `useRef`s — so persist isn't a per-frame cost. Verify if you suspect otherwise.
- Several components subscribe to the studio store without a selector (`useStudioStore()` returns the whole state object, re-renders on every `set`): `StudioSidebar`, `CameraController`, `AnimateContent`, `StepAnimate`. This is harmless during animation idle but if you find a `set()` call you missed, it'll cause a 4-component re-render cascade per call.
- The geometries created via `useMemo(() => new THREE.BufferGeometry()...)` in both `SceneContent`'s and `AnimateContent`'s `<SegmentMesh>` are **not auto-disposed by R3F** on unmount (R3F only auto-disposes JSX-declared primitives). When stepping 2 → 3 the step-2 geometries leak into GPU memory. Cosmetic memory leak, not a perf hit since they're not in the scene graph anymore — flag for cleanup eventually.

## Diff layout to read in order

If picking this up cold, read in this order:
1. `app/studio/page.stores.ts` — store shape (step, animationConfig, etc.)
2. `app/studio/StudioSidebar.tsx` — step navigation
3. `app/studio/StepAnimate.tsx` — sidebar in step 3
4. `app/studio/StudioScene.tsx` — `AnimateContent` + `StepGate` + `buildChainJoints`
5. `app/page.types.ts` — `chainOrigin` and `initialJoints` on CreatureConfig
6. `app/game/useCreature.ts` — how those two fields are consumed
7. `app/game/AnimatedModel.tsx` (read-only, unchanged in studio session, but key to understanding draw-call cost)
8. `app/game/SkeletonScene.tsx` — home-page render path, for comparison

## Verification done

- `npx tsc --noEmit` passes after each change in the session.
- Behavioral end-to-end was not verified in a browser by the agent — the user observed studio step 3 working and reported the perf lag, so the wiring is at least correct enough to render and animate.
