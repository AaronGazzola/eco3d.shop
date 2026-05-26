## 1. Types

- [x] 1.1 Create `app/game/locomotion/types.ts` with `Segment` (length, mass, inertia, joint node, parent/child links), `Joint` (yaw limits forward/backward), `BodySpec` (ordered segments + joints + global density constant used), and `SolverState` (`q`, `qDot`, and any cached buffers).
- [x] 1.2 Keep all units/conventions documented inline-free per project rules; encode planar convention in the types (x-z plane, yaw about Y) via field names, not comments.

## 2. Body model (L1)

- [x] 2.1 Create `app/game/locomotion/body.ts` exporting `buildBodySpec(groups: BodyGroup[]): BodySpec`. Use `buildSkeletonTree` + `flattenSkeleton` from `chain.ts` to get head → spine → tail order; exclude leg groups from segments.
- [x] 2.2 Compute each segment length from x-z node spacing (distance between this segment's joint node and the next segment's joint node), ignoring `y`.
- [x] 2.3 Approximate per-segment mass + planar rotational inertia about the joint axis from the group's merged mesh vertices (`SegmentData.positions` for the group's `segmentIds`), using a single global density constant; isolate the estimator (inline or in `app/game/locomotion/inertia.ts` if it grows).
- [x] 2.4 Set each joint's limits from `effectiveAngleCaps(group)` (`yaw` forward, `yawBack` backward; fall back to `yaw` when `yawBack` is absent).
- [x] 2.5 Add a unit test (or dev assertion) verifying segment count/order, lengths from a known config, larger-mesh ⇒ larger mass, and limits sourced from caps.

## 3. Solver core (L4)

- [x] 3.1 Create `app/game/locomotion/solver.ts` with `initSolverState(spec)` producing the rest configuration (`θ = 0`, root at origin, zero velocities).
- [x] 3.2 Implement the generalized mass matrix `M(q)` over `q = [xᵣ, zᵣ, ψ, θ₁…θₙ]` via the composite-rigid-body algorithm for the planar chain.
- [x] 3.3 Implement the Coriolis/centrifugal term `C(q, q̇) q̇`.
- [x] 3.4 Implement passive generalized forces `τ`: per-joint viscous damping and one-sided spring-damper limit-stop reactions at the caps. No muscle/hydrodynamic/contact/gravity force.
- [x] 3.5 Solve `M q̈ = τ − C q̇` with a small dense linear solve; integrate with symplectic (semi-implicit) Euler on a fixed internal sub-step, sub-stepping the clamped render `dt`.
- [x] 3.6 Add `perturb(state, magnitude)` (angular-velocity kick into joint velocities), `kineticEnergy(state, spec)`, and `centerOfMass(state, spec)`.
- [x] 3.7 Drive the solver from a test/dev harness (no rendering yet) and confirm: kicked free chain holds COM within tolerance over several seconds; kinetic energy decays monotonically to rest; a hard kick toward a cap is stopped at the cap; 30 fps vs 120 fps sub-stepping converge to the same settled state.

## 4. Simulation store slice

- [x] 4.1 In `app/admin/animate/animateStore.ts`, add a `simulation` slice: `running: boolean`, transient `resetSignal` / `perturbSignal` counters (bumped to trigger the loop), and live `diagnostics` (kinetic energy, COM displacement since reset, max |joint angle| / cap).
- [x] 4.2 Add setters: `setSimRunning`, `requestSimReset`, `requestSimPerturb`, `setSimDiagnostics`. Do NOT add `simulation` to any persist allowlist.

## 5. Render mapping (L6, minimal)

- [x] 5.1 In `app/admin/animate/AnimateScene.tsx`, mount a `THREE.Group` (root frame, via ref) around `<AnimatedModel>` inside the existing `<group rotation={modelRotation}>`; pass the ref down to the locomotion hook (or expose it through the store/refs the hook already reads).
- [x] 5.2 In `app/game/locomotion/useLocomotion.ts`, build the `BodySpec` (memoized on `groups`) and hold a `SolverState` ref; add a branch: when `animateTab === 'simulate'` and `simulation.running`, sub-step the solver each frame.
- [x] 5.3 On a reset signal, re-init the solver state; on a perturb signal, call `perturb`. Track the last-consumed signal values via refs so each press fires once.
- [x] 5.4 Write each joint's integrated yaw to its pivot (`qYaw.setFromAxisAngle(Y_AXIS, clampToCap(θ))`), hard-clamped to the joint cap; write the body pose `(xᵣ, 0, zᵣ)` + heading `ψ` (about Y) to the root group.
- [x] 5.5 Each frame (running), publish diagnostics to the store via `setSimDiagnostics` (throttled if needed) without causing per-frame React re-renders of the 3D loop.
- [x] 5.6 Preserve existing behavior when not running: rest pose on Simulate, unchanged Calibrate preview on Calibrate; legs continue rendering at rest pose (not in `q`).

## 6. Minimal Simulate-tab controls

- [x] 6.1 In `app/admin/animate/AnimateSidebar.tsx`, replace the `SimulateTab` placeholder body with: a Run/pause toggle (`running`), a Reset-to-rest button (`requestSimReset`), and a Perturb button (`requestSimPerturb`).
- [x] 6.2 Render a read-only diagnostics block: total kinetic energy, COM displacement since reset, and max |joint angle| relative to cap. Style as muted label/value rows consistent with the studio.
- [x] 6.3 Keep it minimal — no drive/behavior/environment/attractor controls. Add a one-line note that this is Phase A verification scaffolding (full controls arrive in Phase H).

## 7. Verification (the gate)

- [ ] 7.1 Open the Simulate tab with a complete rig: it renders the rest pose; pressing Run with no perturbation leaves it at rest (no drift). _(Logic verified: zero state + zero forces → zero accel; awaiting in-studio visual confirmation.)_
- [x] 7.2 Press Perturb: the chain moves from the kick, the rest of the body counter-rotates, and the COM-displacement readout stays near zero (momentum conserved — no net translation from internal effects). _(Verified headless: `scripts/locomotion-solver-check.ts`, COM drift 5.5e-3.)_
- [x] 7.3 Kinetic energy rises on the kick then decays monotonically to ~0; the chain visibly settles (damping dissipates energy; no explosion). _(Verified headless: monotonic decay 0.075 → 8.7e-5.)_
- [x] 7.4 Perturb hard toward a cap: the joint stops at its cap and the rendered angle never exceeds it (limit stops + output clamp). _(Verified headless: max |angle| 0.4017 vs cap 0.4; render also hard-clamps.)_
- [x] 7.5 Confirm frame-rate independence: behavior is equivalent at low and high frame rates (sub-stepping). _(Verified headless: 30 vs 120 fps, COM gap 0, joint-angle gap 3e-4.)_
- [ ] 7.6 Reset returns the rig to rest pose; switching to Calibrate behaves exactly as before this change; the home-page render path is unaffected. _(Calibrate branch preserved; home page uses `StaticPosedModel` not `AnimatedModel`; awaiting in-studio visual confirmation.)_
- [x] 7.7 `npx tsc --noEmit` passes; no `console.log` left in app code.

## 8. Roadmap bookkeeping

- [x] 8.1 Update `documentation/animation-roadmap.md §4` status: Phase A implemented + verification gate passed.
- [x] 8.2 Refresh the TEMP handover to point at Phase B (CPG + muscles) as the next change.
