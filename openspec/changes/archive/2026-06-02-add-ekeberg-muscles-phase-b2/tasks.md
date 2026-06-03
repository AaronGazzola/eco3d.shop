## 1. Muscle module

- [x] 1.1 Add `app/game/locomotion/muscles.ts` with constants `ALPHA=0.4`, `BETA=1.2`, `GAMMA=0.2`, `DELTA=0.1`, `DELAY_MS=10`.
- [x] 1.2 `ekebergTorque(mL, mR, phi, phiDot)` → `ALPHA*(mL−mR) − BETA*(mL+mR+GAMMA)*phi − DELTA*phiDot`.
- [x] 1.3 A per-segment activation delay buffer (ring buffer of recent `(mL,mR)`; ~`DELAY_MS/substep` entries) with a `pushAndReadDelayed` helper.
- [x] 1.4 Test source `testActivation(t, k, freqHz, amplitude, phasePerSeg)` → `{ mL, mR }` antiphase one-sided pair.
- [x] 1.5 `npx tsc --noEmit` and `npx eslint` pass.

## 2. Solver actuation hook

- [x] 2.1 In `solver.ts`, add optional `jointTorques?: number[]` to `stepSolver`; thread it into the sub-step so `generalizedForces` adds `jointTorques[i]` at `spec.joints[i].coordIndex`. Omitted/undefined → identical to A4.
- [x] 2.2 Keep the existing damping + limit-stop terms unchanged (muscle torque is additive).
- [x] 2.3 `npx tsc --noEmit` and `npx eslint` pass; an unforced perturb still settles as in A4.

## 3. Store — muscle test fields

- [x] 3.1 In `animateStore.ts`, add `muscleTestRunning` (false), `muscleTestFreq` (0.8), `muscleTestAmplitude` (1.0), `muscleTestPhasePerSeg` (0) + setters.
- [x] 3.2 `setAnimateTab('calibrate')` also sets `muscleTestRunning` false.
- [x] 3.3 `npx tsc --noEmit` passes.

## 4. useLocomotion — muscle-test branch

- [x] 4.1 Add a branch: when `muscleTestRunning` && Simulate && !calibrating && bodySpec, on the rising edge seed solver state from `manualPose` (reuse `seedFromManualPose`), maintain a per-segment delay buffer.
- [x] 4.2 Each frame: for each joint compute `(mL,mR)` from `testActivation` (segment = `spec.joints[i].segmentIndex`'s segment index among axial segments), push through the delay buffer, compute `ekebergTorque` with the current `jointAngles[i]`/`jointRates[i]`, assemble `jointTorques`, call `stepSolver(state, spec, dt, jointTorques)`.
- [x] 4.3 Write root + chain pivots from solver state (same render path as the A3/A4 branch); head identity; legs identity.
- [x] 4.4 Recording + diagnostics reuse the existing solver capture path (per-joint angle, KE, COM, maxJointFracOfCap).
- [x] 4.5 Ensure only one driving mode is active at a time (muscle test vs A-phase Run vs CPG preview) — guard the branch order so they do not both step the body.
- [x] 4.6 `npx tsc --noEmit` and `npx eslint` pass.

## 5. Sidebar — Muscle test section

- [x] 5.1 In `AnimateSidebar.tsx`, add a **Muscle test (Phase B2)** block: Run/Pause toggle, frequency slider, amplitude slider, phase/segment slider. Additive to existing controls.
- [x] 5.2 `npx tsc --noEmit` and `npx eslint` pass.

## 6. Visual gate

- [x] 6.1 Load the rig, set amplitude ≈ 1, freq ≈ 0.8, phase/seg = 0, click Run. The chain flexes; pick one joint and confirm it traces a bounded sinusoid within its caps.
- [x] 6.2 Click Pause (activations → 0). The joint springs back toward 0 and holds — the restoring force A4 lacked. Confirm via a capture (angle returns toward 0, KE → 0).
- [x] 6.3 Raise amplitude → larger bend (until caps clamp); raise frequency → faster oscillation. Set phase/seg > 0 → a travelling input ripples down the chain.
- [x] 6.4 Confirm an unforced perturb (A-phase Kick joints) still behaves exactly as A4 (the torque hook defaults off).

## 7. Documentation

- [x] 7.1 Update `documentation/animation-roadmap.md` § 4 (Status) with a dated B2 note: muscle torque verified, restoring-force behaviour, any α/β/δ-vs-A4-damping interplay observed.

## 8. OpenSpec validation

- [x] 8.1 `npx openspec validate add-ekeberg-muscles-phase-b2 --strict` passes.
