## Why

B1 produces the CPG wave in the abstract. B2 builds the **actuation path** that turns oscillator outputs into a joint torque inside the A-phase solver — the Ekeberg virtual-muscle pair from Knüsel et al. (2020) §4. Critically, B2 drives the muscles with a **clean test sinusoid**, not the CPG, so the muscle model and its constants (Table 5) are verified in isolation. If B3's coupled body later looks wrong, B1 and B2 have each independently passed, so the fault is in the wiring — the same containment that made Phase A debuggable.

B2 is also where the body first gains a **restoring force toward a target pose** — the thing A4 deliberately lacked. The Ekeberg stiffness term `−β(Mˡ+Mʳ+γ)·φ` pulls each joint toward zero with a stiffness that grows with total muscle activation. Watching a single joint bend under a sinusoid and spring back is the gate.

## What Changes

- **New muscle module `app/game/locomotion/muscles.ts`.** Implements the Ekeberg torque per axial joint:
  `Tᵢ = α·(Mˡ − Mʳ) − β·(Mˡ + Mʳ + γ)·φᵢ − δ·φ̇ᵢ`
  where `Mˡ, Mʳ` are the segment's left/right muscle activations, `φᵢ` the **physical joint angle** (solver state), `φ̇ᵢ` its rate. Constants from reference Table 5 (simulation column): `α=0.4`, `β=1.2`, `γ=0.2`, `δ=0.1`. A per-joint **10 ms activation delay** ring buffer sits between the input activation `x` and the `M` used in the torque (defaulting to 0 delay is **not** allowed — the delay is part of the model, but B2's test signal is smooth so the delay only shifts phase slightly).
- **Activation source for B2 = a test sinusoid.** B2 introduces `muscleActivation(t, segmentIndex, freqHz, amplitude, phasePerSegmentRad)` producing a left/right antiphase one-sided pair `Mˡ = amp·(1+cos(ωt − k·φ_seg))`, `Mʳ = amp·(1+cos(ωt − k·φ_seg + π))` — the same `r(1+cosθ)` shape B1/B3 will provide, but from a hand-specified clock so the muscle is tested without the CPG. (B3 replaces this source with the real CPG outputs.)
- **Solver actuation hook.** `solver.ts`'s `stepSolver` SHALL accept an optional `jointTorques: number[]` (one per joint, in `coordIndex` order) added into `generalizedForces` alongside the existing damping + limit stops. When absent/zero, behaviour is identical to A4. The muscle torques are computed each frame from the activation source + the current joint angle/rate and passed in.
- **Store + sidebar: muscle test mode.** `animateStore` gains `muscleTestRunning` (default false), `muscleTestFreq` (default `0.8` Hz), `muscleTestAmplitude` (default `1.0`), and a `muscleTestPhasePerSeg` (default `0` — all joints in phase for the simplest single-joint read; nonzero gives a fake travelling input). The Simulate tab gains a **Muscle test (Phase B2)** block: Run/Pause, frequency slider, amplitude slider, phase-per-segment slider, reusing the existing Record/Stop + capture (the capture already records per-joint angle, KE, COM, etc.).
- **useLocomotion: muscle-test branch.** When `muscleTestRunning` (Simulate, not calibrating, bodySpec present), `useLocomotion` SHALL seed solver state from the manual pose on the rising edge, then each frame compute the test activations → muscle torques → `stepSolver(state, spec, dt, torques)`, and write the resulting joint angles + root pose to the rig (same render path as A3/A4). Caps are still enforced by the A4 limit stops, not a hard clamp.

## Capabilities

### Modified Capabilities
- `locomotion`: adds the Ekeberg muscle torque, the solver actuation hook, and the muscle-test driving mode.

## Impact

- **Added files:** `app/game/locomotion/muscles.ts`; `openspec/changes/add-ekeberg-muscles-phase-b2/`.
- **Edited files:** `app/game/locomotion/solver.ts` (`stepSolver` accepts optional `jointTorques`, added into the force vector); `app/game/locomotion/useLocomotion.ts` (muscle-test branch); `app/admin/animate/animateStore.ts` (muscle-test fields + setters); `app/admin/animate/AnimateSidebar.tsx` (Muscle test block).
- **Untouched:** `cpg.ts` (B2 does not use the CPG — that is B3), `body.ts`, `chain.ts`, `AnimatedModel.tsx`, `AnimateScene.tsx`, `/api/diagnostics/route.ts`, Calibrate path. A4 force law unchanged (muscle torque is added on top, not a replacement).
