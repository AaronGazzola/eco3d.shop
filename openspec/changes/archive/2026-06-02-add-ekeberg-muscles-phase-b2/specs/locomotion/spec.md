## ADDED Requirements

### Requirement: Ekeberg axial muscle torque

The system SHALL provide an Ekeberg virtual-muscle model at `app/game/locomotion/muscles.ts`. For an axial joint with physical angle `φ`, angular rate `φ̇`, and segment muscle activations `Mˡ`, `Mʳ`, the joint torque SHALL be:

`T = α·(Mˡ − Mʳ) − β·(Mˡ + Mʳ + γ)·φ − δ·φ̇`

with constants from reference Table 5 (simulation column): `α=0.4`, `β=1.2`, `γ=0.2`, `δ=0.1`. A per-segment activation delay of `DELAY_MS=10` SHALL sit between the supplied activation input and the `Mˡ/Mʳ` used in the torque (a ring buffer of recent inputs).

#### Scenario: Pure active term with zero joint angle

- **GIVEN** a joint at `φ=0`, `φ̇=0`, with `Mˡ=2`, `Mʳ=0` (after the delay)
- **THEN** the torque equals `α·(2−0) = 0.8` N·m (only the active term contributes; the stiffness term is zero at `φ=0`)

#### Scenario: Stiffness term restores toward zero

- **GIVEN** a joint at `φ>0` with both activations driven to 0 (`Mˡ=Mʳ=0`)
- **THEN** the torque is `−β·γ·φ − δ·φ̇` — a negative (restoring) torque proportional to the angle, i.e. a spring pulling the joint back toward 0

### Requirement: Solver accepts external joint torques

`stepSolver(state, spec, dt, jointTorques?)` SHALL accept an optional `jointTorques: number[]` (one entry per joint, ordered to match `spec.joints`). When provided, each `jointTorques[i]` SHALL be added to the generalized force at `spec.joints[i].coordIndex`, alongside the existing joint damping and penalty limit stops. When omitted (or all-zero), `stepSolver` SHALL behave identically to its Phase A4 form.

#### Scenario: Omitted torques reproduce A4 behaviour

- **GIVEN** a perturbed chain stepped with no `jointTorques` argument
- **THEN** it settles to rest exactly as in Phase A4 (damping + limit stops only)

#### Scenario: A constant torque holds a joint off-zero

- **GIVEN** a single joint fed a constant positive `jointTorques[i]` within its cap range, all activations such that the muscle stiffness is small
- **WHEN** the solver steps to equilibrium
- **THEN** that joint settles at a non-zero angle where the applied torque balances joint damping + any stiffness, rather than returning to 0

### Requirement: Muscle test mode drives the body from a test sinusoid

`animateStore` SHALL expose `muscleTestRunning` (default `false`), `muscleTestFreq` (default `0.8` Hz), `muscleTestAmplitude` (default `1.0`), and `muscleTestPhasePerSeg` (default `0`) with setters. The muscle module SHALL provide a test activation source producing, per segment `k`, an antiphase one-sided pair `Mˡ = amp·(1+cos(ωt − k·phasePerSeg))` and `Mʳ = amp·(1+cos(ωt − k·phasePerSeg + π))`, `ω = 2π·freq`.

When `muscleTestRunning` is true (Simulate tab, not calibrating, `bodySpec` present), `useLocomotion` SHALL seed solver state from the manual pose on the rising edge, then each frame compute the test activations → Ekeberg torques (per joint, using the current joint angle/rate) → `stepSolver(state, spec, dt, torques)`, and write the resulting joint angles and root pose to the rig. Joint caps SHALL remain enforced by the A4 penalty limit stops (no hard clamp).

Switching to Calibrate SHALL set `muscleTestRunning` to false.

#### Scenario: A driven joint oscillates and then springs back

- **GIVEN** the muscle test running with `amplitude=1.0`, `freq=0.8`, `phasePerSeg=0`
- **WHEN** the user watches one axial joint, then clicks Pause (activations → 0)
- **THEN** while running the joint traces a bounded oscillation, and after Pause the muscle stiffness + damping return it toward 0 and hold it there (the restoring force absent in A4)

#### Scenario: Capture records the driven motion

- **GIVEN** the muscle test running and a Record→Stop cycle
- **THEN** a capture is written whose per-joint angle rows show the sinusoidal drive bounded by the joint caps, and whose KE is non-zero while driven

### Requirement: Simulate sidebar exposes the muscle test

The Simulate tab in `AnimateSidebar` SHALL render a **Muscle test (Phase B2)** section: a **Run / Pause** toggle bound to `muscleTestRunning`, a **frequency** slider (bound to `muscleTestFreq`), an **amplitude** slider (bound to `muscleTestAmplitude`), and a **phase / segment** slider (bound to `muscleTestPhasePerSeg`). Recording reuses the existing Record/Stop control and capture path. These controls are additive to the A-phase solver controls and the B1 CPG controls.

#### Scenario: Muscle test controls are present

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user clicks Run on the Muscle test block
- **THEN** the body begins to flex under muscle torque, with the solver, CPG, and muscle-test controls all present
