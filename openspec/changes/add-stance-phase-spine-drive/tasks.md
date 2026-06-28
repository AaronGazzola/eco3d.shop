## 1. Config

- [x] 1.1 Add `stanceMuscleBoost` to `SimConfig` (default `0`) in `animateStore.ts` with a clamped-non-negative setter and include it in `pickSimConfig`/`DEFAULT_SIM_CONFIG`.

## 2. Drive

- [x] 2.1 In `useLocomotion`, compute `stanceFrac` once per frame from `c.mechPhase` + `stepShift`/`stepDuty` (fraction of hips with `rel < stepDuty`).
- [x] 2.2 In the axial muscle loop, scale the active gain: `alphaEff = alpha * (1 + stanceMuscleBoost * stanceFrac)`; use `alphaEff` in `phiEq`. Leave `kStiff` (beta) unchanged. `stanceMuscleBoost = 0` byte-identical (alphaEff = alpha).

## 3. UI

- [x] 3.1 Add a `Stance spine boost` slider (0..3) to the Simulate sidebar, in the muscle section.

## 4. Observe + verify

- [x] 4.1 `tsc` + eslint clean.
- [x] 4.2 Captured Walk at boost 0 / 1.0 / 1.5 / 2.5 via `observe-cycle.mjs`. Result: drift scales strongly with boost (~2-3x at 1.0-1.5) confirming the spine pushes during stance; tilt bounded at boost <=1.5, destabilizes (tips over) at 2.5. Frames looked at: the spine pushes harder but the trunk remains over-coiled (the dominant "not a walk" cause is trunk amplitude, a separate lever).
- [x] 4.3 Boost 0 is unchanged by construction (alphaEff = alpha). Note: cross-run drift/tilt vary because captures are not yet seek-reproducible (seek is the harness Increment B follow-up); the code path is identical.
