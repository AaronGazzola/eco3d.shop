# Design — Phase D3 (terrestrial coupled walking)

## Context

D1 added four limb oscillators to the CPG (signal proven on a headless trot test). D2 added the
piecewise-linear transfer function + a single-hip Rapier rig with `ForceBased` motor (tracking
proven). The coupled swim path (`useLocomotion.ts` → `body3d.ts`) already drives the **axial**
chain with Ekeberg muscles through `configureMotorPosition`, with gravity off and a soft
`planarProject` keeping the body in the horizontal plane.

D3 connects the legs to the body and lets gravity act. Conceptually the only new physics is (a)
four more revolute joints (one per leg, hip-only), (b) gravity, (c) ground contact via a static
plane below the rig, (d) removing the planar projection because the body must now be 3-D. All four
ingredients are necessary: gravity without ground = the rig falls forever; ground without gravity =
the rig floats above it; either without the legs = no propulsion. Together, the diagonal trot from
D1 sweeps the hips through the D2 transfer function, the body lands on the ground, friction +
geometry should produce a net forward slip.

## Goals / Non-Goals

**Goals:**

- The coupled-running studio path can be put into **walk mode**: gravity on, ground plane on,
  planar projection off, four hips driven by `phaseToTarget(limbPhase(...))`.
- Swim mode (existing, calibrated) remains available and unchanged — switching modes is a single
  store toggle.
- Visible forward walking in the browser at the calibrated D1 drive (somewhere below the limb
  saturation threshold 1.27 — say 1.0) with the diagonal-trot pattern observable in leg motion.
- No regression in the swim: when the user switches back to swim, the body swims as it did before.

**Non-Goals:**

- Foot-contact ground-reaction model. The legs are simple capsule colliders; whatever forward
  slip emerges from capsule-vs-plane geometry + friction is the propulsion. (A real foot model is
  a later phase.)
- Turning / steering / start-stop control. The walk is open-loop, fixed drive.
- Gait transitions. Trot only.
- Terrain. Flat plane only.
- Optimisation. First make it walk; then tune.

## Decisions

1. **Two coupled modes: `'swim'` and `'walk'`.** Adding a separate "walk" controller would
   duplicate the axial loop. Instead a single coupled controller branches on `coupledMode` for
   gravity, ground, planar projection, and whether to drive the hip motors. **Alternative:** keep
   the existing coupled path swim-only and add a wholly new walk path. Rejected — same axial
   wiring, same diagnostics; one branch is honest, two copies will drift.

2. **Walk gravity = `(0, −9.81, 0)`; swim gravity = `(0, 0, 0)`.** Set on world creation per mode.
   When the user switches modes mid-run the world is rebuilt (same pattern as today — the
   coupled handle is freed and rebuilt on group change). **Alternative:** scale gravity on the
   fly. Rejected — adds branchy state without benefit.

3. **Ground = fixed body + horizontal plane collider just below the rig's lowest rest Y.** Built
   once in `buildBody3D` when called with `mode='walk'`. Friction = Rapier's collider default
   (~0.5); restitution = 0. **Alternative:** large box collider. A plane (`ColliderDesc.cuboid`
   with very thin Y dimension) is the standard Rapier idiom; using `halfspace` would also work
   but is less consistent with the existing colliders.

4. **Hip joints attached to the *girdle spine body*, not to a separate "pelvis" anchor.** Each
   `leg-left` / `leg-right` group has `attachedToSpineId` pointing to its girdle spine; in the
   chain, that spine body already exists. The hip joint anchors at the hip node position (in the
   spine body's local frame) and at the thigh's centre-of-mass-shifted hip point. This means a
   leg pushing on the ground transmits force through its girdle into the axial chain — which is
   what makes the trot actually propel the body. **Alternative:** anchor each hip to a synthetic
   pelvis static body. Rejected — would decouple the leg force from the body, and the salamander
   walks BY transmitting leg push into the trunk.

5. **Hip motor parameters (initial) = D2's tuned values: `kStiff=300, delta=12`.** These were
   tuned headless for the D2 thigh and may need re-tuning under load + gravity + ground impact;
   the gate will surface this. **Alternative:** start higher. Rejected — start where D2 left off,
   measure, adjust.

6. **No planar projection in walk mode.** `useLocomotion` already gates `planarProject` behind
   `store.planarConstraint`; walk mode forces it off. The 2026-06-07 swim entry notes the
   projection was a *necessary* prop for the swim because the chain otherwise drifted out of
   plane. Walking *needs* the out-of-plane motion (the body lifts/drops with each step), so the
   prop is removed.

7. **The leg meshes already render through `bodyRefs`** (since 2026-06-06 B3 truthful-render).
   Once `body3d.ts` adds the thigh bodies with `groupIds` matching the leg groups, the existing
   render loop will draw each leg at its real Rapier transform with no UI code change.

8. **Studio toggle: `coupledMode`** — added to `animateStore` as `'swim' | 'walk'`, default
   `'swim'` (no surprise to existing users). Simulate tab shows two buttons next to Run/Reset.

## Risks / Trade-offs

- **Capsule legs vs hard plane** → at the impact moment when a leg slams the plane, the solver
  can spike. *Mitigation:* Rapier's default contact constraints are already stable at this scale
  from the existing swim work; if jitter shows up, raise solver iterations or thicken the leg's
  bottom radius so the impact is shallower.
- **Hip kStiff under load** → D2's tuning was on a free thigh. With gravity loading the joint
  through the contact, the motor may sag (angle lags target by more than D2's 5.73°). *Mitigation:*
  the visual gate is the truth; if the trot pattern is invisible because the motors sag, raise
  kStiff and rerun. Document the tuning in the roadmap entry.
- **No foot contact model → forward propulsion may be weak** → with only capsule-vs-plane
  geometry, the leg's net forward push depends on stance-phase angular velocity × capsule length
  × friction. It may not be much. *Mitigation:* this is acceptable — the gate is "visible
  walking", not "fast walking". If it walks *backward* or just *trembles*, that's evidence the
  trot polarity needs swapping; if it walks *forward slowly*, that's success.
- **Axial wave shifting toward standing under limb→axial coupling at low drive may slow the body
  more than expected** → exactly what D1's gate 4.2 demonstrated. *Mitigation:* this is the
  intended physics; if it's too sluggish, raise drive a touch (still below 1.27 so limbs stay
  active).
- **Mode switch mid-run rebuilds the world** → same UX cost as a "Reset" button — acceptable.
- **PLANAR_SWIM constant becomes a per-run value rather than a global** → minor API churn for one
  module (`body3d`/`useLocomotion`); no callers outside the locomotion folder.

## Open Questions

- **Friction coefficient for the ground plane.** Default is ~0.5. If the body just slides
  laterally instead of walking, lower it; if the body locks up, raise it. Resolve at the gate by
  observation.
- **Does the existing axial-wave Ekeberg drive stay at `α=1.0, β=1.2`?** Same equation, but now
  there's gravity loading the spine. Likely no change, but the gate will tell.
- **Initial ground clearance.** How far below the rig's resting Y to place the plane. Probably
  `min(restCenter.y for body) − thighRadius − 0.05`. Tune at gate.
