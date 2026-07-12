## Context

The locomotion sim builds Rapier bodies in `app/game/locomotion/body3d.ts` and drives them from the CPG in `app/game/locomotion/cpg.ts`. The CPG is engine-agnostic: it outputs `signedActivation(k)` per spine segment and `girdleClockPhase(limbIdx)` per leg, and knows nothing about the solver. The blocker is purely the solver — Rapier's maximal-coordinate impulse model turns every motor into a spring, so actuated joints cannot be both rigid and force-exerting. MuJoCo is a reduced-coordinate (articulated-body) engine whose native position actuators and runtime-toggle equality constraints are the reference implementation of exactly the model we intend to hand-write. It has an Emscripten/WASM build, so it can run in this project's existing WASM-friendly toolchain.

This change is a de-risking spike with a durable artifact: it proves the target physics before we invest in a custom solver, and the resulting model + harness remains the oracle we validate the ABA against.

## Goals / Non-Goals

**Goals:**
- Prove that the real CPG, applied as position-servo torques to a reduced-coordinate model of our skeleton with a switchable grip constraint, produces a stable walk.
- Produce a reusable MuJoCo oracle and a recorded, evidence-backed go/no-go verdict.
- Reuse the identical CPG and skeleton geometry the app uses, so only the physics engine differs.

**Non-Goals:**
- The custom ABA solver (later phase).
- Any change to in-app physics, `useLocomotion`, `body3d.ts`, Rapier, or the presets.
- Shipping MuJoCo in the product; terrain/climbing; the steering/neural layer.

## Decisions

**1. MuJoCo as the oracle (vs Bullet `btMultiBody` / PhysX articulations).**
MuJoCo is the most widely used and best-documented reduced-coordinate engine, has a maintained WASM build, and provides native `position` actuators and `equality/connect` constraints that toggle at runtime — a one-to-one match for "servo at every joint + switchable grip." Bullet/PhysX would work but need more glue for the same result.

**2. Reuse the real `cpg.ts`; never reimplement it.**
The entire point is *same CPG, different physics*. The runner is a TypeScript script executed via `tsx` so it imports `buildCpgSpec`, `initCpgState`, `stepCpg`, `signedActivation`, and `girdleClockPhase` directly from the app. Any divergence would invalidate the comparison.

**3. Model mapping (reduced coordinates).**
Floating-base trunk chain, one hinge DOF per inter-segment joint about that joint's `restAxisLocal`, and a two-hinge hip (lift then sweep) per leg with **no carrier body** — the carrier only exists because Rapier needs one rigid body per revolute; ABA/MuJoCo model a 2-DOF joint natively. Capsule geoms carry inertia; joint ranges come from `effectiveAngleCaps` (`[−capBackward, capForward]` for spine, `[−capSwing, capStance]` for hips), all derived from the same skeleton functions `body3d.ts` uses so the model matches the rendered creature.

**4. Servo = MuJoCo `position` actuator with a force limit.**
Every hinge gets a position actuator with `forcerange` = the joint's stall torque (from its cap and a configured strength constant) and shared `kp`/`kv`, tuned once so the spine holds the CPG target under grip load at 1/120. This replaces both the Ekeberg spring and the leg PD motors with one model.

**5. Grip = switchable `equality/connect`, toggled by the CPG clock.**
Each foot has a `connect` constraint (foot site ↔ world anchor site) that is activated/deactivated each step from `girdleClockPhase` using `gripShift`/`gripDuration`, exactly as `useLocomotion` gates the grip; rotation stays free. When not gripping, the foot rests on a ground plane by contact — so the run validates both the pinned and the free-contact regimes.

**6. Skeleton input = a `creature-groups.json` fixture exported once from the studio.**
The exporter reads the identical `groups` the app renders (dumped once via a small read-only `window.__studio.dumpGroups()` or an equivalent script), so the oracle's geometry is not a hand-built approximation.

**7. Runner host: Node first, Puppeteer fallback.**
Run the MuJoCo-WASM module under Node if it loads there; if the build is browser-only, load the MJCF + runner inside the existing Puppeteer/observe harness (the app already loads WASM in-browser). Decide at implementation and record which path was used.

**8. Metrics reuse `observe-coherence.mjs` definitions.**
Forward COM travel, body tilt/roll, and body-wave coherence/spectral purity use the same definitions as the existing harness, so the oracle's numbers are directly comparable to the Rapier presets.

## Risks / Trade-offs

- **MuJoCo-WASM Node support is uncertain** → Puppeteer browser-harness fallback (Decision 7).
- **Unit/inertia mismatch** — the skeleton lives in an arbitrary node-space scale → set consistent density/mass and sanity-check a gravity settle before trusting walk metrics.
- **Servo gains need tuning** → a single documented tuning pass; the working `kp`/`kv`/`forcerange`/mass become the starting point for the ABA.
- **The verdict could be no-go** → that is a valid and valuable outcome; the report records the decision either way, so we do not build a solver on an unproven premise.
