# Add the limb actuation (Phase D2 — one hip, one oscillator)

## Why

D2 is the **actuation** beat of Phase D, mirroring B2 (Ekeberg muscles) in isolation: prove a single
physical 1-DOF rotational hip can be driven by a single limb CPG oscillator through the paper's
**piecewise-linear transfer function** with a **77 % stance duty cycle**, before any four-leg
coupling, axial wave, or ground contact (those are D3). Faithful to Knüsel 2020 §3 (limb position
controller) + reference §5.2 ("Part 5 — limbs & gait"): one oscillator per leg, phase → desired
position via a transfer function, stance dominates.

## What Changes

- **One isolated hip joint.** A 1-DOF revolute joint between a fixed pelvis anchor (static body)
  and a single thigh body, axis = world-up (yaw plane), `setLimits` from the leg group's
  `angleCaps.yaw` / `yawBack`. No multi-segment leg, no foot, no ground.
- **Piecewise-linear transfer function `phaseToTarget(φ)`.** Maps a limb oscillator's wrapped phase
  `φ ∈ [0, 2π)` to a desired hip angle in `[−A_swing, +A_stance]`, with 77 % of the cycle spent in
  the slow **stance** ramp (foot would push the body forward) and 23 % in the fast **swing** ramp
  (leg lifts and returns). Two linear pieces; continuous at the joins; saturates at the angular
  caps.
- **ForceBased motor driving the hip.** Same pattern as B3 / current swim: `configureMotorPosition(
  phiTarget, kStiff, delta)` each step, so the joint is integrated implicitly (energy-stable). One
  tunable stiffness (`kStiff`) and damping (`delta`) so the gate can dial torque without touching
  the muscle equations.
- **D2 capture extended** to log: oscillator phase + amplitude + desired target from
  `phaseToTarget`, the actual joint angle (rad), and angle-vs-cap fraction over time.
- **No four-leg coupling, no axial, no contact.** D3 brings those.

## Capabilities

### New Capabilities
(none — D2 extends the existing locomotion capability)

### Modified Capabilities
- `locomotion`: add the limb transfer-function + single-hip-actuation requirements

## Impact

- **Specs:** `locomotion` — add limb-actuation requirements (transfer function shape, 77 % duty,
  single-hip Rapier setup, motor wiring).
- **Code:** new `app/game/locomotion/limbActuation.ts` (`phaseToTarget` + small builder for the
  isolated single-hip world); `diagnostics.ts` (new `LimbJointCaptureSample` + serializer block);
  new `scripts/locomotion-3d-walk-actuation-check.ts` headless gate.
- **Reuses unchanged:** `cpg.ts` (limb oscillator from D1), `body3d.ts` joint wiring conventions,
  Rapier ForceBased motor pattern from the coupled swim path.
