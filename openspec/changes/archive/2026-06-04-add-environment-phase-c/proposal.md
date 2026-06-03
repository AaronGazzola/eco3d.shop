## Why

Phase B verified that the controller + muscles + body produce a head→tail undulation, but the body wriggles **in place** — there is no environment for the chain to push against. Phase C adds the **anisotropic drag** that turns internal bending into forward thrust: each slender axial segment feels far more resistance perpendicular to its long axis than along it, so as the wave sweeps each segment sideways the net reaction integrates to a forward push. This is the first phase where locomotion *emerges* rather than being commanded — exactly the L0 claim the roadmap promises.

Phase C is **swimming only** (paper's L5 water): a resistive-force theory drag model on the axial chain, no ground contact, no limbs. It is added as an external generalized force on top of the A4 solver, behind a single `environmentEnabled` toggle, so every prior gate (passive A-phase, B1 CPG preview, B2 muscle test, B3 coupled) remains reproducible with the toggle off.

## What Changes

- **New module `app/game/locomotion/environment.ts`.** Implements per-segment anisotropic resistive drag:
  - For each axial segment `i`, compute its planar tangent direction (from cumulative heading) and its world-frame COM velocity (from `qd` via the segment's linear Jacobian).
  - Decompose `v_COM` into longitudinal (`v_∥` along the tangent) and transverse (`v_⊥` perpendicular) components.
  - Apply a drag force `F_i = −(C_n · v_⊥ + C_t · v_∥ · t̂) · length_i` and an angular drag torque `τ_i = −C_ω · ω_i · length_i` where `ω_i` is the segment's angular rate about the y-axis. Constants `C_n = 12`, `C_t = 1.0`, `C_ω = 0.6` (starting values; tuned against the gate; documented anisotropy ratio `C_n/C_t ≈ 12`).
  - Export `computeEnvironmentTau(spec, q, qd)` returning the per-coord generalized force vector contribution, assembled via `Σ_i (J_lin_x[i])^T·F_ix + (J_lin_z[i])^T·F_iz + (J_ang[i])^T·τ_i`.
- **Solver hook.** `stepSolver` gains an optional `environmentEnabled?: boolean`. When true (and only when true), `generalizedForces` adds `computeEnvironmentTau(spec, q, qd)` to `tau` alongside damping + limit stops + muscle torques. Default false → behaviour is identical to A4/B2/B3. The drag is recomputed each sub-step against the current `(q, qd)` so it tracks the actual body state, not the frame-start state.
- **Store + sidebar: environment toggle.** `animateStore` gains `environmentEnabled: boolean` (default `false`). The Simulate sidebar gains an **Environment (Phase C)** block at the top with a single toggle and a one-line explainer ("Anisotropic swimming drag; enables forward thrust"). The toggle is independent of the four run modes and applies whichever mode is active.
- **Pipe through useLocomotion.** The A-phase / muscle test / coupled branches all pass `store.environmentEnabled` to their `stepSolver` calls so the drag is consistent regardless of which mode is driving the body. The CPG-preview branch (no body) is unaffected.
- **Gate behaviour.** With B3 coupled mode running and the environment toggle ON, the body SHALL translate: `rootX` (or `rootZ`, depending on heading) drifts monotonically rather than oscillating around zero. With the toggle OFF, all prior captures reproduce unchanged.

## Capabilities

### Modified Capabilities
- `locomotion`: adds the anisotropic hydrodynamic drag environment, its toggle, and the resulting first emergent locomotion (forward swimming).

## Impact

- **Added files:** `app/game/locomotion/environment.ts`; `openspec/changes/add-environment-phase-c/`.
- **Edited files:** `app/game/locomotion/solver.ts` (optional `environmentEnabled` threaded through `stepSolver` → `integrateSubstep` → `generalizedForces`); `app/game/locomotion/useLocomotion.ts` (pass the flag through each driving-mode branch); `app/admin/animate/animateStore.ts` (`environmentEnabled` + setter); `app/admin/animate/AnimateSidebar.tsx` (Environment toggle block).
- **Untouched:** `cpg.ts`, `muscles.ts`, `body.ts`, `chain.ts`, `diagnostics.ts`, `AnimatedModel.tsx`, `AnimateScene.tsx`, `/api/diagnostics/route.ts`, Calibrate path. The CPG and muscle modules don't know about the environment — it is added on the body side only, exactly where reaction forces enter the equations of motion.
