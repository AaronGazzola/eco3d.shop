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

2. **One oscillator per limb (faithful).** Four limb oscillators, Table 2 interlimb couplings
   (rostrocaudal `w=3`, caudorostral `w=30`, lateral `w=10`, all `φ=π`) → diagonal trot; limb→axial
   `w=30, φ=4` and axial→limb `w=2.5, φ=−4` lock the trunk wave to the legs. The single limb
   oscillator's phase drives the **whole** leg trajectory via the transfer function.

3. **Limb realized as a motor-driven hip + foot, controlled by the transfer function.** The limb
   oscillator phase → a foot trajectory in the hip frame: **fore-aft swing** (protraction in swing,
   retraction in stance) + a **swing-phase lift** so the foot clears the ground. Driven by the same
   ForceBased-motor approach as the axial muscle (energy-stable; do NOT apply explicit torques —
   that was the swim's energy-pump bug). A **foot collider + Rapier friction** provides stance
   propulsion. Stance duty factor ≈ the paper's value (≈0.75; confirm against the reference).

4. **Terrestrial environment.** Gravity on; a static ground plane (or large fixed collider) with
   friction; the body is held up by leg stance, not the planar projection (which is swim-only — walk
   is full 3D). Re-enabling 6-DOF means the out-of-plane stability work parked for the climbing phase
   becomes relevant; expect to tune.

5. **Motor everywhere.** Both axial and limb actuation go through Rapier motors. This is the
   load-bearing lesson from Phase C-3D and must not regress to explicit torques.

## Open questions (resolve via spike/observation during the build)

- **Foot-lift joint realization.** One oscillator controls the leg, but the foot must move in 2D
  (fore-aft × height). Realize as a **2-DOF hip** (fore-aft revolute + lift revolute), both motor-
  driven from the one oscillator's phase? Or a fore-aft hip + a short prismatic/knee for lift? Spike
  the cheapest that gives a clean plant/lift. ("1-DOF" refers to *one oscillator per limb*, not
  necessarily one physical joint.)
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
