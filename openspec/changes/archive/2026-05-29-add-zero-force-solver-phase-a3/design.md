## Context

A2 verified the renderer half of Phase A: a `BodySpec` is extracted from the rig, `manualPose` flows through the store, `useLocomotion` writes root + chain pivots, legs ride their parent spine, and joint clamping is visible. With the data path trusted, A3 brings the planar multibody integrator online — but with every force term disabled, so the integrator can be verified in isolation.

The original Phase A (`add-locomotion-body-solver`, reverted) bundled the integrator with joint damping, penalty limit stops, and a perturbation force. Under a 2 rad/s × 10-joint perturb, the limit stops (stiffness 80, damping 3) couldn't contain the chain — joints sailed past caps and the underlying motion never decayed. The capture showed the integrator itself was numerically stable (no NaN) but the force model was wrong for the input. We could not tell from that capture whether the integrator was *also* leaking energy or momentum.

A3's gate fixes that visibility. With zero forces and a small initial root velocity, the only physics is **conservation of linear momentum**. A correct integrator produces a body that drifts in a straight line at constant speed: rootX grows linearly, rootZ stays at the seed value, rootHeading stays fixed, no joint motion, KE stays constant, COM drift = `|v| · t`. Any deviation (curving path, drift slowing or accelerating, KE bleeding, joints moving) is a localized integrator bug, not a tuning issue.

## Goals / Non-Goals

**Goals.**

- The solver re-introduced exactly as in the reverted Phase A — full coupled mass matrix from per-segment Jacobians, finite-difference Coriolis bias, semi-implicit Euler at fixed 2 ms sub-steps — but with `generalizedForces` returning all zeros.
- A "Kick translation" button seeds a small `rootVelX` on the current solver state without touching anything else.
- Running the solver from rest after one kick produces a visibly straight slide: rootX grows linearly, rootZ stays fixed, no spin, no joint motion.
- KE stays flat across the run (any energy growth or decay is an integrator bug worth surfacing).
- COM drift grows linearly with slope equal to the kick magnitude. The diagnostic readout makes this measurable in seconds.
- The capture tool from the original Phase A scaffold (`diagnostics.ts` serializer + `/api/diagnostics` route + the `.gitignore` entry) is re-wired through a Record / Stop button. Recording captures both the *solver* state and the body's rendered shape per sample so we can compare intended vs applied if anything diverges in A4.

**Non-Goals.**

