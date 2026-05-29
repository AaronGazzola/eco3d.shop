## 1. CPG module

- [ ] 1.1 Add `app/game/locomotion/cpg.ts` with `CpgState` (phases `number[]`, amplitudes `number[]`, both length `2N`), `CpgSpec` (per-oscillator `e`, `d_th`, and a coupling list `{from, to, w, phi}`), and constants `A_GAIN=5`, `B_SAT=500`, `E_AXIAL=1.1`, `D_TH_AXIAL=3`, `BODY_WAVES=1.58`.
- [ ] 1.2 `buildCpgSpec(bodySpec)`: N = axial segment count; emit intrasegmental couplings (`k↔k+N`, `w=10`, `φ=π`), head→tail (`k→k+1` and `k+N→k+1+N`, `w=5`, length-weighted `+φ`), tail→head (`w=1`, `−φ`). Length-weighted `φₖ = (lenₖ/Σlen)·2π·BODY_WAVES`.
- [ ] 1.3 `initCpgState(spec)`: phases 0, amplitudes 0 (or a small documented seed).
- [ ] 1.4 `stepCpg(state, spec, drive, excitability, dt)`: fixed 2 ms sub-steps (dt clamped to 50 ms); per oscillator integrate `θ̇ = 2π·drive·excitability·e + Σ r_j·w·sin(θ_j−θ_i−φ)` and `ṙ = 5·(R−r)`, `R = drive·P`, `P = 1/(1+exp(500·(drive−d_th)))`; wrap phases mod 2π.
- [ ] 1.5 `oscillatorOutput(state,i) = r·(1+cos θ)`; `signedActivation(state,k) = output(k) − output(k+N)`.
- [ ] 1.6 No imports from `solver.ts` (CPG is independent of body state); may import `BodySpec` from `body.ts`.
- [ ] 1.7 `npx tsc --noEmit` and `npx eslint` pass on `cpg.ts`.

## 2. Store — CPG controls

- [ ] 2.1 In `animateStore.ts`, add `cpgDrive` (1.0), `cpgExcitability` (1.0), `cpgRunning` (false), `cpgRecording` (false) + setters `setCpgDrive`, `setCpgExcitability`, `setCpgRunning`, `setCpgRecording`. `setCpgRecording(true)` clears `lastCapturePath`.
- [ ] 2.2 `setAnimateTab('calibrate')` also sets `cpgRunning` and `cpgRecording` to false.
- [ ] 2.3 `npx tsc --noEmit` passes.

## 3. Diagnostics — CPG capture + space-time serializer

- [ ] 3.1 In `diagnostics.ts`, add `CpgCaptureSpec`/`CpgCaptureSample` types, `buildCpgCaptureSpec(spec)`, and `buildCpgSample(t, state, spec)` (records `t`, per-segment `signedActivation`, per-oscillator phase).
- [ ] 3.2 Add a CPG serializer (or extend `serializeCapture`) that emits: a space-time ASCII grid (rows = segments head→tail, columns = time, glyph from a magnitude ramp ` .:-=+*#` keyed by signed activation), a per-segment phase snapshot at the final sample, and the measured fundamental frequency of segment 0 (zero-crossing interval of its signed activation).
- [ ] 3.3 `subsampleSamples` (or a CPG equivalent) caps the column count for the grid.
- [ ] 3.4 `npx tsc --noEmit` and `npx eslint` pass.

## 4. useLocomotion — CPG preview clock + recording

- [ ] 4.1 Add a `cpgRef` holding `{ spec, state, recordSamples, recordTime, recordAccum }` and `wasCpgRecordingRef`.
- [ ] 4.2 Build the CPG spec via `useMemo(buildCpgSpec(bodySpec))` (null-safe).
- [ ] 4.3 When `cpgRunning` && Simulate && !calibrating && bodySpec: allocate/refresh the CPG handle on the rising edge, then `stepCpg(state, spec, cpgDrive, cpgExcitability, dt)` each frame. Do NOT write any pivot or root transform.
- [ ] 4.4 While `cpgRecording`: append `buildCpgSample` at ~50 ms; on the falling edge, serialize + POST to `/api/diagnostics`, set `lastCapturePath` (reuse the existing `postCapture` helper).
- [ ] 4.5 `npx tsc --noEmit` and `npx eslint` pass.

## 5. Sidebar — CPG section

- [ ] 5.1 In `AnimateSidebar.tsx`, add a **CPG (Phase B1)** block: drive slider (0–2), excitability slider (0–2, default 1), Run/Pause CPG toggle, Record/Stop toggle + last capture path. Additive to the solver controls.
- [ ] 5.2 `npx tsc --noEmit` and `npx eslint` pass.

## 6. Visual gate

- [ ] 6.1 Load the rig, set drive ≈ 1.0, click Run CPG, then Record for a few seconds, Stop. A capture appears.
- [ ] 6.2 Read the capture: the space-time grid shows a head→tail traveling wave (diagonal stripes); the per-segment phase snapshot shows monotonic head→tail lag summing to ≈ `2π·BODY_WAVES`; the reported frequency ≈ `drive·excitability·1.1`.
- [ ] 6.3 Raise excitability → frequency rises, bend amplitude (signed-activation magnitude) roughly unchanged. Raise drive → both frequency and amplitude rise. Confirm in a capture.
- [ ] 6.4 Confirm the rendered body did not move during the CPG run (B1 drives no body).

## 7. Documentation

- [ ] 7.1 Update `documentation/animation-roadmap.md` § 4 (Status) with a dated B1 note + the verified wave behaviour and any `BODY_WAVES` observation.

## 8. OpenSpec validation

- [ ] 8.1 `npx openspec validate add-cpg-network-phase-b1 --strict` passes.
