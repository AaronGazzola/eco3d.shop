## Why

A3 proved the integrator conserves momentum with all forces off: a kicked free body drifts in a straight line, KE flat, joints frozen. A4 turns the **first real force terms** back on — joint damping and soft (penalty) limit stops — the exact constants A3 left exported as `0`. These are the two terms that, in the original bundled Phase A, were too weak to contain the chain (stiffness 80, damping 3 let joints sail 3–5× past their caps and never settle). The difference now: a trusted renderer (A2) and a verified integrator (A3), so when we tune the constants the capture reads cleanly and any misbehaviour is localized to the force law, not the renderer or the integrator.

A4's gate is the **damped-settle test**: pose the body past its caps or kick its joints, click Run, and with no actuation or environment the body must come to rest — KE decaying to ≈0, every joint pulled back inside its `angleCaps`, COM staying put (no forces that translate the body, so no locomotion yet). This is the last passive-body check before Phase B introduces muscle torques.

## What Changes

- **Force law re-enabled in `solver.ts`.** `generalizedForces(spec, q, qd)` SHALL apply, per joint: (a) viscous joint damping `−JOINT_DAMPING · rate`, and (b) a one-sided penalty limit stop when the joint angle exceeds a cap — `−(LIMIT_STOP_STIFFNESS · overshoot + LIMIT_STOP_DAMPING · rate)` past `yawForwardLimit`, and the mirror past `−yawBackwardLimit`. The constants `JOINT_DAMPING`, `LIMIT_STOP_STIFFNESS`, `LIMIT_STOP_DAMPING` SHALL be set to non-zero values (initial: `8`, `3000`, `100`) and tuned against the gate via captures. No other force terms (no actuation, no environment).
- **Joint-rate perturbation.** `solver.ts` SHALL add `perturbJointRates(state, spec, magnitude)` that seeds alternating joint rates (`±magnitude`) and solves the floating-base block so the perturbation conserves linear + angular momentum (root rates absorb the recoil), matching the original Phase A `perturb`. This excites the chain so damping/limit-stop settling is observable.
- **Store + signal.** `animateStore` SHALL add `simPerturbSignal: number` (default `0`) and `requestSimPerturb()` (increments it). The existing `simKickSignal` (root translation) is retained.
- **useLocomotion perturb handling.** On a change in `simPerturbSignal`, `useLocomotion` SHALL call `perturbJointRates(state, spec, PERTURB_MAGNITUDE)` once (default magnitude `1.5` rad/s).
- **Sidebar.** The Simulate tab SHALL add a **Kick joints** button bound to `requestSimPerturb`, beside the existing Kick translation. A `Max joint / cap` readout SHALL be added to the diagnostics block, showing the largest per-joint fraction of cap from the latest capture-style snapshot (so the user can see joints sitting at/over their caps during settling).
- **Diagnostics snapshot gains the cap fraction.** `SimDiagnostics` SHALL add `maxJointFracOfCap: number`; `diagnostics(state, spec, startCom)` SHALL compute it as the max over joints of `|angle| / cap`. The capture file already records per-joint `fracOfCap`; this surfaces the aggregate live.
- **Render stays unclamped.** The solver branch SHALL continue writing `jointAngles[i]` to pivots without a hard clamp — the penalty limit stops enforce caps *dynamically* (per `locomotion.md`: in a torque-driven body the caps become joint-limit stops). A brief overshoot that the stop pushes back is expected and is what the gate observes.

## Capabilities

### Modified Capabilities
- `locomotion`: adds the passive force law (joint damping + penalty limit stops), the joint-rate perturbation, and the damped-settle gate.

## Impact

- **Edited files:**
  - `app/game/locomotion/solver.ts` — non-zero force constants; `generalizedForces` applies damping + limit stops; add `perturbJointRates`; `diagnostics` returns `maxJointFracOfCap`.
  - `app/game/locomotion/types.ts` — `SolverDiagnostics` gains `maxJointFracOfCap`.
  - `app/admin/animate/animateStore.ts` — `SimDiagnostics` gains `maxJointFracOfCap`; add `simPerturbSignal` + `requestSimPerturb`.
  - `app/game/locomotion/useLocomotion.ts` — handle the perturb signal edge; pass `maxJointFracOfCap` through the diagnostics push.
  - `app/admin/animate/AnimateSidebar.tsx` — Kick joints button; Max joint / cap readout.
- **Untouched:**
  - `app/game/locomotion/body.ts`, `chain.ts`, `diagnostics.ts` (capture already records `fracOfCap`), `app/api/diagnostics/route.ts`, `AnimatedModel.tsx`, `AnimateScene.tsx`.
  - Calibrate path.
