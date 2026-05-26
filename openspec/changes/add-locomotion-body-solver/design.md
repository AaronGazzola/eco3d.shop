## Context

The rig is a node-skeleton authoring surface (`documentation/locomotion.md §1`): a linear chain of body groups (head → spines → tail) plus legs, where each group carries node offsets (`nodeFront`, `nodeBack`, hip nodes, `nodeFoot`) and `angleCaps`. The renderer (`app/game/AnimatedModel.tsx`) already builds a `pivotsRef: Map<groupId, THREE.Group>` in which each chained group's pivot rotates about that group's `nodeBack` (the joint to its parent), and `useLocomotion` slerps those pivots — today only toward identity (rest pose) or a Calibrate preview.

Two locked decisions shape every choice here:

- **Planar (Decision 1).** The rig's nodes live in the x-z horizontal plane (`y` is optional, defaults 0) and joint rotation is yaw about the **Y axis** (`Y_AXIS` in `useLocomotion`). So the planar world is x-z, each joint is a single yaw angle about Y, and the body's free pose is `(x, z, heading)`. No pitch/roll.
- **Custom reduced-order solver (Decision 2).** We integrate the paper's own force laws (added in later phases), so we own the integrator. Phase A builds it with no forces yet, which is the *right* time to get the dynamics core correct — there is nothing to mask an integration bug.

Phase A is layers L1 (body from rig) and L4 (solver) from `documentation/locomotion.md §3`, plus a minimal slice of L6 (render mapping). It deliberately adds no actuation (L3), no CPG (L2), and no environment (L5).

Constraints:

- Read-only on rig data: `body.ts` consumes `BodyGroup[]` and `effectiveAngleCaps`; it never edits the rig, the config, or `sharedStore`.
- Angle caps are sacred (`locomotion.md §1.5`): a joint angle written to a pivot is always clamped to its cap, and the solver's limit stops enforce the cap as a hard range — code may clamp tighter but never raises a cap.
- `AnimatedModel`'s internal rendering and the home-page render path stay unchanged; the body-pose root group is added at the **scene** level (`AnimateScene`), not inside `AnimatedModel`.
- No new dependencies; the solver is hand-written over plain arrays + `three` vector math.

## Goals / Non-Goals

**Goals:**

- Derive a planar multibody **body spec** purely from the rig: per-segment length (node spacing), mass + planar rotational inertia (mesh-approximated), a 1-DOF yaw joint per segment at its `nodeBack`, and joint limits from the caps.
- Stand up a **custom reduced-order planar integrator** over `q = [xᵣ, zᵣ, heading, θ₁…θₙ]` that is *correct* in the no-force regime: momentum-conserving (internal effects never translate the COM), energy-dissipating (joint damping bleeds kinetic energy to rest), and cap-respecting (limit stops prevent any joint exceeding its cap).
- Map solver output back to the rig: integrated joint yaws → existing pivots (clamped); body pose → a new scene root group.
- Provide the **minimal controls** to drive and observe the verification gate (run/pause, reset, perturb, diagnostics).

**Non-Goals:**

- Any actuation, CPG, muscle, hydrodynamic, contact, friction, or gravity force (later phases).
- Limb dynamics — legs render at rest pose; they are not in the solver's `q` this phase.
- 3D / pitch / roll, turning, behaviors, attractor, feedback.
- The full Phase H control surface, persisted simulation settings, or behavior presets.
- High-fidelity inertia from true mesh volume integration — a defensible planar approximation is sufficient and refinable later.

## Decisions

### 1. Reduced-coordinate planar dynamics with the full coupled mass matrix

State is the minimal generalized coordinate vector `q = [xᵣ, zᵣ, ψ, θ₁ … θₙ]`: root position `(xᵣ, zᵣ)` in the x-z plane, root heading `ψ` about Y, and one relative yaw `θᵢ` per chained joint. Velocities `q̇` track alongside. Each step solves the planar equations of motion `M(q) q̈ = τ − C(q, q̇) q̇`, where `M` is the configuration-dependent generalized mass matrix (built with the composite-rigid-body algorithm), `C q̇` collects Coriolis/centrifugal terms, and `τ` holds only the Phase-A generalized forces (joint damping + limit-stop reactions). `q̈` is obtained by a small dense solve (`M` is `(n+3)×(n+3)`, n ≈ spine-segment count, so well under 20×20).

**Why reduced coordinates over maximal coordinates (full per-body x,z,θ with constraints):** a serial chain in reduced coordinates has no joint constraints to maintain — the joints are baked into the coordinates — so there is no constraint drift, no Baumgarte stabilization, and momentum conservation falls out of the formulation instead of being something we police. The dense solve is trivial at this body size.

