## 1. Solver types

- [ ] 1.1 Add `app/game/locomotion/types.ts` exporting `SolverState`, `SolverDiagnostics`. `SolverState` carries `rootX`, `rootZ`, `rootHeadingY`, `rootVelX`, `rootVelZ`, `rootHeadingRateY`, `jointAngles: number[]`, `jointRates: number[]`. `SolverDiagnostics` carries `kineticEnergy`, `comX`, `comZ`, `comDriftFromStart`.
- [ ] 1.2 No runtime imports from `solver.ts` in `types.ts` (avoid a cycle).
- [ ] 1.3 `npx tsc --noEmit` passes.

## 2. Zero-force solver

- [ ] 2.1 Add `app/game/locomotion/solver.ts` with the reduced-coordinate planar integrator: `initSolverState`, `stepSolver`, `centerOfMass`, `kineticEnergy`, `nodePositions`, `diagnostics`, plus `seedRootVelocity(state, vx, vz)`. Build the mass matrix from per-segment translational + rotational Jacobians; compute Coriolis bias via finite-difference derivatives of `M`; solve `M · qdd = τ − c` via Gauss elimination; semi-implicit Euler at fixed 2 ms sub-steps; clamp frame `dt` to 50 ms.
- [ ] 2.2 `generalizedForces(spec, q, qd)` SHALL return `new Array(dof).fill(0)`. No joint damping, no limit stops, no actuation.
- [ ] 2.3 Declare and export `JOINT_DAMPING = 0`, `LIMIT_STOP_STIFFNESS = 0`, `LIMIT_STOP_DAMPING = 0`. Declared so A4 can flip them on without restructuring the module.
- [ ] 2.4 `seedRootVelocity` sets `state.rootVelX` and `state.rootVelZ` directly. No joint-rate coupling correction (joint rates are expected to be zero when this is called in A3).
- [ ] 2.5 `npx tsc --noEmit` and `npx eslint` pass on `solver.ts` and `types.ts`.

## 3. Animate store — solver fields

- [ ] 3.1 In `app/admin/animate/animateStore.ts`, add `simRunning: boolean`, `simResetSignal: number`, `simKickSignal: number`, `simDiagnostics: { kineticEnergy: number; comX: number; comZ: number; comDriftFromStart: number }`, `simRecording: boolean`, `lastCapturePath: string | null` to the `AnimateStore` interface and initial state (all numeric defaults `0`, booleans `false`, path `null`).
- [ ] 3.2 Add `setSimRunning`, `requestSimReset`, `requestSimKick`, `setSimDiagnostics`, `setSimRecording`, `setLastCapturePath` setters. `setSimRecording(true)` SHALL also set `lastCapturePath` to `null`. `requestSimReset` / `requestSimKick` increment their signal by 1.
- [ ] 3.3 Modify `setAnimateTab` so that `tab === 'calibrate'` also sets `simRunning` and `simRecording` to `false`.
- [ ] 3.4 `npx tsc --noEmit` passes.

## 4. Diagnostics — re-add solver-tied helpers

- [ ] 4.1 In `app/game/locomotion/diagnostics.ts`, re-add `buildCaptureSpec(spec: BodySpec): CaptureSpec` and `buildSample(t: number, state: SolverState, spec: BodySpec, baseCom: { x: number; z: number }): CaptureSample`. Both import from `./solver` and `./body` / `./types` as needed.
- [ ] 4.2 `buildSample` SHALL populate every `CaptureSample` field: per-joint `rawDeg`/`clampedDeg`/`fracOfCap`/`clamped` (where in A3 with no caps applied at render, `clamped === false` always and `clampedDeg === rawDeg`), root pose + velocity, kinetic energy, COM, drift, max-joint-cap fraction, the NaN flag, and the node-XZ polyline.
- [ ] 4.3 The existing `serializeCapture`, `subsampleSamples`, ASCII plot, and helper code stay unchanged.
- [ ] 4.4 `npx tsc --noEmit` and `npx eslint` pass on `diagnostics.ts`.

## 5. useLocomotion — solver branch

