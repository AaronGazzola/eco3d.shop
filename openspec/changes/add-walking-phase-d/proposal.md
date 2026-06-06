# Add terrestrial walking (Phase D)

## Why

The body now swims in 3D (Phase C-3D: CPG → Ekeberg muscle via Rapier motor → body, energy-stable,
coordinated traveling wave). The reference (Knüsel/Ijspeert salamander) uses the **same axial CPG**
plus **four limb oscillators** to also walk on land in a **diagonal trot**. Phase D adds terrestrial
walking — physical limbs driven by limb CPG oscillators through a transfer function, gravity + ground
contact + friction, and the paper's interlimb couplings — **reusing the axial CPG/muscle/motor/body
stack unchanged**.

It is built as its own **walk mode** to isolate the substantial new physics (gravity, ground,
friction, limb control) from the working swim. The paper's full hypothesis — one CPG where the
**descending drive selects the gait** (swim ↔ walk) and the medium transitions water ↔ land — is a
deliberate later phase; the controller built here is already the faithful one, only the gait-selection
and medium-transition are deferred.

## What Changes

- **Limb CPG (4 oscillators).** Extend `cpg.ts` with four limb oscillators and the paper's Table 2
  interlimb couplings (rostrocaudal `w=3`, caudorostral `w=30`, lateral `w=10`, all `φ=π`) producing
  a **diagonal trot**, plus limb→axial (`w=30, φ=4`) and axial→limb (`w=2.5, φ=−4`) couplings that
  lock the body wave to the legs.
- **Limb transfer function.** Map each limb oscillator's phase → hip target angle (protraction during
  swing, retraction during stance) + **foot lift during swing** so the foot clears the ground, with a
  stance duty factor. Drive the hip with the same ForceBased-motor approach as the axial muscle.
- **Physical legs (1-DOF hip + foot).** Promote the currently render-only leg groups to real bodies:
  a 1-DOF hip joint at the existing hip node + a foot collider. (Knee/ankle are out of scope — the
  paper drives one oscillator per limb.)
- **Terrestrial environment.** A walk mode with **gravity ON** + a flat **ground plane** with friction
  (vs the swim's gravity-off neutral buoyancy). Body stays upright via leg support.
- **Render + observe.** Render legs from their physics transforms; add a walk capture/gate to the
  observation loop and the headless bench.

## Impact

- **Specs:** `locomotion` — add walking requirements (limb CPG, transfer function, terrestrial
  contact, diagonal-trot gait).
- **Code:** `cpg.ts` (limb oscillators + couplings), new limb transfer-function module, `body3d.ts`
  (hip joints + foot colliders + gravity/ground), `useLocomotion.ts` (limb motor drive + walk mode),
  `AnimateSidebar.tsx` (walk-mode toggle + limb params), `scripts/` (walk gate).
- **Reuses unchanged:** axial CPG, Ekeberg muscle via motor, body chain, planar-projection is
  swim-only (walk is full 3D under gravity).
- **Deferred (Phase D-unify / Linear):** drive-selected gait transition, water↔land medium switch.