**Why the full mass matrix and not per-joint independent integration:** the verification gate (kick one joint → the rest counter-rotates → COM stays fixed) is exactly the coupling that an independent-joint integrator gets wrong. Building `M(q)` properly is the substance of the phase; cutting it would make every later phase's emergent motion subtly wrong and unfalsifiable.

**Alternative considered — Featherstone articulated-body algorithm (O(n)):** correct and elegant, but O(n) only matters far above our segment count, and the recursive formulation is harder to read and to extend with the per-joint muscle torques and stretch-feedback of Phase B. The composite-rigid-body + dense solve is more legible at this scale. Revisit if profiling ever shows the solve dominating.

### 2. Free base, no anchor — the body pose is integrated, not assigned

The root `(xᵣ, zᵣ, ψ)` is part of `q`; nothing pins it. With no external forces in Phase A, linear and angular momentum are conserved, so the COM cannot translate and total momentum stays at its initial value (zero from rest) regardless of how the joints move. This is the paper's "free in the world" body (`locomotion.md §2.4`) and the concrete basis for the momentum-conservation gate.

This is also where our setup structurally differs from the paper (roadmap Part 4 / Part 8): the paper needs no render root because pose is an output; **we** must read that output into a render root. Phase A introduces that root group so the difference is handled once, here, before forces exist.

### 3. Semi-implicit (symplectic) Euler integration with a fixed sub-stepped dt

