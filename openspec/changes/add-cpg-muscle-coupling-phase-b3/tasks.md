## 1. Mode consolidation

- [ ] 1.1 In `animateStore.ts`, introduce a single `activeSimMode: 'off' | 'passive' | 'cpgPreview' | 'muscleTest' | 'coupled'` (replacing the independent `simRunning` / `cpgRunning` / `muscleTestRunning` booleans, or derived from a setter that enforces exclusivity). Keep `simRecording`, the sliders, and signals.
- [ ] 1.2 A setter `setActiveSimMode(mode)` SHALL set exactly one mode; `setAnimateTab('calibrate')` SHALL set it to `'off'`.
- [ ] 1.3 Update A-phase / B1 / B2 sidebar controls to drive `activeSimMode` instead of their own booleans.
- [ ] 1.4 `npx tsc --noEmit` passes.

## 2. Joint ↔ CPG-segment map

- [ ] 2.1 In `useLocomotion.ts`, build `jointToCpgSegment: number[]` once per `bodySpec` (memoized): for each `spec.joints[i]`, the CPG segment on its child side. Assert `spec.joints.length === N_cpgSegments − 1` (head has no parent joint); on mismatch `console.error` and refuse to drive coupled.
- [ ] 2.2 `npx tsc --noEmit` passes.

## 3. Coupled driving mode

- [ ] 3.1 In `useLocomotion.ts`, add the `coupled` branch: on the rising edge seed body state from `manualPose` and (re)init the CPG state + per-segment delay buffers. Each frame: `stepCpg(...)`; per joint read `(mL,mR)` from `oscillatorOutput(k)`/`oscillatorOutput(k+N)`, push through the delay, compute `ekebergTorque` with current `jointAngles[i]`/`jointRates[i]`; `stepSolver(state, spec, dt, torques)`; write pivots + root (A3/A4 render path); head identity; legs identity.
- [ ] 3.2 Guard branch order so `coupled` supersedes `muscleTest`/`passive`, and `cpgPreview` (no-body) never coexists with `coupled`.
- [ ] 3.3 `npx tsc --noEmit` and `npx eslint` pass.

## 4. Combined capture

- [ ] 4.1 In `diagnostics.ts`, for a coupled run record both a body sample (existing `buildSample`) and a CPG sample (`buildCpgSample`) per recording tick.
- [ ] 4.2 The serializer for a coupled capture emits the body sections (scalars / joints / shape / ascii) followed by the CPG space-time section, in one file.
- [ ] 4.3 `npx tsc --noEmit` and `npx eslint` pass.

## 5. Sidebar — coupled control

- [ ] 5.1 In `AnimateSidebar.tsx`, add a **CPG drive (Phase B3)** Run/Pause bound to `activeSimMode==='coupled'`, reusing the B1 drive/excitability sliders and the Record/Stop + capture path. Visually distinct; mutually exclusive with the other modes (enforced by `setActiveSimMode`).
- [ ] 5.2 `npx tsc --noEmit` and `npx eslint` pass.

## 6. Visual gate + tuning

- [ ] 6.1 Load the rig, set drive ≈ 1.0, click CPG drive (Phase B3) Run. The body undulates head→tail in place.
- [ ] 6.2 Record a coupled capture. Confirm: per-joint body angles oscillate with head→tail phase lag; the CPG space-time section travels in the same direction; the body lags the command. KE bounded (not growing); `maxJointFracOfCap` peaks ≤ ~100% (or note where caps clamp the bend).
- [ ] 6.3 Judge the wave count against a salamander-like undulation; retune `BODY_WAVES` in `cpg.ts` if needed and re-capture. Record the final value.
- [ ] 6.4 Note the COM drift magnitude (some is physical without hydrodynamics); flag if it looks like an asymmetry bug rather than missing drag.
- [ ] 6.5 Confirm mode exclusivity: starting coupled stops a running muscle test / passive run; Calibrate stops everything.

## 7. Documentation

- [ ] 7.1 Update `documentation/animation-roadmap.md` § 4 (Status) with a dated B3 note: coupled undulation verified, final `BODY_WAVES`, COM-drift observation. Mark Phase B complete.

## 8. OpenSpec validation

- [ ] 8.1 `npx openspec validate add-cpg-muscle-coupling-phase-b3 --strict` passes.
