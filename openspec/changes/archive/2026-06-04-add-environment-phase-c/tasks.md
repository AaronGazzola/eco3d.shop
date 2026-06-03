## 1. Environment module

- [x] 1.1 Add `app/game/locomotion/environment.ts` exporting drag constants (`DRAG_NORMAL = 12`, `DRAG_TANGENT = 1.0`, `DRAG_ANGULAR = 0.6`) and `computeEnvironmentTau(spec, q, qd): number[]` returning a `dof`-length generalized-force contribution.
- [x] 1.2 The implementation SHALL reuse `computeKinematics(spec, q)` (extract it to a public export from `solver.ts` if it isn't already) and walk each axial segment: tangent from cumulative heading, COM velocity `v_i = (jacLinX[i]·qd, jacLinZ[i]·qd)`, angular rate `ω_i = jacAng[i]·qd`, drag force `F_i = −length_i · (C_n · v_⊥ + C_t · v_∥ · t̂_i)`, drag torque `τ_i = −length_i · C_ω · ω_i`.
- [x] 1.3 Assemble `τ_env[c] = Σ_i (jacLinX[i][c]·F_i.x + jacLinZ[i][c]·F_i.z + jacAng[i][c]·τ_i)`.
- [x] 1.4 `npx tsc --noEmit` and `npx eslint` pass.

## 2. Solver hook

- [x] 2.1 In `solver.ts`, export `computeKinematics` (or make `environment.ts` build its own if cleaner). Add an optional `environmentEnabled?: boolean` to `stepSolver` and thread it through `integrateSubstep` → `generalizedForces`.
- [x] 2.2 When `environmentEnabled === true`, `generalizedForces` SHALL add `computeEnvironmentTau(spec, q, qd)` to `tau` after damping, limit stops, and joint torques. When omitted/false, behaviour SHALL be identical to A4/B2/B3.
- [x] 2.3 The drag SHALL be recomputed each sub-step (it lives inside `generalizedForces`, which is called per sub-step), so it tracks the substep-current `(q, qd)` rather than the frame-start state.
- [x] 2.4 `npx tsc --noEmit` and `npx eslint` pass; an A4 perturb still settles identically (toggle off → byte-for-byte the same).

## 3. Store — environment toggle

- [x] 3.1 In `animateStore.ts`, add `environmentEnabled: boolean` (default `false`) + `setEnvironmentEnabled(v)`. It is independent of the run-mode toggles — flipping it while a mode is running SHALL take effect on the next frame's `stepSolver` call.
- [x] 3.2 `setAnimateTab('calibrate')` SHALL NOT reset `environmentEnabled` (it's a sticky preference, not a mode).
- [x] 3.3 `npx tsc --noEmit` passes.

## 4. useLocomotion — pass the flag through

- [x] 4.1 The A-phase Run branch passes `store.environmentEnabled` as the final arg to `stepSolver`.
- [x] 4.2 The muscle test branch passes the same.
- [x] 4.3 The coupled (B3) branch passes the same.
- [x] 4.4 The CPG preview branch is unaffected (it does not call `stepSolver`).
- [x] 4.5 `npx tsc --noEmit` and `npx eslint` pass.

## 5. Sidebar — Environment block

- [x] 5.1 In `AnimateSidebar.tsx`, add an **Environment (Phase C)** block at the top of the Simulate tab (above the A-phase Run/Reset buttons) with a single toggle button bound to `environmentEnabled` and a one-line hint: `"Anisotropic swimming drag (C_n=12, C_t=1.0)"`. When on, the button SHALL be visually distinct (e.g. blue/teal).
- [x] 5.2 `npx tsc --noEmit` and `npx eslint` pass.

## 6. Visual gate — emergent forward swimming

- [x] 6.1 With environment toggle **off**, re-run a B3 coupled capture — it SHALL match Phase B's pattern (COM drift ≤ ~1e-3, body wriggles in place).
- [x] 6.2 Turn the environment toggle **on**, click Run CPG drive, wait ~5 s, Record for 3-5 s, Stop. The body SHALL translate: the body section's `rootX` (or `rootZ`, projected onto the heading direction) SHALL increase monotonically over the capture, `maxCOMdrift` SHALL be order ≥ 0.5 body-lengths over the 3-5 s recording. The CPG space-time section SHALL still show a clean head→tail wave (the body's motion does not corrupt the controller, since `s=0`).
- [x] 6.3 Verify the thrust direction matches the wave: a wave running head→tail should push the body **forward** (head leading). If `rootX` goes negative-direction, that's a sign-flip in the drag mapping — fix.
- [x] 6.4 Turn the environment off again mid-run (or in a fresh run) — the body SHALL coast to a stop on its own damping (no environment to brake it), confirming the toggle takes effect each frame.

## 7. Documentation

- [x] 7.1 Update `documentation/animation-roadmap.md` § 4 (Status) with a dated Phase C note: drag constants used, swimming gate metric (body-lengths/sec), any thrust-direction sign fix encountered, COM-drift transition from "stays small" to "is the gate".

## 8. OpenSpec validation

- [x] 8.1 `npx openspec validate add-environment-phase-c --strict` passes.
