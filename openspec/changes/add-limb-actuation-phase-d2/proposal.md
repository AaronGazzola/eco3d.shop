# Add limb actuation (Phase D2 — the transfer function drives a real hip)

## Why

D2 is the **actuation** beat of walking, mirroring B2 (Ekeberg muscles in isolation): prove the
paper's **piecewise-linear transfer function** (77% stance duty) can drive a **real motorized hip**
so a leg visibly steps — *before* coupling all four legs to the limb CPG and the axial wave (that's
D3). It builds directly on F0's standing rig (legs already stand on the ground in land mode) and uses
D1's faithful limb oscillator. Faithful to Knüsel 2020 ("Limb Joints" + reference §5): phase → desired
position via a transfer function, position/PD control, slow stance / fast swing.

## What Changes

- **Port the transfer function `phaseToTarget(φ, capStance, capSwing, duty=0.77)`** (faithful,
  piecewise-linear, two pieces, continuous at the wrap) into `app/game/locomotion/limbActuation.ts`.
- **Motorize the land-mode hips.** Replace F0's **rigid (fixed)** hips with **revolute joints about
  vertical + a ForceBased motor**, driven by `configureMotorPosition(target, kStiff, delta)` — the
  same energy-stable pattern as the axial muscle. At rest the motor holds the stance angle (still
  stands); when stepping it tracks the transfer-function target.
- **Drive each hip from a TEST oscillator, not the coupled CPG.** A per-leg phase clock at the
  diagonal-trot offsets (fore-left + hind-right together, antiphase to the other diagonal), tunable
  frequency/amplitude. This isolates the *actuation* from the *signal coupling* (D3 swaps the test
  oscillator for the real D1 limb CPG + axial coupling). Driving is gated to land mode.
- **Diagnostics:** surface each hip's oscillator phase, transfer-function target, actual joint angle,
  and angle-vs-cap fraction over time.

### ⚠ Design fork to settle in this change (foot-lift)

A 1-DOF hip about **vertical** sweeps the foot in a flat **horizontal** arc — it cannot lift the foot,
so the foot **scrubs** the ground both ways instead of clearing during swing. The paper does **not**
specify a lift mechanism (it's robot hardware — our flagged ours-to-choose). Options to decide here:
**(A)** accept scrub for D2 — gate only on the *joint* following the 77% transfer-function shape, defer
real clearance to D3; **(B)** tilt the hip sweep axis so retraction plants and swing lifts; **(C)** add a
small second DOF for lift. **Recommended: (A)** — keep D2 about the transfer function actuating the
hip correctly; treat foot clearance as its own decision in/after D3.

## Capabilities

### New Capabilities
<!-- none — extends the existing locomotion capability -->

### Modified Capabilities
- `locomotion`: motorize the land-mode hips (was rigid in F0); add the limb transfer function and the
  test-oscillator hip drive.

## Impact

- **Specs:** `locomotion` — add the transfer-function shape (77% duty), motorized-hip actuation, and
  the test-oscillator drive requirements; modify the F0 "legs stand on rigid hips" requirement to
  motorized hips that hold stance at rest.
- **Code:** new `app/game/locomotion/limbActuation.ts` (`phaseToTarget`); `body3d.ts` (land hips →
  revolute + motor, expose them); `useLocomotion.ts` (drive hips via `phaseToTarget` from a test
  oscillator in land mode); `animateStore.ts`/sidebar (a step on/off + freq/amplitude control);
  `diagnostics.ts` (hip actuation capture).
- **Out of scope (→ D3):** four-leg coupling **from the limb CPG**, the axial wave coupling, real foot
  clearance, net forward walking, turning.
