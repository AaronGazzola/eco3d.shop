## 1. Spikes (settle the open questions cheaply on the headless bench)

- [ ] 1.1 Faithful 1-DOF hip + emergent contact: a single motor-driven fore-aft hip on flat ground
  under gravity. Verify the foot clears during swing and grips during stance **from the contact
  model** (no scripted lift, no second DOF). If it drags, stay in the paper's frame — tune the hip
  rotation-axis orientation / foot geometry, not an added lift DOF.
- [ ] 1.2 Gravity + ground + friction: fixed ground collider, gravity on; find a workable foot
  friction coeff (grips during stance, no skating, no jitter).
- [ ] 1.3 Confirm energy stays bounded with gravity + contact (motors only, no explicit torques).

## 2. Limb CPG (`cpg.ts`)

- [ ] 2.1 Add four limb oscillators to `buildCpgSpec` with Table 2 interlimb couplings (rostrocaudal
  `w=3`, caudorostral `w=30`, lateral `w=10`, all `φ=π`) and faithful limb params (excitability fore
  `e=0.8`, hind `e=0.5`; saturation threshold `d_th≈1.27`).
- [ ] 2.2 Add limb→axial (`w=30, φ=4`) and axial→limb (`w=2.5, φ=−4`) couplings.
- [ ] 2.3 Headless: verify the four limbs settle into a diagonal-trot phase relationship from the
  couplings alone (CPG capture: diagonal pairs in phase, opposite antiphase).

## 3. Limb transfer function (new module)

- [ ] 3.1 Piecewise-linear transfer function: limb oscillator phase → 1-DOF hip target position (slow
  backward stance ≈77%, fast forward swing ≈23%); `−θ` for backward stepping. Position control, not
  Ekeberg. (Formula is ours; only the 77% target is from the paper.)
- [ ] 3.2 Unit-check the stance/swing split against the 77% duty-factor target.

## 4. Physical legs (`body3d.ts`)

- [ ] 4.1 Promote leg groups to dynamic bodies: hip joint(s) at the hip node (per the spike result) +
  a foot collider; sensible leg mass/inertia from `nodeWeight`.
- [ ] 4.2 Configure the hip motor(s) (ForceBased) like the axial joints.
- [ ] 4.3 `npx tsc --noEmit` + `npx eslint` pass.

## 5. Terrestrial environment + walk mode

- [ ] 5.1 Walk mode: gravity on + ground plane with friction in the Rapier world (vs swim's gravity
  off); planar projection is swim-only.
- [ ] 5.2 Store + `__studio` hook + sidebar toggle for walk mode; limb params (duty factor, lift,
  amplitude) as sliders.

## 6. Drive the limbs (`useLocomotion`)

- [ ] 6.1 Each substep: step the limb oscillators, run the transfer function, set each hip motor's
  target (motor-driven, no explicit torque); keep bodies awake.
- [ ] 6.2 Render the legs from their actual physics transforms (extend the truthful render).

## 7. Visual gate — walking

- [ ] 7.1 Observation loop: a walk capture (gravity on, ground, side + top + reset) + diagnostics
  (per-leg phase/contact, body height, upright tilt).
- [ ] 7.2 Gate: on flat ground the creature walks with a **diagonal trot** — feet plant/lift in the
  diagonal pattern, body progresses **forward** and stays **upright**, energy bounded.
- [ ] 7.3 Tune duty factor / lift / friction / leg amplitude on the loop until the gait reads clean.

## 8. Documentation + validation

- [ ] 8.1 `documentation/animation-roadmap.md` §4: dated entry — limb CPG + couplings, transfer
  function, hip/foot construction, terrestrial env, the walk-gate result, any tuning.
- [ ] 8.2 `npx openspec validate add-walking-phase-d --strict` passes.
