## Why

The locomotion rebuild (`documentation/animation-roadmap.md`) recreates the Knüsel et al. (2020) salamander CPG + physics so that movement *emerges* from integrated forces rather than hand-authored keyframes. The walkthrough (roadmap §1, Parts 1–8) is complete and four decisions are locked: **planar (2D top-down)**, **custom reduced-order solver**, **swimming-first**, **foot contact emerges from the contact model**. No locomotion runs yet — the Simulate tab is a placeholder and `useLocomotion` only renders the rest pose.

Every later phase stacks on a body model and a solver: Phase B adds the CPG + Ekeberg muscle torques *into* the solver; Phase C adds hydrodynamic forces; Phase D adds limbs + contact. None of them can be built — or verified — without a physical body derived from the rig and an integrator that advances it. This change is **Phase A**: it derives that planar multibody body from the rig (layer L1 in `documentation/locomotion.md §3`) and stands up the minimal custom integrator (L4), with **no actuation, no CPG, and no environment forces**.

Phase A adds no locomotion. It establishes — and visually verifies — the substrate the rest of the roadmap drives: a free planar rigid-body chain that conserves momentum, dissipates energy through joint damping, and respects the studio angle caps as joint-limit stops. Getting this correct in isolation (before any forces exist to mask integration bugs) is the point of the phase.

## What Changes

- **New body model (L1)** — a pure function that derives a planar multibody spec from the rig's body groups: one rigid **segment** per chained group (head → spines → tail), **segment length** from node spacing (distance between consecutive joint nodes in the x-z plane), **mass + planar rotational inertia** approximated from each group's merged mesh geometry, a **1-DOF yaw joint (about Y)** at each segment's `nodeBack`, and **joint limits** taken from `effectiveAngleCaps(group)` (`yaw` / `yawBack`). Reads only rig data; no hard-coded per-model numbers.
- **New custom solver (L4)** — a reduced-coordinate planar integrator over the state `q = [xᵣ, zᵣ, heading, θ₁…θₙ]` (free body pose + per-joint yaw). Each step builds the configuration-dependent mass matrix (composite-rigid-body), adds Coriolis/centrifugal terms, applies **passive joint damping** and **joint-limit stops** (the caps), and advances with semi-implicit (symplectic) Euler. **No muscle torques, no hydrodynamics, no contact, no gravity** — the only generalized forces are damping and limit stops.
- **Render mapping (L6, minimal)** — the solver's integrated joint yaw angles are written to the existing `pivotsRef` pivots (clamped to caps), and the body's free pose `(xᵣ, zᵣ, heading)` is written to a **new root group** the scene mounts around the model. This is the first use of the render root the paper does not need (roadmap Part 4 / Part 8).
- **Minimal Simulate-tab verification controls** — the placeholder text is replaced with the smallest control set needed to run the verification gate: **Run/pause**, **Reset to rest**, **Perturb** (apply an angular-velocity kick to the chain), and read-only **diagnostics** (total kinetic energy, COM displacement since reset, max |joint angle| vs cap). This is explicitly *verification scaffolding*, not the Phase H control surface.
- **Non-goals:**
  - No CPG / oscillator network (Phase B).
  - No Ekeberg muscles or any actuation torque (Phase B).
  - No hydrodynamic, contact, friction, or gravity forces (Phase C / D).
  - No limbs, gait, transfer function, or leg joints in the solver (Phase D) — legs keep rendering at rest pose.
  - No turning / differential drive / behavior presets (Phase E).
  - No attractor / head-tracking (Phase F).
  - No proprioceptive feedback (Phase G).
  - No full Simulate-tab control surface (Phase H) — only the minimal verification controls above.
  - No 3D / out-of-plane (pitch/roll) dynamics — Decision 1 locks planar.
  - No changes to the Calibrate tab, node authoring (`app/admin/group/*`), segment/mesh loading, `sharedStore`, config schema, or save/load.
  - No database / Supabase changes, no new runtime dependencies.

## Capabilities

### New Capabilities

- `locomotion` — the physics-based locomotion system for the rig. Phase A introduces its first two layers: the rig-derived planar body model (L1) and the passive custom integrator (L4), plus the minimal render mapping and verification controls that make them legible. Later phases extend this capability with the CPG, muscles, and environment forces.

### Modified Capabilities

None. The old kinematic `dragon-animation` capability is superseded and out of scope; this change does not touch it.

## Impact

- **New files:**
  - `app/game/locomotion/body.ts` — L1: `buildBodySpec(groups)` → planar multibody spec (segments, lengths, masses, inertias, joints, limits).
  - `app/game/locomotion/solver.ts` — L4: solver state + `stepSolver(state, spec, dt)` (mass matrix, Coriolis, damping, limit stops, semi-implicit Euler) + helpers (`initSolverState`, `perturb`, kinetic energy, COM).
  - `app/game/locomotion/types.ts` — shared types: `BodySpec`, `Segment`, `Joint`, `SolverState`.
  - Optionally `app/game/locomotion/inertia.ts` if the mesh→mass/inertia approximation grows past readability.
- **Edited files:**
  - `app/game/locomotion/useLocomotion.ts` — when the Simulate tab is in "run" mode, step the solver each frame and write joint yaws to pivots + the body pose to the root group; otherwise keep today's rest-pose / Calibrate behavior unchanged.
  - `app/admin/animate/animateStore.ts` — add a `simulation` slice (running flag, reset/perturb signals, live diagnostics) + setters.
  - `app/admin/animate/AnimateScene.tsx` — mount a root group (ref) around `<AnimatedModel>` that the solver drives with the body pose.
  - `app/admin/animate/AnimateSidebar.tsx` — replace the `SimulateTab` placeholder with the minimal verification controls + diagnostics readout.
- **Untouched:** `CalibrateTab.tsx`, `LimitSlider.tsx`, `app/admin/group/*`, `app/admin/_lib/sharedStore`, `app/admin/_lib/types.ts` (read only), `AnimatedModel.tsx` rendering (gains a root-group wrapper at the scene level, not internally), `chain.ts`, `legs.ts`, mesh/segment loading, config save/load.
- **No new dependencies** — the solver is hand-written; `three` math types are already present.
- **No database / Supabase changes. No breaking changes** — existing configs render identically; the rig sits at rest pose until the user presses Run.
