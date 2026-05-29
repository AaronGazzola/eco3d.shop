## Why

B1 produced the CPG wave (verified in the abstract). B2 produced the Ekeberg actuation path (verified with a test sinusoid). B3 **connects them**: the CPG's per-segment oscillator outputs become the muscle activations that drive the body solver, and we verify the headline Phase B result — **the body undulates in a head→tail travelling wave under its own CPG drive, in place** (no environment yet, so no net thrust). This is the first time the controller, muscles, and body run as one closed pipeline. Because B1 and B2 each passed their own gate, any failure here localizes to the coupling.

## What Changes

- **Coupling in `useLocomotion`.** A new driving mode (Phase B3) where, each frame: step the CPG (`stepCpg` with the B1 drive/excitability), read each segment's left/right oscillator outputs `Mˡ = oscillatorOutput(left k)`, `Mʳ = oscillatorOutput(right k)`, push them through the B2 per-segment 10 ms activation-delay buffer, compute the Ekeberg torque per joint using the current solver joint angle/rate, and `stepSolver(state, spec, dt, torques)`. The CPG and the body share the one frame clock but remain separate integrators (CPG state is not the body state).
- **Store + sidebar: a single Phase-B run mode.** Replace the separate B1 CPG-preview and B2 muscle-test toggles with one **CPG drive (Phase B3)** Run/Pause that runs the full CPG→muscle→body pipeline, reusing the B1 `drive`/`excitability` sliders and the existing Record/Stop + capture. The B1 preview and B2 test controls MAY be retained behind the scenes for debugging but the primary control is the coupled run. `muscleTestRunning` and `cpgRunning` (preview) become mutually exclusive with the coupled run.
- **Capture: combined section.** The capture for a B3 run SHALL include both the body section (per-joint angle, KE, COM drift, `maxJointFracOfCap`, node polyline, ASCII top-down — from A3/A4) and the CPG space-time section (from B1), so we can read the commanded wave and the resulting body shape side by side and confirm they correspond (the body's bend at segment k should track the CPG's signed activation at segment k, lagged by the muscle dynamics).
- **`BODY_WAVES` retune.** B3 is where the wave count is judged against the actual body: if the undulation shows too many/few crests for a salamander-like gait, `BODY_WAVES` (the B1 constant) is retuned here and the final value recorded.

## Capabilities

### Modified Capabilities
- `locomotion`: couples the CPG to the Ekeberg muscles into the body solver; adds the coupled-run control and the combined capture; finalizes `BODY_WAVES`.

## Impact

- **Edited files:** `app/game/locomotion/useLocomotion.ts` (the coupled CPG→muscle→body driving mode); `app/admin/animate/animateStore.ts` (a coupled-run flag; mutual exclusion with the B1/B2 modes); `app/admin/animate/AnimateSidebar.tsx` (the **CPG drive (Phase B3)** control); `app/game/locomotion/diagnostics.ts` (combined body+CPG capture for a coupled run); possibly `app/game/locomotion/cpg.ts` (`BODY_WAVES` value only, if retuned).
- **Untouched:** `solver.ts` (the B2 `jointTorques` hook already supports this), `muscles.ts` (the B2 torque + delay already support this), `body.ts`, `chain.ts`, `AnimatedModel.tsx`, `AnimateScene.tsx`, `/api/diagnostics/route.ts`, Calibrate path.