Integrate velocity first, then position (`q̇ ← q̇ + dt·q̈; q ← q + dt·q̇`). Semi-implicit Euler is the standard symplectic choice for this class of system: it does not pump energy the way explicit (forward) Euler does, so a damped passive chain reliably *settles* instead of drifting unstable. The frame `dt` from `useFrame` is clamped and sub-stepped to a fixed internal step (e.g. ≤ 2 ms, matching the paper's small physics step) so behavior is frame-rate independent and stable under a stiff limit-stop.

**Why not RK4:** RK4 buys accuracy we do not need for a qualitative verification gate and is not symplectic; for stiff contact/limit forces later, an implicit or sub-stepped symplectic scheme is the better foundation. Keep the integrator simple and stable now; raise order only if a later phase demands it.

### 4. Joint limits as one-sided penalty stops, clamp on output

The caps (`effectiveAngleCaps(group)`: `yaw` forward, `yawBack` backward) are the joint range. The solver enforces them as **one-sided spring-damper penalty stops**: zero torque inside the range, and a stiff restoring + damping torque once a joint angle crosses a cap, pushing it back inside. Independently, the *rendered* angle written to each pivot is hard-clamped to the cap so the rig can never visibly exceed it even if the penalty allows a small transient overshoot.

**Why penalty stops over hard constraints:** penalty stops are trivial to add to `τ`, need no extra constraint solve, and degrade gracefully; the sub-stepped symplectic integrator keeps them stable. The belt-and-suspenders output clamp guarantees the sacred-caps invariant at the render boundary regardless of solver transients.

**Why no passive joint spring toward rest (only damping):** `locomotion.md` lists trunk joints as damped, with stiffness coming from the Ekeberg muscles in Phase B — adding a passive restoring spring now would be a non-paper force and would mask whether Phase B's stiffness is doing its job. Phase A trunk joints have damping + limit stops only. (If a free chain proves to need a trace of stiffness for numerical rest, it is added as an explicit, documented, near-zero term — not silently.)

### 5. Mesh → mass and planar inertia: a documented geometric approximation

Each chained group owns merged mesh vertices (`SegmentData.positions`). For each segment we approximate, in the x-z plane: **mass** proportional to the segment's planar mesh extent (a density constant × the x-z bounding area, or × vertex-cloud spread), and **rotational inertia** about the segment's joint axis as `Σ mᵢ rᵢ²` over a coarse sampling of the mesh vertices relative to the pivot, projected to x-z. A single global density constant ties mass to geometry so proportions (a heavy trunk, a light tail tip) emerge from the actual model.

**Why an approximation, not true volume integration:** the gate is qualitative (does it conserve momentum, dissipate energy, respect caps?), and relative mass distribution along the body is what matters for that — not absolute kilograms. A vertex-based planar estimate is deterministic, cheap, and good enough; it is isolated in `body.ts` (or `inertia.ts`) behind `buildBodySpec` so a later phase can swap in a better estimator without touching the solver.

### 6. Render mapping: pivots for joints, a scene root group for body pose

Joint yaws drive the existing `pivotsRef` pivots exactly as the Calibrate path does today (`qYaw.setFromAxisAngle(Y_AXIS, θ)`), clamped to caps. The body pose drives a **new `THREE.Group` mounted in `AnimateScene` around `<AnimatedModel>`**, whose position is set to `(xᵣ, 0, zᵣ)` and whose Y-rotation is set to `ψ`. `useLocomotion` writes both each frame from the solver state via refs (no React re-render in the loop), mirroring the existing ref-driven `useFrame` pattern.

**Why the root group at the scene level, not inside `AnimatedModel`:** `AnimatedModel` is shared with the home page and its job is locking groups to pivots; the body-pose root is a Simulate-tab concern. Mounting it in `AnimateScene` keeps `AnimatedModel` untouched and the home path unaffected, matching how the existing `<group rotation={modelRotation}>` wrapper already works.

### 7. Simulation lives behind the existing tab/run gate; rest pose is the default

`useLocomotion` keeps its current responsibilities and gains one branch: when `animateTab === 'simulate'` **and** the new `simulation.running` flag is set, it sub-steps the solver and writes pivots + root; otherwise it does exactly what it does today (rest pose, or Calibrate preview on the Calibrate tab). Reset restores `q` to rest (all `θ = 0`, root at origin) and zeroes velocities; Perturb injects an angular-velocity kick into `q̇`.

**Why reuse `useLocomotion` rather than a parallel hook:** there is one pivots writer per frame; a second hook writing the same pivots would race it. Folding the sim branch into the existing writer keeps a single owner of pivot state and reuses the Calibrate/rest scaffolding.

## Risks / Trade-offs

- **Risk — the mass-matrix dynamics is the hardest code in the phase and easy to get subtly wrong.** → Mitigation: the verification gate is designed to catch exactly its failure modes (COM drift = bad `M`/coupling; energy growth = bad integration sign/step; cap blow-through = bad limit stop). Unit-test `buildBodySpec` (lengths, masses, joint count, limits) and assert in a dev check that a kicked free chain holds COM to within a tight tolerance over N seconds.
- **Risk — stiff limit-stop penalties destabilize the integrator at large `dt`.** → Mitigation: fixed internal sub-step (≤ 2 ms) decoupled from frame `dt`; tune stop stiffness against the sub-step; output clamp guarantees the visible cap invariant regardless.
- **Trade-off — geometric inertia approximation is not physically exact.** → Acceptable for a qualitative gate; isolated behind `buildBodySpec` for later refinement. Documented as an approximation, not presented as ground truth.
- **Trade-off — minimal Simulate controls now, full surface deferred to Phase H.** → Intentional: just enough to run the gate, scoped and labeled as verification scaffolding so it is not mistaken for the final UI.
- **Risk — legs are out of the solver but still rendered.** → They keep rendering at rest pose via the existing leg-pivot path; the solver simply does not include them in `q`. No visual regression, and Phase D adds them deliberately.

## Migration Plan

Each step keeps the studio runnable; the rig stays at rest pose until Run is pressed.

1. **Types + body model.** Add `types.ts` and `body.ts` (`buildBodySpec`). Pure, no rendering. Unit-check lengths/masses/joints/limits against a known config.
2. **Solver core.** Add `solver.ts`: `initSolverState`, mass matrix + Coriolis + damping + limit stops, `stepSolver`, plus `kineticEnergy` and `centerOfMass` diagnostics. Drive it from a temporary dev harness (or a test) and confirm a kicked free chain conserves COM and settles — *before* any rendering.
3. **Store slice.** Add the `simulation` slice (running, reset/perturb signals, diagnostics) + setters to `animateStore.ts`.
4. **Render mapping.** Mount the root group in `AnimateScene`; extend `useLocomotion` with the sim branch writing pivots (clamped) + root pose from solver state; publish diagnostics to the store.
5. **Minimal controls.** Replace the `SimulateTab` placeholder with Run/pause, Reset, Perturb, and the diagnostics readout.
6. **Verify the gate** (see spec scenarios): settles via damping, COM holds under perturbation, caps never exceeded, frame-rate independent. `npx tsc --noEmit` passes.

Rollback: the change is additive behind the Simulate run flag; reverting the `useLocomotion` branch and the scene root group returns the rig to today's rest-pose behavior with no other surface affected.

## Open Questions

None blocking. Deferred:

- Exact mesh→inertia estimator quality — revisit when Phase C swimming makes absolute force scales matter; until then the planar vertex approximation stands.
- Whether the body-pose root group should also carry a debug overlay (COM marker, momentum vector) — fold into Phase B/Phase H tooling rather than expanding Phase A scope.
