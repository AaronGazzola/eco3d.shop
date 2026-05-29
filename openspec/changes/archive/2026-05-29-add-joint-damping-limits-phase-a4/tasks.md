## 1. Force law in the solver

- [x] 1.1 In `app/game/locomotion/solver.ts`, set `JOINT_DAMPING = 8`, `LIMIT_STOP_STIFFNESS = 3000`, `LIMIT_STOP_DAMPING = 100` (starting values; tuned against the gate).
- [x] 1.2 Rewrite `generalizedForces(spec, q, qd)` to apply, per joint: `tau[c] -= JOINT_DAMPING * qd[c]`; then if `q[c] > yawForwardLimit`, `tau[c] -= LIMIT_STOP_STIFFNESS * (q[c] - yawForwardLimit) + LIMIT_STOP_DAMPING * qd[c]`; else if `q[c] < -yawBackwardLimit`, `tau[c] -= LIMIT_STOP_STIFFNESS * (q[c] + yawBackwardLimit) + LIMIT_STOP_DAMPING * qd[c]`. `c = joint.coordIndex`.
- [x] 1.3 `npx tsc --noEmit` and `npx eslint` pass on `solver.ts`.

## 2. Joint-rate perturbation

- [x] 2.1 Add `perturbJointRates(state, spec, magnitude)` to `solver.ts`: set `jointRates[j] = magnitude * (j % 2 === 0 ? 1 : -1)`, then build the mass matrix at the current `q`, take its 3×3 floating-base block, and solve for `rootVelX/Z/HeadingRateY` that cancel `−Σ M[r][3+j]·jointRates[j]` (net momentum zero). Mirror the original Phase A `perturb`.
- [x] 2.2 `npx tsc --noEmit` and `npx eslint` pass.

## 3. Diagnostics — cap fraction

- [x] 3.1 In `app/game/locomotion/types.ts`, add `maxJointFracOfCap: number` to `SolverDiagnostics`.
- [x] 3.2 In `solver.ts`, `diagnostics(state, spec, startCom)` SHALL compute `maxJointFracOfCap = max over joints of |angle| / (angle >= 0 ? yawForwardLimit : yawBackwardLimit)` (guard divide-by-zero caps → 0) and return it alongside the existing fields.
- [x] 3.3 In `app/admin/animate/animateStore.ts`, add `maxJointFracOfCap` to `SimDiagnostics` and its initial value (`0`).
- [x] 3.4 `npx tsc --noEmit` passes.

## 4. Store — perturb signal

- [x] 4.1 In `animateStore.ts`, add `simPerturbSignal: number` (default `0`) and `requestSimPerturb: () => void` (increments it).
- [x] 4.2 `npx tsc --noEmit` passes.

## 5. useLocomotion — perturb handling + cap fraction

- [x] 5.1 In `useLocomotion.ts`, add a `lastPerturbRef` and a `PERTURB_MAGNITUDE = 1.5` constant.
- [x] 5.2 In the running branch, on a change in `store.simPerturbSignal`, call `perturbJointRates(handle.state, handle.spec, PERTURB_MAGNITUDE)` once (track via `lastPerturbRef`, initialized on the rising edge of Run like the kick/reset signals).
- [x] 5.3 Pass `maxJointFracOfCap` through to `setSimDiagnostics` (it now comes from `diagnostics(...)`).
- [x] 5.4 `npx tsc --noEmit` and `npx eslint` pass.

## 6. Sidebar — Kick joints + cap readout

- [x] 6.1 In `AnimateSidebar.tsx`, add a **Kick joints** button bound to `requestSimPerturb`, beside **Kick translation**.
- [x] 6.2 Add a `Max joint / cap` row to the diagnostics block showing `(simDiagnostics.maxJointFracOfCap * 100).toFixed(0)%`.
- [x] 6.3 `npx tsc --noEmit` and `npx eslint` pass.

## 7. Visual gate + tuning

- [x] 7.1 Load the rig, click **Run**, then **Kick joints**. The chain whips and then settles to rest — no sustained oscillation, no jitter, no blow-through.
- [x] 7.2 During settling, record a capture. KE decays toward ≈ 0; `maxJointFracOfCap` ends ≤ 1.0.
- [x] 7.3 Pose a joint past its cap with a manual slider, click **Run**. The joint is pushed back inside its cap and the body settles.
- [x] 7.4 Tuned across captures: first pass (8/3000/100) settled too slowly with joints parked ~115% past caps and a late KE uptick. Raised to (20/8000/150) — joints now rest at 100%, KE 102→0.43, no uptick.
- [x] 7.5 Final capture confirms the gate. Final constants `JOINT_DAMPING=20`, `LIMIT_STOP_STIFFNESS=8000`, `LIMIT_STOP_DAMPING=150`.

## 8. Documentation

- [x] 8.1 Update `documentation/animation-roadmap.md` § 4 (Status) with a dated A4 note: the force law, the final tuned constants, and the gate result.

## 9. OpenSpec validation

- [x] 9.1 `npx openspec validate add-joint-damping-limits-phase-a4 --strict` passes.
