## Why

The locomotion body is a **custom planar (2D top-down) reduced-order solver** ([solver.ts](app/game/locomotion/solver.ts)). That was a pragmatic deviation, not a faithful one: the paper's body runs in **ODE via Webots** — a 3D rigid-body engine with gravity and contact (reference §4). The whole project goal is a *faithful recreation* of "a CPG controller driving virtual muscles inside a physics simulation" (locomotion.md). Roadmap **Decision 8** (2026-06-06) reverses the planar (Decision 1) and custom-solver (Decision 2) choices: the body is rebuilt as **3D rigid bodies in the Rapier physics engine**.

Three forces make this the right move *now*, not later:
- **Faithfulness** — an engine is what the paper used; our planar custom integrator was the approximation.
- **Walking is impossible in 2D** — a top-down model has no vertical axis, so foot lift / plant / slip cannot emerge from physics (Decision 4). The planar "phase-gated stance" idea was a workaround. In 3D with gravity + contact, that behavior is *emergent*, which is the whole point.
- **The end goal needs 3D** — creatures must eventually **climb by adhering to surfaces**, operating in any orientation. That requires a real 3D engine with gravity and arbitrary-surface contact.

The rig **nodes already carry `y`** (`nodeFront/Back/HipLeft/Right/Foot` all have `y?`), so the 3D rest pose is authored — `buildBodySpec` currently just discards it.

This change is the **3D foundation** (like Phase A was the 2D foundation). Scope is deliberately narrow: re-platform the body and **re-prove swimming in 3D**. Legs and ground contact are the *next* phase (Phase D / walking); they are explicitly out of scope here.

## What Changes

- **Add `@dimforge/rapier3d-compat` as a direct dependency** (already present transitively via `@react-three/rapier`). Use the **raw module driven from `useLocomotion`** — not the declarative `@react-three/rapier` wrapper — so we own stepping, apply custom external forces, and read body state for diagnostic captures.
- **New 3D body module** (`app/game/locomotion/body3d.ts` + a Rapier world wrapper): from the node skeleton, build one **3D rigid body per axial segment** (head/spine/tail), mass = `nodeWeight`, a capsule/box **collider** sized from node spacing + `STD_SEGMENT_WIDTH` (the engine derives inertia from the collider), connected head→tail by **revolute joints** whose axis is the segment's local up and whose limits come from `angleCaps`. The root segment is a free body. Uses node **x/y/z** (3D rest pose).
- **Deterministic stepping** — fixed timestep, Rapier deterministic mode, stepped a fixed number of substeps per frame (dt-clamped) so diagnostic captures reproduce. Gravity is **off** for this phase (neutral-buoyancy water).
- **Wire the existing controller onto engine joints** — the proven pipeline `stepCpg → oscillatorOutput·CPG_TO_MUSCLE_GAIN → 10 ms delay → ekebergTorque` is unchanged; the resulting per-joint torque is applied to the corresponding Rapier revolute joint each step. The non-reversed `jointToCpgSegment = segmentIndex` mapping and the tuned defaults (drive 2.0, exc 0.09, gain 12) are reused.
- **Generalize the RFT drag to 3D** (`environment.ts` → 3D): per segment, decompose its world COM velocity into the **along-body tangent** and the **two perpendicular** components; apply `F = −L·(C_n·v_⊥ + C_t·v_∥·t̂)` plus angular drag as an **external force/torque on the Rapier body**. Constants and the ≥10:1 anisotropy ratio carry over.
- **Render from the engine** — `useLocomotion` reads each Rapier body's world transform and writes the rig's root frame + chain pivots (replacing the planar solver's output). Meshes and legs stay passengers.
- **Retire the custom planar solver** — delete `solver.ts` and its planar `body.ts` spec path (`buildBodySpec`'s planar `PlanarSegment`/`PlanarJoint`). Git preserves them. Two body engines is a maintenance trap; the planar solver has no role once the body is in Rapier. **BREAKING** internally for anything importing `stepSolver`/`PlanarSegment`.
- **Diagnostic capture updated to 3D** — `serializeCoupledCapture` reads 3D body transforms (root pose, per-joint angle, COM, node polyline) so the swimming gate is measurable in 3D with the same methodology.

## Capabilities

### Modified Capabilities
- `locomotion`: replaces the planar custom-solver body with a 3D Rapier rigid-body chain (mass from `nodeWeight`, joints from the node skeleton + `angleCaps`), generalizes the swimming drag to 3D external forces, drives the engine joints with the existing CPG→Ekeberg controller, renders from engine transforms, and re-proves emergent forward swimming in 3D. The controller (CPG, Ekeberg math), `nodeWeight`, `angleCaps`, and the capture methodology are unchanged.

## Impact

- **Added:** `app/game/locomotion/body3d.ts` (Rapier world + body/joint construction), `@dimforge/rapier3d-compat` direct dep; `openspec/changes/replatform-body-rapier-3d/`.
- **Heavily edited:** `app/game/locomotion/useLocomotion.ts` (Rapier step loop, torque application, render-from-engine), `app/game/locomotion/environment.ts` (2D → 3D drag), `app/game/locomotion/diagnostics.ts` (3D capture).
- **Deleted:** `app/game/locomotion/solver.ts` (custom planar solver); the planar `PlanarSegment`/`PlanarJoint`/`buildBodySpec` path in `body.ts` (superseded by `body3d.ts`; `nodeWeight` defaults + `defaultWeightFor` move to `body3d.ts`).
- **Unchanged:** `cpg.ts`, `muscles.ts`, `chain.ts`, `nodeWeight` authoring in Calibrate, the Simulate sidebar controls, the rig/mesh render scaffolding.
- **Re-verified, not changed:** swimming behavior — the controller is proven, but the 3D body + 3D drag must reproduce forward head-first swimming before this phase closes.
- **Determinism risk:** physics engines can drift run-to-run; mitigated by fixed-step deterministic mode. If bit-exact capture reproducibility proves impossible, the gate falls back to "direction + monotonic forward drift" (which is what matters), not bit-exact match.
- **Supersedes:** roadmap Decisions 1 & 2; the planar solver shipped through `add-uniform-mass-model`.
