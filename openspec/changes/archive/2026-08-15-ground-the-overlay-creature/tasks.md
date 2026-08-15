## 1. The tank keeps the ground

- [x] 1.1 In `app/game/locomotion/mjcf.ts`, replace the `worldXml` ternary with a composed list. Compute
  `const grounded = gravityY !== 0`. Emit the existing `floor` plane (`contype="1" conaffinity="2"` at
  `groundTop`) whenever `grounded`, unchanged in every attribute. Emit `tank_floor` only when a tank is
  present and `!grounded`. Emit `tank_ceiling`, `tank_xmin`, `tank_xmax`, `tank_zmin`, `tank_zmax`
  whenever a tank is present, unchanged in every attribute including `wallSolref` and the 4/4 contact
  pair. With no tank and no gravity, emit the `floor` plane as today so an existing zero-gravity run
  without a tank is unaffected.
- [x] 1.2 In the same file, set `tankMinY` to `groundTop` when `grounded` and keep
  `bodyCy - tank.height / 2` when not. Replace the comment block above it.
- [x] 1.3 Confirm the published `tankBounds` follow `tankMinY` with no further edit.
- [x] 1.4 Do NOT widen any contact mask, and do NOT put the trunk hull spheres on the floor's pair.
- [x] 1.5 **Added after observation.** A 90 s grounded run held the spine exactly at the glass and pushed
  the feet 2.2 u through it, so the containment was real for the trunk and absent for the legs. Add one
  massless hull sphere per foot, on the walls' own 4/4 pair, emitted only where a tank exists. The foot's
  existing floor-contact ball is untouched.

## 2. A grounded tank preset

- [x] 2.1 In `app/admin/animate/simPresets.ts`, add a MuJoCo preset named `ground tank`, placed
  immediately after `flight base`, with config `{ ...MUJOCO_BASE_SWIM, tankEnabled: true, tankWidth: 60,
  tankHeight: 30, tankDepth: 40 }` and `legWeight: MUJOCO_LEG_WEIGHT`. It carries no `gravityY`, so
  `applySimConfigAbsolute` pins Earth's pull from the defaults — that single absent field is the whole
  difference from `flight base`.
- [x] 2.2 Placeholder description while unmeasured, replaced by task 6.4.

## 3. A motion declares its face

- [x] 3.1 In `app/game/motion/resolve.ts`, add `TankView`, add `view` to `PublishedMotion` and to
  `ResolvedMotion`, and populate it in both branches so a fallback carries `cruise`'s face.
- [x] 3.2 Point `cruise` at `{ preset: 'ground tank', engine: 'mujoco', view: 'overhead' }`.
- [x] 3.3 In `app/game/game.hooks.tsx`, hold the resolved view in state, set it where `resolveMotion` is
  already called, return it as `motionView`, seeded from `resolveMotion(CRUISE).view`.

## 4. The camera fit becomes a function

- [x] 4.1 Create `app/game/tankFit.ts` exporting `fitTankCamera({ bounds, view, aspect, fovDeg })`
  returning plain tuples, importing nothing from React, `three` or any store.
- [x] 4.2 Move the side-on maths into it: half-angles from `fovDeg` and `aspect`, fitted from the near
  face, camera on `+Z` of centre, `up` `(0, 1, 0)`.
- [x] 4.3 Add the overhead case, `up` `(0, 0, -1)`.
- [x] 4.4 Rewrite `app/game/TankCamera.tsx` to take a `view` prop, call the fit, and set `up` before
  `lookAt`. Orbit target, resize dependency and the `tankEnabled` diagnostic all kept.
- [x] 4.5 Pass `motionView` to `<TankCamera>` from `app/game/embed/page.tsx` — and from `app/page.tsx`,
  which mounts the same camera and was not in the original list.
- [x] 4.6 **Changed after observation.** Overhead fits the tank's FLOOR, not its near face. Fitting the
  ceiling put the creature 30 u beyond the framed plane and it read at about a fifth of the window, and
  it made the creature's apparent size depend on headroom it never uses.
- [x] 4.7 **Found by the check in 5.2.** Aim overhead at the floor rather than the tank's mid-height: with
  the camera measured up from the floor and the aim left at the centre, a tank taller than twice the
  fitted distance put the target above the camera and it looked at the ceiling.

## 5. Checks

- [x] 5.1 `scripts/check-tank-world.ts` — the walking floor present in both grounded worlds and absent in
  the flying one, `tank_floor` only in the flying one, the five walls in both tank worlds, grounded
  `tankBounds.minY === meta.groundTop`, no contact mask outside the four the file already used, and the
  foot hulls present only where a tank is.
- [x] 5.2 `scripts/check-tank-fit.ts` — both faces, aspect ratios 0.5/1.0/1.78/3.0, three tank shapes;
  the region the creature can occupy projected corner by corner; the overhead roll defined; the long axis
  across the frame; and headroom proved irrelevant to overhead framing.
- [x] 5.3 `scripts/check-motion-vocabulary.ts` extended — every published motion carries a face, `cruise`
  is grounded and contained, a fallback inherits `cruise`'s face, and the grounded and flying presets
  differ by gravity alone.
- [x] 5.4 All six check scripts pass, `tsc --noEmit` clean, lint unchanged at 22 pre-existing errors.

## 6. Observation

- [x] 6.1 Rebuilt and restarted eco3d on 3001 and the studio on 3002 after every app change.
- [x] 6.2 `node scripts/verify-embed.mjs` — overhead, whole tank framed, creature on the floor and inside
  the frame. Three captures across the change; the first two are the record of the two corrections.
- [x] 6.3 90 s capture of the preset. 2.02 u/s fastest 3 s window, height drift 0.044 u, peak roll 2.42°
  at 4.0 reversals/s, closest approach to any wall 0.81 u, reaches the wall at ~16 s and parks in a corner.
- [x] 6.4 Numbers written into the preset description, wall behaviour included, duration stated.
- [x] 6.5 `tests/e2e/overlay-feeds-dragon.spec.ts` passes in `../Vids.Tube` against the regrounded overlay.
- [x] 6.6 **Added after the first capture was found untrustworthy.** `scripts/dump-preset-config.ts`
  writes a preset's absolute config for `observe --config`. The first 90 s run was taken with twenty
  `--set` flags and silently carried `frontDrive` 0.6, `liftAmount` 0.3 and a stale grip window from the
  studio's persisted store.

## 7. Close out

- [x] 7.1 `docs/animation-roadmap.md` — Decision 16 and a dated status entry carrying the measured
  numbers, both corrections, and the two harness traps.
- [x] 7.2 `openspec validate ground-the-overlay-creature --strict` passes.
