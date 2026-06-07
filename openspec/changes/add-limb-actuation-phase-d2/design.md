# Design — Phase D2 (limb actuation, one hip)

## Context

D1 added the four limb oscillators + Table 2 couplings to `cpg.ts` and proved the diagonal-trot
**signal** emerges without any body. D2 is the **actuation** beat: take ONE of those limb
oscillators and use its phase to drive ONE physical 1-DOF rotational hip joint, isolated, with no
ground and no second-leg coupling. Same separation as B1→B2: validate the actuator on a single
joint before wiring it across four legs (D3).

Knüsel 2020 §3 specifies the limb is driven by **one** phase as a desired position via a
**piecewise-linear transfer function** with a **77 % stance duty**. The 77 % stance dominance is
what makes a salamander walk look salamander-shaped: the hip rotates slowly during stance (the foot
would push the body forward if there were ground), then snaps quickly back during the 23 % swing
phase. There is no foot, no contact, no ground in D2 — just the angle trajectory itself, observed
on a free hip in an otherwise empty world.

Existing pieces we reuse: `cpg.ts`'s `limbPhase` + `limbOutput` (added in D1); the
`configureMotorPosition(target, kStiff, delta)` pattern from `body3d.ts` (added in B3 — it's the
energy-stable way to drive a revolute joint to a target angle); the headless Rapier setup pattern
from `scripts/locomotion-3d-swim-check.ts`; and `BodyGroup.angleCaps.yaw` / `yawBack` for the
caps.

## Goals / Non-Goals

**Goals:**

- A pure function `phaseToTarget(phi, capStance, capSwing, dutyStance)` returning the desired hip
  angle for any oscillator phase, with the 77 % stance / 23 % swing piecewise-linear shape.
- A headless one-hip Rapier world (one static "pelvis" body + one dynamic "thigh" body + a
  revolute joint with cap limits) where the joint is driven via `configureMotorPosition` from the
  limb CPG.
- A capture artifact (signal-only style, no markdown for now — just numeric assertions) showing
  the angle trajectory tracks the transfer-function shape, stays within caps, and cycles at the
  CPG-driven frequency.

**Non-Goals:**

- No four-leg coupling. The limb oscillator's couplings to the other three limbs + axis exist in
  `buildCpgSpec` but D2 *measures* just one limb's drive on one hip — the other oscillators run
  but are dynamically irrelevant to the single-hip test (no body to couple them to).
- No ground, no contact, no gravity. The hip rotates in free space.
- No multi-segment leg (no knee, no foot). One body = one thigh.
- No UI changes. Headless only; the studio path stays the swim path until D3.

## Decisions

1. **Transfer-function shape: two linear pieces with a stance/swing crossover at φ = 2π·D where
   D = 0.77.** During stance (`φ < 2π·D`), the angle linearly ramps from `+capStance` at φ=0 down
   to `−capSwing` at φ = 2π·D (the leg "rotates backward" as the body would move forward). During
   swing (`φ ≥ 2π·D`), it linearly ramps from `−capSwing` back up to `+capStance` at φ=2π. The
   stance ramp is slow (covers 77 % of the cycle); the swing ramp is fast (23 %). Continuous at
   the join. **Alternative considered:** a cosine-based smooth profile — rejected because the
   paper specifies *piecewise-linear*, and the kink at the join is part of what gives the gait
   its character.

2. **Caps from `angleCaps.yaw` (forward) / `yawBack` (backward).** `capStance = yawForward`
   (positive direction), `capSwing = yawBack ?? yawForward` (negative direction). The transfer
   function's output is already in `[−capSwing, +capStance]` so it cannot exceed the joint's
   `setLimits` cap; the gate verifies this empirically.

3. **Rapier hip = revolute + ForceBased motor, identical to the axial joints.** One static body
   (the pelvis anchor, fixed in world), one dynamic body (the thigh capsule), a single revolute
   joint with world-up axis, `setLimits(-capSwing, +capStance)`, motor model `ForceBased`,
   `configureMotorPosition(target, kStiff, delta)` each step where `target = phaseToTarget(...)`,
   `kStiff` and `delta` are constants (start `kStiff=50`, `delta=1` — tune in the gate).
   **Alternative considered:** an explicit external torque computed from `target − angle`.
   Rejected for the same reason the swim moved to motors in 2026-06-07: explicit integration
   injects energy and runs away.

4. **D2 uses the limb oscillator drive directly.** No coupling to make the limb "lock" — even
   with the other three limbs / axial running in `buildCpgSpec`, the *single* oscillator we read
   (`LIMB_LF`, by convention) cycles at the limb-frequency we set. We log its phase, not assume
   it.

5. **Single-hip rig builder.** Add `buildSingleHipWorld(world, capStance, capSwing)` to a new
   `app/game/locomotion/limbActuation.ts` (separate from `body3d.ts` so the multi-segment chain
   path is not perturbed). Returns `{ pelvis, thigh, joint, capStance, capSwing }`. Same module
   exports `phaseToTarget`.

6. **Gate is headless only.** `scripts/locomotion-3d-walk-actuation-check.ts` sweeps the
   oscillator through ~6 cycles, captures (phase, target, angle, capFrac, angularSpeed) every
   TIMESTEP, and asserts: (a) the angle tracks the target within a small tracking error
   (< 0.15 rad RMS once transient passes), (b) `|angle| ≤ cap` at every step, (c) the time the
   joint's |angular speed| stays below the per-cycle peak-speed median (the slow stance ramp) is
   ~77 % of the period — i.e. the fast swing snap is only ~23 %. (The naive "time at positive
   angle" measurement is *not* a valid stance proxy: with symmetric caps the piecewise-linear
   ramp puts the angle above zero for ~38 % of the cycle by construction.)

## Risks / Trade-offs

- **Motor tuning** → if `kStiff` is too low the angle lags the target enough to fail the tracking
  assertion; if too high the joint may chatter. *Mitigation:* the gate's tracking-error tolerance
  is the tuning knob; start at `kStiff=50, delta=1` (same magnitudes as the swim motors) and dial
  to taste. The gate prints the tracking RMS so the tuning is auditable.
- **Phase wrap at 2π** → linear interpolation across the cycle boundary can produce a
  one-timestep glitch. *Mitigation:* `phaseToTarget` takes the wrapped phase only; the two linear
  pieces are continuous at φ=0 ≡ φ=2π (both give `+capStance`).
- **77 % duty in a 1-second-period oscillator means ~120 ms swing** → the motor must complete the
  swing snap fast. If the chosen `kStiff` cannot reach the cap before the next phase tick, the
  swing ramp truncates and the diagnostic fails. *Mitigation:* the gate measures the realised
  swing-phase duration vs the target 23 % and reports the discrepancy; tuning falls out.
- **Other limb oscillators run but are dynamically irrelevant** → harmless overhead; documenting
  it so the gate output isn't surprising.
