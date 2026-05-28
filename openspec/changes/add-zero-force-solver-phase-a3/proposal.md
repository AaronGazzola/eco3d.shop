## Why

A2 installed the renderer half of Phase A: a manual pose flows through `BodySpec`, the `rootRef`-bound model group, and reparented leg children to the screen, and the visual gate confirmed the data path. A3 brings the **other half of Phase A** back online — the planar multibody integrator that A2's renderer was designed to consume — but does it *with every force term disabled*, so the integrator can be verified in isolation before A4 turns damping and limit stops back on.

The earlier Phase A failure had two compounding sources: a broken render path (fixed in A2) and force terms misbehaving under chaotic initial conditions (still to come in A4). Putting them in one commit meant we could not tell which was wrong. A3 isolates the integrator: with no damping, no penalty limit stops, no perturb-on-demand, the only physics is conservation of momentum. The gate is therefore a sharp, falsifiable one — **a free body in vacuum drifts in a straight line at constant speed**. If a Coriolis sign is wrong, the mass matrix is asymmetric, or the integrator leaks momentum, that drift bends, spins, or slows, and we see it directly.

## What Changes

- **Solver module re-introduced.** `app/game/locomotion/solver.ts` and `app/game/locomotion/types.ts` SHALL be added. `types.ts` carries `SolverState` (root XZ + heading + their rates, plus per-joint angles and rates) and a `SolverDiagnostics` shape. `solver.ts` carries `initSolverState`, `stepSolver(state, spec, dt)`, `centerOfMass`, `kineticEnergy`, `nodePositions`, `diagnostics`, and the helper `seedRootVelocity(state, vx, vz)` that A3 uses for its kick. `stepSolver` SHALL build the full coupled mass matrix from segment Jacobians, compute Coriolis/centrifugal terms from finite-difference mass-matrix derivatives, integrate with semi-implicit Euler at a fixed sub-step (2 ms), and clamp the frame timestep. **No force terms.** `generalizedForces` SHALL return the zero vector — no joint damping, no limit stops, no perturb forces. The constants for those terms still exist but SHALL be exported as zero for A3 and overridden by A4.

- **Animate store gains solver state.** `animateStore` SHALL carry `simRunning: boolean`, `simResetSignal: number`, `simKickSignal: number`, `simDiagnostics: { kineticEnergy; comDriftFromStart; comX; comZ }`, plus the recording fields `simRecording: boolean` and `lastCapturePath: string | null`. Setters: `setSimRunning`, `requestSimReset`, `requestSimKick`, `setSimDiagnostics`, `setSimRecording`, `setLastCapturePath`. Switching to Calibrate SHALL set `simRunning` and `simRecording` to `false`.

- **`useLocomotion` gains a solver branch.** When `simRunning` is true and a `BodySpec` resolves from the current rig, `useLocomotion` SHALL step the solver each frame and write its state to the rendered scene: `rootRef.position` from `state.rootX/Z`, `rootRef.quaternion` from `state.rootHeadingY` (Y-axis), and each chain joint's pivot from `state.jointAngles[i]` (Y-axis). The head pivot remains identity. Legs remain rigid passengers of their parent spine pivot (A2 behaviour unchanged).
  - On a *rising edge* of `simRunning` (false→true): solver state is **initialized from `manualPose`** — `rootX/Z = manualPose.rootX/Z`, `rootHeadingY = manualPose.rootYawRad`, each `jointAngles[i] = manualPose.jointAnglesRad[childGroupId] ?? 0`. All rates start at zero. The COM at that moment is captured as the drift baseline.
  - On a *falling edge* (true→false): the solver stops stepping; render falls back to the A2 manual-pose path on the next frame.
  - On `simResetSignal` change: solver state re-initializes from `manualPose` (as if running just started). The drift baseline resets.
  - On `simKickSignal` change: `state.rootVelX` is set to a small constant (`KICK_ROOT_VELOCITY`, default 0.5 world units / second). No other state changes.

- **Diagnostics every 100 ms.** While running, `useLocomotion` SHALL push a `SolverDiagnostics` snapshot to the store every 0.1 s — `kineticEnergy`, `comX`, `comZ`, `comDriftFromStart`. The sidebar displays these.

- **Capture pipeline re-wired.** A3 re-introduces `buildSample(t, state, spec, baseCom)` and `buildCaptureSpec(spec)` inside `diagnostics.ts` (they were removed in the post-Phase-A cleanup). The existing serializer (`serializeCapture`), `subsampleSamples`, and the dev-only `/api/diagnostics` route are unchanged. While `simRecording` is true and the solver is running, the recorder pushes a sample every ~50 ms (target ≤ 160 samples per capture; downsampled on stop). On the falling edge of `simRecording`, `useLocomotion` serializes the buffer and POSTs it to `/api/diagnostics`; the returned path is written to `lastCapturePath`.

- **Simulate sidebar gains solver controls.** The Simulate tab SHALL show four buttons — **Run / Pause** (toggle), **Reset**, **Kick translation**, **Record / Stop** — plus the live diagnostic readouts (Kinetic energy, COM drift). Manual pose sliders SHALL remain visible and editable. While `simRunning` is true the sliders SHALL be visibly disabled (the solver state is the render source); when paused they SHALL be re-enabled so the user can re-pose the body for the next run.

## Capabilities

### Modified Capabilities
- `locomotion`: adds the zero-force solver loop, the kick-and-drift gate, and the re-wired capture pipeline.

## Impact

- **Added files:**
  - `app/game/locomotion/solver.ts`
  - `app/game/locomotion/types.ts`
  - `openspec/changes/add-zero-force-solver-phase-a3/`
- **Edited files:**
  - `app/game/locomotion/diagnostics.ts` — re-export `buildSample` + `buildCaptureSpec`, importing `centerOfMass`/`kineticEnergy`/`nodePositions` from `solver.ts`. Existing serializer untouched.
  - `app/game/locomotion/useLocomotion.ts` — add the solver branch, solver-state-from-manualPose seeding, kick handling, diagnostics push, and the recording start/stop edges.
  - `app/admin/animate/animateStore.ts` — add the simulation + recording fields and their setters; Calibrate transition disables both.
  - `app/admin/animate/AnimateSidebar.tsx` — add Run/Pause, Reset, Kick, Record/Stop buttons, the diagnostics readout block, and the disabled-while-running treatment for the manual sliders.
- **Untouched:**
  - `app/game/AnimatedModel.tsx` and `app/admin/animate/AnimateScene.tsx` — A2's wiring already exposes everything A3 needs.
  - `app/game/locomotion/body.ts` and `chain.ts` — unchanged.
  - `app/api/diagnostics/route.ts` — unchanged.
  - Calibrate path — unchanged.
