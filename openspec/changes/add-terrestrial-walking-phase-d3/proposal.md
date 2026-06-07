# Add terrestrial coupled walking (Phase D3)

## Why

D3 is the **coupling** beat of Phase D, mirroring B3 (CPG ↔ muscle ↔ body coupled swim): wire D1's
four limb oscillators through D2's piecewise-linear transfer function into four physical 1-DOF
rotational hips on the actual rig, add gravity, add a ground plane, and turn off the swim's planar
projection. The diagonal-trot signal + the axial wave + body inertia + gravity together should
produce **visible forward walking** in the studio. This is the change where the salamander stops
swimming and starts walking.

The signal works (D1 gate), the actuator works (D2 gate). What's still untested is whether the
**combination** — four legs cycling diagonally, an axial wave pulled toward standing by D1's
limb↔axial couplings, gravity loading the legs against a ground plane — produces forward
locomotion. Whether it does is fundamentally **visual** (does the dragon walk?); no headless number
substitutes for that.

## What Changes

- **Body builder extended with four hips + four thighs.** `body3d.ts` gains a leg-attachment pass:
  for each `leg-left` / `leg-right` group, build a dynamic thigh capsule attached to its girdle
  spine body via a revolute joint at the hip node (`nodeHipLeft` / `nodeHipRight`); axis world-up;
  `setLimits` from `angleCaps.yaw` / `yawBack`; `ForceBased` motor.
- **Controller drives the four hips from the CPG.** In the coupled-running loop, each step computes
  `target_i = phaseToTarget(limbPhase(state, spec, i), capStance_i, capSwing_i)` for
  `i ∈ {LF, RF, LH, RH}` and calls `configureMotorPosition(target, kStiff, delta)` on each hip
  joint, alongside the existing axial-Ekeberg motor pattern.
- **Gravity + ground.** `useLocomotion` sets the Rapier world's gravity to `(0, −9.81, 0)` when
  running coupled with environment enabled (was zero for the floating swim), and adds a static
  ground body with a horizontal plane collider just below the rig's rest height.
- **Planar projection disabled.** `PLANAR_SWIM` becomes a per-run mode (`'swim' | 'walk'`); the
  coupled run uses `'walk'` mode by default, which skips `planarProject`. Swim mode remains
  available for backward compatibility / regression testing.
- **Studio toggle for walk mode.** A simple toggle in the Simulate tab picks between *swim*
  (gravity off, planar projection on — the existing calibrated swim) and *walk* (gravity on,
  ground on, planar projection off, hips actuated).
- **Manual visual gate.** Browser run, walk mode, default drive: the rig walks forward on the
  ground with the diagonal-trot rhythm visible in the leg motion. The user verifies in the
  studio; no headless test substitutes.

Out of scope: foot-contact ground-reaction-force model (legs are passive capsules colliding with
the plane), turning, stop/start, gait transitions, terrain.

## Capabilities

### New Capabilities
(none — D3 extends the existing locomotion capability)

### Modified Capabilities
- `locomotion`: add the four-hip-actuation, gravity, ground, and walk-mode requirements

## Impact

- **Specs:** `locomotion` — add walk-mode requirements (four-hip wiring, gravity, ground plane,
  planar projection disabled in walk mode, observable diagonal-trot leg motion).
- **Code:**
  - `body3d.ts` — leg-builder pass adds 4 thigh bodies + 4 hip revolute joints with `ForceBased`
    motors; new field `hipJoints: { limbIdx, joint, capStance, capSwing }[]`.
  - `useLocomotion.ts` — `coupledMode: 'swim' | 'walk'` from the store; on walk, set Rapier
    gravity, build the ground, drive the 4 hips each step via `phaseToTarget`, skip
    `planarProject`.
  - `animateStore.ts` — `coupledMode` + setter; default `'swim'` to preserve the calibrated swim
    on the existing path.
  - Simulate-tab UI — a 2-button group to switch coupledMode.
- **Reuses unchanged:** the axial-Ekeberg motor wiring (B3), `cpg.ts` D1, `limbActuation.ts` D2,
  the existing studio render pipeline (each leg already renders at its `attachedToSpineId` child
  group — the truthful-render path from B3 will pick up the new thigh bodies automatically).