- No joint damping, no limit stops, no perturb-joint-rates (the spec'd kick affects only the root). Those land in A4.
- No actuation, no muscles, no CPG, no environment forces. Those land in B–D.
- No solver-tuning ergonomics in the sidebar (no constants exposed as sliders). Constants stay in `solver.ts` and are tuned by editing the file.
- No persistence of the running solver state. Pausing snaps the render back to `manualPose`; Reset re-initializes from `manualPose`. Future steps may add a "freeze pose" affordance.
- No leg articulation — legs remain rigid passengers of their parent spine pivot (same as A2).

## Approach

**Integrator.** The solver is the same reduced-coordinate formulation as the reverted Phase A: generalized coordinates `q = [rootX, rootZ, rootHeadingY, ...jointAngles]` and generalized rates `qd`. Each frame: build `M(q)` from per-segment translational+rotational Jacobians, build the Coriolis bias `c(q, qd)` from finite-difference derivatives of `M`, solve `M · qdd = τ − c` for `qdd`, semi-implicit Euler with fixed 2 ms sub-steps. The only deviation from the reverted Phase A is that `τ` (generalized forces) returns zeros. The constants `JOINT_DAMPING`, `LIMIT_STOP_STIFFNESS`, `LIMIT_STOP_DAMPING` are *declared* and exported as zero — A4 will overwrite their values, not their existence.

**Kick.** `seedRootVelocity(state, vx, vz)` sets `state.rootVelX = vx` and `state.rootVelZ = vz` directly. No momentum-balance correction across joint rates (unlike the reverted Phase A's `perturb`), because A3's kick only touches the root and the body is at rest (joint rates zero), so linear momentum is already balanced. The kick fires once per `simKickSignal` change; clicking Kick twice doubles the velocity.

**Run / Pause / Reset semantics.** On a rising edge of `simRunning`, `useLocomotion` initializes a `SolverHandle = { spec, state, startCom }`:

- `state = initSolverState(spec)`,
- then `state.rootX = manualPose.rootX`, `state.rootZ = manualPose.rootZ`, `state.rootHeadingY = manualPose.rootYawRad`, and for each chain joint `i` (skipping the head): `state.jointAngles[i-1] = manualPose.jointAnglesRad[childGroupId] ?? 0`,
- all rates remain zero,
- `startCom = centerOfMass(state, spec)`.

Each `useFrame` call while running: detect kick / reset signal edges, then `stepSolver(state, spec, dt)`, then write the new state to the rendered pivots and the root group, then push diagnostics every 100 ms. On a falling edge of `simRunning`, the solver handle is held but stepping stops; `useLocomotion` reverts to the A2 manual-pose render path the next frame. Switching to Calibrate flips `simRunning` to false (already part of the store's `setAnimateTab`).

**Capture.** `diagnostics.ts` keeps the existing serializer; A3 re-adds `buildSample(t, state, spec, baseCom)` and `buildCaptureSpec(spec)`, both of which import from `solver.ts`. `useLocomotion` holds a per-recording sample buffer + time accumulator. While `simRecording` is true *and* the solver is running, a sample is pushed every ~50 ms (after `stepSolver`, so the sample reflects post-step state). On the falling edge of `simRecording`, the buffer is subsampled to ≤ 160 samples, serialized, and POSTed to `/api/diagnostics`; the returned path is written to `lastCapturePath`. If recording is left on while the solver pauses, sample pushes stop until the solver resumes — the time accumulator pauses too, so `t` reflects solver time, not wall time.

**Sidebar layout.** The Simulate tab grows four buttons (Run/Pause, Reset, Kick translation, Record/Stop) at the top, the diagnostic readouts (Kinetic energy, COM drift) below the buttons, and the existing manual sliders below the readouts. The sliders are visually dimmed and their `onChange` handlers gated on `!simRunning` so the user cannot edit during a run (which would silently desync from solver state). The Record button is colored red while recording. The `lastCapturePath` is shown beneath the Record button when set.

## Trade-offs

- **Initial conditions from `manualPose` vs always rest.** Initializing from `manualPose` means the user can pose the body before running — useful for A4 (verifying that a perturb settles from a known initial bend) and beyond. It also means a non-zero initial joint angle is observable in A3 (if the user sets one and then runs, it stays put with no forces). The cost is a small per-rising-edge copy; mental model matches A2 (paused = manual, running = solver).
- **Single-button kick vs continuous force.** Kick is a one-shot velocity seed, not a sustained force. This keeps A3's gate clean — momentum is set once, then conserved. A continuous force would be confounding (is the slide constant because momentum is conserved, or because the force is exactly compensating numerical drift?). A4 introduces the first sustained forces (damping + limit stops).
- **Re-introducing solver-tied helpers in `diagnostics.ts`.** A2's cleanup made `diagnostics.ts` solver-free for portability. A3 re-couples them, because the alternative (keeping them outside `diagnostics.ts`, e.g. in `useLocomotion.ts`) duplicates per-frame state-shape knowledge. We accept the coupling on the grounds that the diagnostics module's reason for existing *is* to read solver state.
- **No momentum-balance correction in the kick.** With zero forces and joint rates starting at zero, kicking only the root is exactly equivalent to giving the whole body a uniform translation velocity (no torque imbalance). If A4 or later wants to kick joint rates too, that helper will need the same momentum-balancing logic the reverted `perturb` had.

## Open Questions

- Should the Kick translation magnitude be exposed in the UI (slider or numeric input), or hard-coded as a constant tuned to look right? *Lean: constant for A3 (0.5 world units / second). Expose only if the gate needs it.*
- Should the diagnostic readouts include `comX` / `comZ` directly, or only `comDriftFromStart` (the magnitude)? *Lean: only the drift magnitude in the readout, but include the full COM in the capture file.*
- Should there be a "Reset pose & solver" combined button (one click returns everything to zero), or keep the existing "Reset pose" (A2) separate from solver Reset? *Lean: keep separate; solver Reset re-initialises from current manualPose, so a combined operation is two clicks (Reset pose, then Reset solver).*
