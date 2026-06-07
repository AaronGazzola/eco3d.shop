## 1. Body builder — four hips

- [x] 1.1 Extend `body3d.ts` to take a `mode: 'swim' | 'walk'` argument on `buildBody3D`. In walk
  mode, after the axial chain is built, iterate the leg groups: for each `leg-left` / `leg-right`,
  build a dynamic thigh capsule at the corresponding hip node, with length from the leg's `nodeFront →
  nodeBack` distance, default mass from `defaultWeightFor(type)`, world-aligned body, capsule
  collider rotated to the leg's local forward.
- [x] 1.2 For each leg, create a revolute joint anchored at the hip node on the girdle spine body
  and at the thigh's hip-end on the thigh body, axis `(0, 1, 0)`, `setLimits(-yawBack,
  +yawForward)` from the leg's `angleCaps`, motor model `ForceBased`.
- [x] 1.3 Extend `Body3D` with a new `hipJoints: { limbIdx: number; joint:
  RevoluteImpulseJoint; capStance: number; capSwing: number; thighIndex: number }[]` field,
  populated only in walk mode (`limbIdx` from `LIMB_LF/RF/LH/RH` based on
  `attachedToSpineId` order and `leg-left` / `leg-right` side). Push the four thigh bodies into
  `bodies` and `groupIds` so the existing render loop picks them up.
- [x] 1.4 In walk mode, also create a static ground body with a thin horizontal cuboid collider
  (`ColliderDesc.cuboid(50, 0.05, 50)`) at `y = (lowest restCenter.y of rig) − thighRadius −
  0.05`.

## 2. Walk-mode coupled controller

- [x] 2.1 In `useLocomotion.ts`, add `coupledMode: 'swim' | 'walk'` to the store read; on mode
  change, free + rebuild the coupled handle (same path as on group change).
- [x] 2.2 When building the coupled handle, set Rapier world gravity to `(0, -9.81, 0)` if walk
  else `(0, 0, 0)`. Pass `mode` through to `buildBody3D`.
- [x] 2.3 In the per-step loop, after axial-Ekeberg motor wiring, if walk mode: for each
  `hipJoints[i]`, compute `phi = limbPhase(state, spec, hip.limbIdx)`, `target = phaseToTarget(
  phi, hip.capStance, hip.capSwing)`, call `hip.joint.configureMotorPosition(target, K_STIFF,
  DELTA)` (start `K_STIFF = 300`, `DELTA = 12` from D2 tuning), wake the thigh.
- [x] 2.4 Skip `planarProject` in walk mode (regardless of the `planarConstraint` store flag).

## 3. Store + UI

- [x] 3.1 Add `coupledMode: 'swim' | 'walk'` (default `'swim'`) + `setCoupledMode` to
  `animateStore`.
- [x] 3.2 Simulate tab: add a small 2-button group ("Swim" / "Walk") next to the drive sliders.
  Wire to `coupledMode` + `setCoupledMode`. Disable while coupled is running (mode switch needs a
  rebuild). Also: in walk mode, render legs as siblings of spine BodyMounts (driven by
  `bodyRefs` from Rapier thigh transforms) rather than as render-only children — required so the
  legs animate at their physical hip positions.

## 4. `npx tsc` + `npx eslint` clean

- [x] 4.1 `npx tsc --noEmit` passes.
- [x] 4.2 `npx eslint app/game/locomotion app/admin/animate` passes (no new warnings beyond the
  pre-existing `_segments` unused-var on `useLocomotion`).

## 5. Manual visual gate (browser) — HAND OFF TO USER

- [ ] 5.1 In the studio (`/admin/animate`), select a rig with both fore + hind hips and four
  legs. Confirm the rest pose renders correctly with the new thigh bodies. Confirm the swim mode
  still swims (no regression).
- [ ] 5.2 Switch `coupledMode` to walk. Click Run. Observe: the rig sits on the ground at rest
  (gravity pulls it down onto the plane), no NaN explosion, no joints at 100 % cap forever.
- [ ] 5.3 Verify the rig walks **forward** along the ground at `drive ≈ 1.0` (below the limb
  saturation threshold 1.27). The diagonal-trot pattern is visible in the legs: LF + RH paired
  against RF + LH; hind legs lead. Capture a screenshot and paste the observation into the
  roadmap entry.

## 6. Documentation + validation

- [ ] 6.1 `documentation/animation-roadmap.md` §4: dated entry — body builder change, walk
  controller path, gravity + ground + planar-off, motor tuning (note any change from `300/12`),
  manual visual gate result.
- [x] 6.2 `npx openspec validate add-terrestrial-walking-phase-d3 --strict` passes.
