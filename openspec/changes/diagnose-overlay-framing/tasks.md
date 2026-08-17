## 1. The reset

- [x] 1.1 In `app/admin/animate/animateStore.ts`, add `resetNonce: number` to `AnimateStore` with a default
  of `0`, and a `resetCreature: () => void` action that increments it. Place both outside `SimConfig`, and
  confirm `pickSimConfig` and the `partialize` at the persist call do not include `resetNonce`, so a reset
  is neither persisted nor part of preset comparison.
- [x] 1.2 In `app/game/locomotion/useMujocoLocomotion.ts`, add a `builtNonceRef` beside `builtGroupsRef` and
  `builtWorldRef`. Add `builtNonceRef.current !== store.resetNonce` to the `stale` expression, and set
  `builtNonceRef.current` to the nonce the build was started with inside the `.then` that records
  `builtGroupsRef` and `builtWorldRef`, so one increment rebuilds exactly once.
- [x] 1.3 In `app/game/embed/page.tsx`, add `reset: () => useAnimateStore.getState().resetCreature()` to the
  `window.__game` handle installed in the observation effect, leaving `state` and `channel` unchanged.
- [x] 1.4 Write `scripts/check-reset.ts` asserting, against the store directly with no browser: calling
  `resetCreature` increments `resetNonce` by one; `pickSimConfig` returns an equal object before and after;
  and two stores with the same preset applied but different `resetNonce` values produce equal
  `mujocoStructuralKey` results.

## 2. The boundary outline

- [x] 2.1 Create `app/game/TankBounds.tsx` exporting `TankBounds`, which reads `tankBounds` from
  `useAnimateStore`, returns `null` while the bounds are `null`, and otherwise renders a `lineLoop` whose
  geometry is the four floor corners at `minY`: `(minX, minY, minZ)`, `(maxX, minY, minZ)`,
  `(maxX, minY, maxZ)`, `(minX, minY, maxZ)`. Lines only, no filled surface, no `console.error` while the
  bounds are absent.
- [x] 2.2 In `app/game/embed/page.tsx`, add `bounds: params.get('bounds') === '1'` to the `EmbedEnvironment`
  object built in the `useMemo`, read from the hash exactly as `controls` already is.
- [x] 2.3 In `app/game/embed/page.tsx`, render `<TankBounds />` inside `StudioCanvas` beside `GameScene` and
  `TankCamera`, only when `env.bounds` is set, so a link without the flag draws no outline.

## 3. The measurement the outline is drawn to make

- [x] 3.1 Write `scripts/measure-frame-headroom.ts` which, for the overlay tank of 60 by 30 by 40 at aspect
  1.5 and the canvas field of view of 50, calls `fitTankCamera` from `app/game/tankFit.ts` for the overhead
  view and reports: the visible half-width and half-depth at floor level, the same two at a series of
  heights above the floor, and the height at which each first falls below the tank's own half-width and
  half-depth. Report numbers rather than asserting a threshold, since the height at which the margin runs
  out is the quantity in question. Also report, in world units and in pixels, how far outside the drawn
  floor line a contained creature can appear at each height, since that ceiling is what tells perspective
  apart from a creature genuinely leaving the tank.
- [x] 3.2 Extend `scripts/check-tank-world.ts` to report the height above the floor the body is BUILT at —
  the floor, the spine's centre, and the top of the trunk — so the headroom figure from 3.1 has something
  to be compared against. Amended from "the maximum height reached over a run": that script reads the
  generated model and never runs a simulation, and the roadmap's grounded run already recorded a height
  drift of 0.044 units, so the built height is the height.

## 4. Proving it renders

- [x] 4.1 Extend `scripts/verify-embed.mjs` to accept a `--bounds` argument that appends `bounds=1` to the
  hash, and to assert that a link with the flag draws more than the same link without it. Compared over a
  24-pixel strip along the window's edge, which holds the outline and not the creature, by PNG byte length
  and inequality: no pixel decoder exists in this repository and adding one to count pixels is not worth a
  dependency. The strip is 24 pixels because the fit leaves 5 percent of room, putting the line about 11
  pixels in rather than flush with the edge.
- [x] 4.2 Run `node scripts/verify-embed.mjs <rig-id> 20 --bounds` against a production build on port 3001
  and confirm it passes, then run it without `--bounds` and confirm no outline is drawn.
