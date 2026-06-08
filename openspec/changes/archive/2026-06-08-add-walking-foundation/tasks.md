# Tasks — Phase F0 walking foundation

Some work landed in the spike (commit `8a045a4`) gated behind `GRAVITY_TEST`; those are checked.
The remaining work productizes the spike into a real swim/land mode and verifies the gate.

## 1. Remove the planar projection (done in spike)

- [x] 1.1 Delete `planarProject` + `PLANAR_SWIM` from `body3d.ts`.
- [x] 1.2 Remove the per-step `planarProject` call from `useLocomotion.ts`.
- [x] 1.3 Remove `planarConstraint` + `setPlanarConstraint` from `animateStore.ts`, the "Planar lock"
  button from `AnimateSidebar.tsx`, the `__studio.planar` hook from `AnimateScene.tsx`, and the
  `planar` usage from `scripts/observe-swim.mjs`.

## 2. Segment-local bend axis (done in spike)

- [x] 2.1 In `body3d.ts`, set each axial joint's revolute axis to the child segment's local up
  (world-up minus its along-segment component; fall back to world-up for a near-vertical segment).
- [x] 2.2 Generalize `jointAngle` to project the relative rotation onto `restAxisLocal`.

## 3. Swim/land mode (replace the GRAVITY_TEST flag)

- [x] 3.1 Add `coupledMode: 'swim' | 'land'` (default `'swim'`) + `setCoupledMode` to `animateStore.ts`.
- [x] 3.2 `buildBody3D(world, groups, mode)`: take the mode; build legs + ground only in `'land'`.
  Remove the `GRAVITY_TEST` const.
- [x] 3.3 In `useLocomotion.ts`, read `store.coupledMode`; set world gravity `(0,−9.81,0)` for land
  else `(0,0,0)`; rebuild the coupled handle when the mode changes (same path as on group change).
- [x] 3.4 Add a Swim/Land toggle to the Simulate sidebar and a `mode(m)` setter to `window.__studio`;
  disable the toggle while a coupled run is active (mode switch needs a rebuild).
- [x] 3.5 In `AnimatedModel.tsx`, gate the physics-driven leg rendering on `coupledMode === 'land'`
  (replace the `GRAVITY_TEST` import/usage).

## 4. Legs + ground (done in spike; re-confirm after the mode refactor)

- [x] 4.1 Build each leg as a capsule from the girdle hip socket (`nodeHipLeft/Right`) to `nodeFoot`,
  mass from `nodeWeight`, foot collider with friction, **rigid (fixed)** hip joint.
- [x] 4.2 Place a static ground plane just below the lowest foot.
- [x] 4.3 Render legs from their physics body transforms (sibling BodyMounts via `bodyRefs`).
- [x] 4.4 Re-verify 4.1–4.3 still hold once gated by `coupledMode` instead of `GRAVITY_TEST`.
  (Observed: land mode stands — comY −0.14, tilt ~2°, KE→~0; swim mode unregressed.)

## 5. Typecheck + lint

- [x] 5.1 `npx tsc --noEmit` passes.
- [x] 5.2 `npx eslint app/game/locomotion app/admin/animate` passes (no new warnings beyond the
  pre-existing `_segments` unused-var).

## 6. Manual visual gate (browser) — HAND OFF TO USER

- [x] 6.1 Swim mode: swims forward, no float/tumble. User confirmed a slow bounded lean to one side
  (the accepted non-coplanar-spine residual, ~3–9°) — not a regression.
- [x] 6.2 Land mode: the dragon drops onto its feet and rests (comY settles −0.14, tilt ~2°, KE→~0).
  At drive>0 the body's axial wave wiggles the rigid front legs (expected — hips are welded this phase).
- [x] 6.3 Toggle swim↔land: each rebuild is clean (no NaN/explosion). User confirmed.

## 7. Documentation + validation

- [x] 7.1 `documentation/animation-roadmap.md` §4: dated entry — mode toggle productized, gate result.
- [x] 7.2 `npx openspec validate add-walking-foundation --strict` passes.
