# Add terrestrial coupled walking (Phase D3 — the legs walk)

## Why

D3 is the **coupling** beat that finishes Phase D: replace D2's test oscillator with the **real D1
limb CPG**, so the four legs are driven by their own oscillators — coupled to each other (Table 2
interlimb) and to the axial wave (limb↔axial) — under gravity + ground + friction, producing an
**emergent diagonal-trot walk that moves forward**. Everything before this proved a piece in
isolation (B = axial muscle, F0 = stand, D1 = limb signal, D2 = one hip on the transfer function);
D3 couples them into locomotion, the way the paper's salamander walks.

## What Changes

- **Couple the limb CPG into the body.** Build the coupled `cpgSpec` **with limbs** (pass `groups` +
  `chainGroupIds` to `buildCpgSpec` in the land-mode coupled handle), so the four limb oscillators +
  Table 2 couplings + limb↔axial couplings run inside the body sim.
- **Drive each hip from its limb oscillator,** not the test clock: `target = phaseToTarget(limbPhase(
  cpgState, limbIdx), capStance, capSwing)` each substep. The diagonal trot now **emerges from the
  couplings** (D1) rather than the hardcoded test phase (D2).
- **Axial + limbs run together** under one drive: the Ekeberg axial muscle (swim path) plus the
  limb-driven hips, coupled, on the ground with gravity + friction. Forward-stepping drive regime
  (rostral ≈0.6 / body+limbs ≈1.0, below the limb saturation threshold so limbs stay active).
- **Foot clearance via a CPG-phased lift DOF (decided).** Add a **second hip hinge for lift**
  (a horizontal/transverse axis), driven from the **same limb oscillator's phase**: the leg lifts
  during the swing window and is down during stance, so the foot clears on the forward return and
  plants on the backward push → net forward motion. The fore-aft **sweep** stays the paper's
  transfer function; the **lift** is a phase-gated raise. **Both DOF are driven by the CPG**, so the
  rhythm and coordination remain the paper's; only the mechanical lift is ours.
  - **⚠ Flagged deviation:** this makes the limb **2-DOF** vs the paper robot's strict **1-DOF**.
    Justified: the *control* is wholly the paper's CPG, the paper's 1-DOF was a robot-hardware
    simplification, and a real salamander lifts its feet with multi-joint limbs (so this is closer to
    the animal). Recorded in the reference doc's paper-vs-ours ledger.
- Land-mode coupled run = walking (the D2 test-oscillator step path is replaced by the CPG drive).

## Capabilities

### New Capabilities
<!-- none — extends the existing locomotion capability -->

### Modified Capabilities
- `locomotion`: drive the land-mode hips from the limb CPG (was the D2 test oscillator); build the
  coupled spec with limbs; add the foot-clearance mechanism; add the forward-walk gate.

## Impact

- **Specs:** `locomotion` — modify the D2 "hips driven by a test oscillator" requirement to "driven by
  the limb CPG"; add coupled-walk + foot-clearance + emergent-forward-translation (land) requirements.
- **Code:** `useLocomotion.ts` (coupled spec with limbs; sweep + lift hips ← `limbPhase`; drive
  regime), `body3d.ts` (add the second **lift** hinge per leg — two revolutes in series, sweep about
  vertical + lift about transverse), `diagnostics.ts` (walk capture: footfall pattern, COM forward
  drift, duty), a headless + visual gate.
- **Out of scope (→ E/F):** turning / differential drive, behavior presets (Table 4), attractor
  head-tracking, proprioceptive feedback.
