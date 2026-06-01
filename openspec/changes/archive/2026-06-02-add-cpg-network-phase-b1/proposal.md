## Why

Phase A built and verified the passive body (renderer, integrator, damping + limit stops). Phase B adds the controller that makes it move. Following the Phase A lesson — never bundle signal, actuation, and coupling in one change — Phase B splits into **B1 (CPG signal) → B2 (Ekeberg muscles) → B3 (couple to body)**. This change is **B1**: the central pattern generator alone, producing the rhythmic head→tail traveling wave, with **no body and no muscles**.

Isolating the CPG lets us verify the single most novel piece of math — the coupled phase-oscillator network from Knüsel et al. (2020) §2–§3 — against a falsifiable gate (does the wave actually travel head→tail with the right phase lag and amplitude?) before any body dynamics can confound it. Because the CPG's equations don't depend on body state (feedback `s=0` in v1), the network runs on its own fixed-step clock and never touches the A-phase solver.

Scope note: Phase B is **axial-only**. The 4 limb oscillators and limb↔axial coupling belong to walking (Phase D); the environment belongs to Phase C. B1 builds just the **axial double chain** — N segments, each with a left and right oscillator.

## What Changes

- **New CPG module `app/game/locomotion/cpg.ts`.** Implements the axial double chain from the reference:
  - State: per-oscillator phase `θ` and amplitude `r`, for `2N` oscillators (left chain `0..N-1`, right chain `N..2N-1`), where `N` = axial segment count from the `BodySpec`.
  - `buildCpgSpec(bodySpec)`: derives per-oscillator excitability `e` (axial `1.1`), saturation threshold `d_th` (axial `3`), and the coupling list. Couplings (Table 2): intrasegmental left↔right `w=10, φ=π`; intersegmental head→tail `w=5`; tail→head `w=1`. The head→tail/tail→head phase bias is **length-weighted** per Decision 6: `φₖ = (segmentₖ length / Σ lengths) · 2π · BODY_WAVES` for the head→tail direction and its negation for tail→head, with `BODY_WAVES = 1.58` (a named, tunable constant).
  - `initCpgState(spec)`, `stepCpg(state, spec, drive, excitability, dt)`: integrate the phase equation `θ̇ᵢ = 2π·νᵢ + Σⱼ rⱼ·wᵢⱼ·sin(θⱼ−θᵢ−φᵢⱼ)` and amplitude equation `ṙᵢ = a·(Rᵢ−rᵢ)` (with `a=5`, feedback term dropped), `νᵢ = drive·excitability·eᵢ`, `Rᵢ = drive·P(drive,d_th)`, `P = 1/(1+e^(b·(drive−d_th)))` with `b=500`. Fixed sub-step (2 ms), frame `dt` clamped to 50 ms.
  - `oscillatorOutput(state,i) = rᵢ·(1+cos θᵢ)` and `signedActivation(state,k) = output(left k) − output(right k)` — the per-segment signed bend the muscles will consume in B2/B3.
- **Store: CPG controls.** `animateStore` gains `cpgDrive` (default `1.0`), `cpgExcitability` (default `1.0`), `cpgRunning` (default `false`), `cpgRecording` (default `false`), with setters. (These are independent of the A-phase `sim*` fields; the CPG preview is its own mode.)
- **useLocomotion: CPG preview clock.** When `cpgRunning` is true (Simulate tab, not calibrating), `useLocomotion` SHALL step the CPG each frame and — while `cpgRecording` — append a CPG sample (time + per-segment signed activation + per-oscillator phase) to a buffer. B1 does **not** drive the body: the rendered rig stays at its manual/rest pose. On a falling edge of `cpgRecording`, the buffer is serialized and POSTed to `/api/diagnostics`.
- **Diagnostics: space-time capture section.** `diagnostics.ts` gains a CPG capture path: `buildCpgCaptureSpec` + `buildCpgSample`, and the serializer emits a **space-time ASCII plot** (rows = segment index head→tail, columns = time, glyph by signed-activation sign/magnitude) so a head→tail traveling wave reads as diagonal stripes. Also emits a numeric per-segment phase-lag summary (lag accumulated head→tail) and the measured cycle frequency.
- **Sidebar: CPG section.** The Simulate tab gains a **CPG (Phase B1)** block: a **drive** slider (`0–2`), an **excitability** slider (`0–2`, default 1), a **Run/Pause CPG** toggle, and a **Record/Stop** toggle with the last capture path. This is additive to the A-phase solver controls.

## Capabilities

### Modified Capabilities
- `locomotion`: adds the CPG oscillator network, its control surface (drive + excitability), and the space-time wave capture.

## Impact

- **Added files:** `app/game/locomotion/cpg.ts`; `openspec/changes/add-cpg-network-phase-b1/`.
- **Edited files:** `app/game/locomotion/diagnostics.ts` (CPG capture spec/sample + space-time serializer section); `app/game/locomotion/useLocomotion.ts` (CPG preview clock + recording edges); `app/admin/animate/animateStore.ts` (CPG fields + setters); `app/admin/animate/AnimateSidebar.tsx` (CPG controls block).
- **Untouched:** `solver.ts`, `body.ts`, `chain.ts`, `AnimatedModel.tsx`, `AnimateScene.tsx`, `/api/diagnostics/route.ts`, the Calibrate path, and all A-phase solver behaviour (the CPG does not drive the body in B1).
