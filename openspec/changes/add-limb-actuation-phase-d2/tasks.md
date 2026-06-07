## 1. Transfer function (`limbActuation.ts`)

- [x] 1.1 Create `app/game/locomotion/limbActuation.ts`. Export `DUTY_STANCE = 0.77` and
  `phaseToTarget(phi: number, capStance: number, capSwing: number, dutyStance = DUTY_STANCE):
  number` — two-piece piecewise linear, continuous at the wrap, output in
  `[−capSwing, +capStance]`.
- [x] 1.2 Unit-like assertions inside a tiny dev block (or the gate script): values at
  `phi ∈ {0, 2π·0.385, 2π·0.77, 2π·0.885, 2π·0.999}` match the closed-form expectation; output is
  always within caps. Verified via the gate script's `transferFunctionUnitChecks()`.

## 2. Single-hip Rapier world

- [x] 2.1 Export `buildSingleHipWorld(world, capStance, capSwing)` from `limbActuation.ts`:
  static pelvis body at origin; dynamic thigh capsule along `+x` (length matches a real-rig leg
  scale, e.g. 2 units); revolute joint with axis `(0, 1, 0)`; `setLimits(-capSwing, +capStance)`;
  `configureMotorModel(ForceBased)`. Return `{ pelvis, thigh, joint, capStance, capSwing }`.
- [x] 2.2 `npx tsc --noEmit` + `npx eslint` pass.

## 3. CPG → motor wiring + diagnostics

- [x] 3.1 In the gate script (next section), each timestep: read `phi = limbPhase(state, spec,
  LIMB_LF)`; compute `target = phaseToTarget(phi, capStance, capSwing)`; call
  `joint.configureMotorPosition(target, kStiff, delta)` (tuned to `kStiff = 300`, `delta = 12` —
  start of 50/1 lagged the fast swing reset by ~25°; the higher gains lock tracking at < 6°);
  wake the thigh body; step the world.
- [x] 3.2 Per step, capture `{ t, phi, target, angle, capFrac }` where `angle = jointAngle(...)`
  and `capFrac = |angle| / (angle ≥ 0 ? capStance : capSwing)`.

## 4. Gate — single-hip tracking, caps, duty

- [x] 4.1 New `scripts/locomotion-3d-walk-actuation-check.ts`: run a single-hip world for ~6
  cycles past a 2-cycle transient. Print the transfer-function shape (ASCII table of `(phi,
  target)` at 24 evenly-spaced phases) and the realised `(t, phi, target, angle)` series at 1 %
  sub-sampling.
- [x] 4.2 Assertion: tracking RMS error (`angle − target`) over the steady window < `0.15` rad.
  **PASS** at `kStiff=300, delta=12`: RMS = 0.0999 rad (5.73°).
- [x] 4.3 Assertion: `max |angle| ≤ cap + 2° solver tolerance` at every step (Rapier's iterative
  solver lets the angle skim ~0.1° past a hard limit on rebound; 2° is well within engineering
  tolerance). **PASS**: max|angle| = 35.14°, cap = ±35.00°, within tolerance.
- [x] 4.4 Assertion: realised stance fraction is in `[0.72, 0.82]` (target 0.77 ± 0.05), measured
  as the time the joint's `|angular speed|` stays below the per-cycle peak-speed median (slow
  stance ramp vs fast swing snap) — NOT as the time `angle > 0`, which the piecewise-linear
  symmetric-cap transfer function makes ~38 % of the cycle by construction. **PASS**: realised
  fraction = 0.813.

## 5. Documentation + validation

- [x] 5.1 `documentation/animation-roadmap.md` §4: dated entry — transfer-function shape, 77 %
  duty, single-hip motor wiring, the three gate numbers.
- [x] 5.2 `npx openspec validate add-limb-actuation-phase-d2 --strict` passes.
