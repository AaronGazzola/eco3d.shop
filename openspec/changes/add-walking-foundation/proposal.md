# Add the walking foundation (Phase F0 — stand under gravity)

## Why

Phase C-3D proved **swimming** with gravity **off** and a per-step **planar projection** that
forcibly re-flattened the body every step — a non-paper crutch. Walking needs the body to be stable
in full 3D **under gravity** and to **stand on its legs** — a regime that has never been validated.
This is the missing rung between 3D swimming and walking: remove the crutch, confirm the 3D body is
stable on its own, and stand it on its feet via real ground contact. No gait yet — just a stable,
upright foundation for Phase D to build on. (The work is already spiked behind a hardcoded
`GRAVITY_TEST` flag in commit `8a045a4`; this change productizes that spike and records the
requirements.)

## What Changes

- **BREAKING (internal): remove the soft planar projection entirely** — `planarProject`, its per-step
  call, the `planarConstraint` store flag, the "Planar lock" UI button, and the `__studio.planar`
  hook. Verified the swim does **not** regress without it (the energy-pump fix already handled the
  large instability): drift ~23/16s, comY≈0, tilt 3–9°, no float/tumble.
- **Bend axis = each segment's local up** (perpendicular to the segment — a principal axis), so the
  muscle torque produces a clean in-segment-plane bend and the axis follows the segment when it later
  pitches. *Honest note:* this does **not** by itself remove the residual tilt.
- **Root-cause the residual out-of-plane tilt:** it is the rig's **non-coplanar rest spine** (authored
  node heights make the centerline zig-zag), not drag and not joint-cap slamming. Recorded, not
  "fixed" by forcing flatness — under gravity the floor handles it.
- **Add a swim/land mode.** Land = gravity `(0,−9.81,0)` + a static ground plane just below the feet;
  swim = gravity off / neutral buoyancy (unchanged). Replace the hardcoded `GRAVITY_TEST` flag with a
  real `coupledMode: 'swim' | 'land'` toggle (store + studio hook + sidebar), default `swim`.
- **Stand the body on its legs.** Build each leg as a real capsule from the girdle **hip socket**
  (`nodeHipLeft/Right` on the parent spine group) to the leg's **`nodeFoot`**, with foot contact +
  friction and **rigid (fixed) hips** (standing only — no actuation this phase). Place the floor at
  foot level. Render legs from their physics transforms in land mode.
  - *Geometry note:* legs carry no `nodeFront/nodeBack`; an earlier walk attempt read those undefined
    fields and mis-built the legs.

## Capabilities

### New Capabilities
<!-- none — all behavior fits the existing locomotion capability -->

### Modified Capabilities
- `locomotion`: remove the planar-projection requirement; add the land regime (gravity + ground
  plane), the swim/land mode toggle, and standing on legs via real foot/ground contact; make the
  segment-local bend axis the specified actuation axis.

## Impact

- **Specs:** `locomotion` — delta (remove planar projection; add land regime, mode toggle, standing
  legs, segment-local bend axis).
- **Code:** `app/game/locomotion/body3d.ts` (drop `planarProject`/`PLANAR_SWIM`; segment-local axis;
  leg bodies + floor; mode arg), `useLocomotion.ts` (drop planar call; gravity per mode), `animateStore.ts`
  (drop `planarConstraint`; add `coupledMode`), `AnimateScene.tsx`/`AnimateSidebar.tsx` (drop planar
  UI/hook; add mode toggle), `AnimatedModel.tsx` (render legs from physics in land mode),
  `scripts/observe-swim.mjs` (drop planar in `fine`).
- **Out of scope (→ D1/D2/D3):** limb CPG, the piecewise-linear transfer function, motorized/driven
  hips, stepping, the diagonal trot, the walking hip-axis choice.
