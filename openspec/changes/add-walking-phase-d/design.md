# Design — Phase D walking

## Context

Phase C-3D gives an energy-stable 3D swim: axial CPG → Ekeberg muscle (driven through each revolute
joint's **ForceBased motor**, the key to energy stability) → Rapier body chain, gravity off (neutral
buoyancy), kept planar by a soft post-step projection. Walking reuses that stack and adds limbs +
gravity + ground. Reference: Knüsel et al. 2020 / Ijspeert 2007.

## Decisions

1. **Walk as its own mode (not unified gait-selection yet).** Gravity + ground + limbs are a large
   block of new physics; isolating them from the swim (kept as the known-good reference) is the same
   "change one thing" discipline that the swim debugging proved necessary. The unified, drive-selected
   gait + water↔land transition (the paper's full hypothesis) is a deliberate later phase — and a
   superset, so nothing here is throwaway. The *controller* built here is already faithful.

2. **One oscillator per limb (faithful).** Four limb oscillators (left/right × fore/hind), Table 2
   interlimb couplings (rostrocaudal `w=3`, caudorostral `w=30`, lateral `w=10`, all `φ=π`) → diagonal
   trot; limb→axial `w=30, φ=4` and axial→limb `w=2.5, φ=−4` lock the trunk wave to the legs. Faithful
   per-limb parameters: **excitability fore `e=0.8`, hind `e=0.5`** (vs axial `1.1`), **limb
   saturation threshold `d_th≈1.27`** (vs axial `3`) — these make the limbs run slower and saturate
   first (the basis of the deferred gait transition).

3. **Limb is POSITION-driven, not muscle-driven (key paper contrast).** Unlike the axial joints (full
   Ekeberg muscle), the paper uses the limb oscillator's **phase `θ` directly as the desired leg
   position**, through a **piecewise-linear transfer function** tuned to **77% stance / 23% swing**.
   The leg is a **single 1-DOF hip joint** (fore-aft protraction/retraction) driven *toward that
   target position*. We realize "drive toward position" with the revolute joint's **ForceBased
   position motor** (energy-stable — never an explicit torque, the swim's energy-pump lesson) — but
   this is *position control*, NOT a virtual muscle. Backward stepping uses `−θ`.

4. **Foot contact EMERGES — no scripted lift, no second DOF (faithful).** The paper's foot
   contact/slip/lift emerges from the physics contact model; reference §5 is explicit it is "a
   simulated 1-DOF joint ... not a scripted plant/lift arc." So: **1-DOF hip only**, a **foot collider
   + Rapier friction**, gravity on. The slow stance sweep grips and propels; the fast swing sweep
   resets. We do NOT add a lift DOF or a kinematic lift.

5. **Transfer-function formula is ours (paper leaves it unspecified).** The paper gives the 77% duty
   *target* but not the formula; the piecewise-linear map that hits 77% is ours to design — the one
   sanctioned "ours" piece.

6. **Terrestrial environment.** Gravity on; a static ground plane with friction; the body is held up
   by leg stance, not the planar projection (swim-only — walk is full 3D). Re-enabling 6-DOF means the
   out-of-plane stability work parked for climbing becomes relevant; expect to tune.

7. **Motor everywhere.** Axial (Ekeberg-as-spring-damper) and limb (direct position) both go through
   Rapier motors — the load-bearing Phase C-3D lesson; must not regress to explicit torques.

## Open questions (resolve via spike/observation during the build)

- **Does a 1-DOF hip sweep give enough foot clearance from the contact model?** The faithful model is
  1-DOF + emergent contact. If a horizontal fore-aft sweep makes the foot *drag* during swing (no
  clearance), the fix stays inside the paper's frame — revisit the **hip rotation-axis orientation**
  (the paper's hardware swept in a way that cleared the foot) and the foot/leg geometry — NOT bolt on
  an invented lift DOF. Spike this on the bench first.
- **Upright stability.** With gravity on and only four legs, will the body stay upright, or tip/roll?
  The diagonal trot keeps two diagonal feet planted at all times — likely enough, but confirm; if not,
  options are a wider stance, a CoM/posture term, or a gentle upright restoring torque.
- **Duty factor + transfer-function shape.** The exact phase→position map (stance vs swing split, lift
  profile) — start from the paper's, tune on the observation loop.
- **Leg mass/inertia + foot friction coefficients.** Legs are currently `DEFAULT_LEG_WEIGHT` render
  passengers; as real bodies they need sensible mass/inertia and a friction coefficient calibrated so
  feet grip (no skating) without jitter.
- **Gait emergence vs prescription.** Confirm the diagonal trot *emerges* from the couplings (paper's
  claim) rather than needing hand-set phases.

## Gate

On flat ground under gravity: the creature walks with a **diagonal-trot** gait — feet plant and lift
in the diagonal pattern, the body progresses **forward** and stays **upright**, the trunk shows the
walking-gait standing/short wave locked to the legs, energy stays bounded (no motor energy pump).
