## Why

We have hit a fundamental limit of the current physics. Rapier is a maximal-coordinate impulse solver, so every actuated joint (spine and legs) behaves like a spring: it sags under load and stores/releases energy instead of holding its commanded angle and driving the body the way the paper's servo-driven robot does. When one foot grips with no body friction, the spine wave collapses and the hip bounces on release — the springs cannot exert the force real servos would.

The intended fix is to move the creature to a reduced-coordinate articulated-body (Featherstone/ABA) solver with a position servo at every joint. Writing a bespoke solver is real work, so before committing we prove the physics: feed the **exact same CPG output** into a reduced-coordinate model of our skeleton with position servos, using an off-the-shelf reference engine (MuJoCo) as an oracle, and record whether it produces a stable walk. The oracle is not throwaway — it stays as the regression reference the custom ABA is validated against in later phases.

## What Changes

- Add a **skeleton→MJCF exporter** that reads the same `BodyGroup` skeleton the studio uses (nodes, segment lengths, masses, bend axes + angle caps, hip sockets, feet) via the existing skeleton functions and emits a MuJoCo model: a floating-base trunk chain of one-DOF hinges plus a two-hinge (lift + sweep) hip per leg with **no carrier bodies**, per-joint angle limits, and capsule inertia.
- Add **position-servo actuators** at every joint — a MuJoCo `position` actuator with a finite force limit (the joint's stall torque), applied identically to spine and legs. This is the single unified actuation model that replaces both the Ekeberg spring and the leg PD motors.
- Add **grip as a switchable `connect` constraint** pinning a foot to a world anchor (rotation free), enabled/disabled at runtime by the existing CPG grip clock; a ground plane handles non-gripping stance contact.
- Add a **CPG-driven validation runner** that imports the real `cpg.ts` unchanged (`buildCpgSpec` / `stepCpg` / `signedActivation` / `girdleClockPhase` — no reimplementation), steps MuJoCo at 1/120, and maps CPG output to servo targets + grip on/off exactly as `useLocomotion` does.
- Add a **recorded go/no-go verdict**: run the base-wave, base-walk, and sweep&grip configs through the oracle and commit a short report (metrics + captures) comparing forward travel, body tilt/roll, and wave coherence against the Rapier presets, with an explicit conclusion.

Non-goals (out of this change): writing the custom ABA solver, any in-app/runtime physics change, shipping MuJoCo in the product, terrain/climbing, and the steering/neural layer.

## Capabilities

### New Capabilities

- `locomotion-physics-oracle`: an off-the-shelf reduced-coordinate (MuJoCo-WASM) reference model of the creature skeleton, driven by the real CPG through position servos and a switchable grip constraint, used to prove that servo-actuated articulated physics reproduces the paper's walk and to serve as the regression oracle for the later custom ABA solver.

## Impact

- **New:** `scripts/mujoco/` (MJCF exporter + CPG-driven validation runner), a one-time `documentation/diagnostics/creature-groups.json` skeleton fixture exported from the studio, and a `documentation/diagnostics/mujoco-validation.md` verdict report + captures.
- **Reused unchanged:** `app/game/locomotion/cpg.ts`, `chain.ts`, `weights.ts` (imported by the exporter/runner). No app or runtime code changes — Rapier, `useLocomotion`, `body3d.ts`, and the presets are untouched.
- **New dev dependency:** a MuJoCo-WASM package plus a TS script runner (`tsx`) so the runner can import the real CPG modules directly.
- **No data/schema/API changes.**