- [ ] 5.1 In `app/game/locomotion/useLocomotion.ts`, add a `SolverHandle` ref carrying `{ spec, state, startCom, kickSignal, resetSignal, diagAccum, recordAccum, recordTime, recordSamples }`.
- [ ] 5.2 Compute `bodySpec` via `useMemo(buildBodySpec(groups, segments))`. (Note: `segments` needs to be threaded through `AnimatedModel` → `useLocomotion` — already done in A2.)
- [ ] 5.3 On a rising edge of `store.simRunning`, allocate a new `SolverHandle`: `state = initSolverState(spec)`; copy `manualPose.rootX/Z` → `state.rootX/Z`, `manualPose.rootYawRad` → `state.rootHeadingY`, and for each chain joint look up `manualPose.jointAnglesRad[childGroupId] ?? 0` → `state.jointAngles[i]`; capture `startCom = centerOfMass(state, spec)`; reset all per-recording timers.
- [ ] 5.4 On a falling edge of `store.simRunning`, drop the `SolverHandle` (next frame falls back to A2 manual-pose path).
- [ ] 5.5 On a change in `store.simResetSignal`, re-initialize the existing handle's state (same way as the rising-edge init).
- [ ] 5.6 On a change in `store.simKickSignal`, call `seedRootVelocity(state, KICK_ROOT_VELOCITY, 0)` once.
- [ ] 5.7 In the running branch each frame: call `stepSolver(state, spec, dt)`, then write root + chain pivots from solver state (unclamped — A3 has no caps), keep the head pivot at identity, keep legs at identity.
- [ ] 5.8 Accumulate `dt` into `diagAccum`; when `≥ 0.1 s`, push a `SolverDiagnostics` snapshot to the store and subtract `0.1` from the accumulator.
- [ ] 5.9 `npx tsc --noEmit` and `npx eslint` pass.

## 6. useLocomotion — recording

- [ ] 6.1 On a rising edge of `store.simRecording`, reset `recordSamples = []`, `recordAccum = RECORD_INTERVAL` (so the first frame pushes), `recordTime = 0`. Capture `recordBaseCom = centerOfMass(state, spec)`.
- [ ] 6.2 While `simRecording && simRunning`, after `stepSolver`, advance `recordTime += dt`, `recordAccum += dt`; if `recordAccum ≥ RECORD_INTERVAL` (0.05 s), push `buildSample(recordTime, state, spec, recordBaseCom)` and zero `recordAccum`.
- [ ] 6.3 On a falling edge of `store.simRecording`, if `recordSamples.length > 0`: serialize via `serializeCapture(buildCaptureSpec(spec), subsampleSamples(recordSamples, MAX_OUTPUT_SAMPLES))` and POST to `/api/diagnostics`. On 2xx, write the returned `path` to `lastCapturePath`. On error, `console.error` and write `'failed — see console'`.
- [ ] 6.4 If the solver is paused while recording, sample pushes stop but the buffer is preserved.
- [ ] 6.5 `npx tsc --noEmit` and `npx eslint` pass.

## 7. Sidebar — solver controls

- [ ] 7.1 In `app/admin/animate/AnimateSidebar.tsx`, add a new section at the top of the Simulate tab containing four buttons: Run/Pause, Reset, Kick translation, Record/Stop. Bind them to the store actions. Style the Run button green when running, the Record button red when recording.
- [ ] 7.2 Below the buttons, add a diagnostics block showing `Kinetic energy` (exponential, 2 sig figs) and `COM drift` (exponential, 2 sig figs) from `simDiagnostics`.
- [ ] 7.3 Below the diagnostics, show `lastCapturePath` in a monospaced label when non-null.
- [ ] 7.4 Wrap the existing manual sliders + Reset pose button in a container whose `opacity` is `0.4` and whose pointer events are disabled when `simRunning` is `true`. The container's content stays mounted (so toggling Run doesn't reset slider state).
- [ ] 7.5 `npx tsc --noEmit` and `npx eslint` pass.

## 8. Visual gate

- [ ] 8.1 With the rig loaded and `simRunning` false, click **Run** then **Kick translation**. The body slides smoothly along world `+x` at constant speed; the chain does not bend; there is no spin.
- [ ] 8.2 After ~1 second of running, the `COM drift` readout shows `~5.0e-1` (the kick magnitude); `Kinetic energy` is constant (small relative drift due to numerical scheme is acceptable, < 1% over 5 s).
- [ ] 8.3 Click **Pause**. The body stops where it is. Click **Reset**. The body returns to its `manualPose` position.
- [ ] 8.4 Move a manual joint slider so the body has a small bend, click **Run**, then **Kick translation**. The body translates without spinning (the bend is preserved; with no forces the chain is rigid relative to root frame).
- [ ] 8.5 Click **Run**, **Record**, let it run for ~3 s, then **Stop**. A capture file appears in `documentation/diagnostics/`, its path shown in the sidebar. The `## scalars` rows show `rootX` growing linearly and `KE` essentially flat.
- [ ] 8.6 Switching to **Calibrate** while Running stops the sim; switching back to Simulate retains the last `manualPose` and the **Run** button is in the paused state.

## 9. Documentation

- [ ] 9.1 Update `documentation/animation-roadmap.md` § 4 (Status) with a dated note describing the A3 landing and the visual gate result.

## 10. OpenSpec validation

- [ ] 10.1 `npx openspec validate add-zero-force-solver-phase-a3 --strict` passes.
