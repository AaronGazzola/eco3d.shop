## Context

Phases A–C built a planar custom solver: a reduced-coordinate 2D integrator (`solver.ts`) with hand-derived mass matrix, Coriolis, penalty joint-limits, and an anisotropic resistive-force drag (`environment.ts`). It works — swimming is proven forward, head-first. But it is 2D top-down, which fundamentally cannot represent foot lift / emergent ground contact, and it is a custom integrator where the paper used a real engine (ODE/Webots). Roadmap Decision 8 re-platforms the body onto **Rapier** in 3D.

The controller is *not* in question — `cpg.ts` and `muscles.ts` (Ekeberg torque) are proven and unchanged. This change swaps only the **body dynamics layer** beneath them and **re-proves swimming in 3D**. Legs and ground contact are Phase D.

`@react-three/rapier` is already a dependency, so the Rapier WASM is vetted and present.

## Goals / Non-Goals

**Goals.**
- A 3D rigid-body axial chain in Rapier, built from the node skeleton (using node `y`), mass from `nodeWeight`, joints + limits from `angleCaps`.
- The existing CPG → Ekeberg torque pipeline drives the engine's revolute joints; the non-reversed `segmentIndex` mapping and tuned defaults (drive 2.0, exc 0.09, gain 12) carry over.
- 3D anisotropic resistive drag as external forces on the bodies; gravity off (neutral buoyancy).
- Deterministic, fixed-step stepping so diagnostic captures reproduce locally.
- Render the rig from engine transforms via the **existing** root-pose + per-joint-yaw path (minimal render change).
- Gate: the body swims **forward, head-first** in 3D, reproducing the planar result.
- Retire `solver.ts` and the planar `body.ts` spec path.

**Non-Goals.**
- No legs / limb oscillators / transfer function (Phase D).
- No gravity, ground contact, or friction (Phase D).
- No adhesion / climbing (later phase).
- No reactive (added-mass) hydrodynamics — resistive only, as before.
- No cross-machine bit-exact determinism — local reproducibility is enough for gates.
- No change to the CPG or Ekeberg constants/math.

## Approach

**The engine boundary.** Rapier owns: integration, the joint constraints, joint-limit stops, and collision (unused this phase). The controller owns: CPG state, muscle activations, and the per-joint **torque** it asks the engine to apply. The drag is a custom **external force** we compute and add to each body every step (Rapier has no hydrodynamics). So Rapier replaces exactly what `solver.ts` did — the equations of motion and limits — and nothing more.

**World + stepping (determinism).**
- One `RAPIER.World` with `gravity = (0, 0, 0)`. `await RAPIER.init()` once (WASM load) before building; guard the frame loop until ready.
- Fixed timestep: set `world.timestep` to a constant (e.g. 1/120). Per render frame, accumulate `dt` and step a whole number of fixed substeps (clamp accumulated dt to avoid spirals), mirroring the planar solver's substep loop. No `Math.random`/`Date` in the loop.
- `rapier3d-compat` is f32 → deterministic **same-machine, same-build, same inputs** (what captures need); cross-machine bit-exactness is not guaranteed and not required.

**Body construction (`body3d.ts`).** Walk the axial chain (`flattenSkeleton(buildSkeletonTree(groups))` — head/spine/tail only, legs excluded exactly as today). For each segment `i`:
- A **dynamic rigid body** placed at the segment's rest world transform: position from the node skeleton (the segment's rest origin in x/y/z), orientation aligning the body's local long axis to the rest direction toward the next node.
- A **collider** — a capsule along the segment's local long axis, half-length from node spacing, radius from `STD_SEGMENT_WIDTH`. Set the collider's **mass explicitly to `nodeWeight`** (Rapier then derives the rotational inertia tensor from the capsule shape + that mass — replacing our hand-rolled rod formula).
- For `i > 0`, a **revolute joint** to segment `i−1`, anchored at the shared node (`parent.nodeBack`), axis = the segment's local **up** (yaw undulation). Configure the joint **limits** to `[−yawBackwardLimit, +yawForwardLimit]` from `angleCaps` (the engine's hard limit replaces our penalty limit-stop).
- Segment 0 (head) is the **free root** body (no joint above it).

**Driving the joints (controller → torque).** Each step, for each joint `i`:
- Read the current joint angle `φᵢ` (Rapier revolute `.angle()`) and rate `φ̇ᵢ` (from the two bodies' relative angular velocity about the axis).
- Run the unchanged pipeline: `stepCpg` → `oscillatorOutput(k)·GAIN` with `k = jointToCpgSegment[i] = segmentIndex` → 10 ms delay buffer → `ekebergTorque(mL, mR, φᵢ, φ̇ᵢ)`.
- Apply the resulting torque `τᵢ` as an **internal joint torque**: `child.addTorque(+τᵢ · axisWorld)`, `parent.addTorque(−τᵢ · axisWorld)` (Newton's third law — internal, cannot translate the COM, exactly like the planar generalized force). The β-spring and δ-damping terms in the Ekeberg formula provide the restoring/damping the planar solver had; Rapier's joint limit provides the cap stop.

*(Alternative considered: Rapier's revolute motor with position target. Rejected — the Ekeberg model is a torque law, not a position target; applying torque keeps the controller path identical to the proven planar one.)*

**3D resistive drag (`environment.ts` → 3D).** Per segment body, with world COM velocity `v`, segment long-axis unit `t̂` (from the body's orientation), length `L`, angular velocity `ω`:
```
v_∥ = (v · t̂) · t̂          (along-body component)
v_⊥ = v − v_∥              (the full perpendicular component — a 3-vector)
F   = −L · (C_n · v_⊥ + C_t · v_∥)
τ   = −L · C_ω · ω
```
Add `F` at the COM (`body.addForce`) and `τ` (`body.addTorque`). This is the exact 2D law with the perpendicular generalized from a single direction to the perpendicular plane. Constants `0.6 / 0.05 / 0.03` and the ≥10:1 ratio carry over; re-confirm at the gate (3D adds a second perpendicular axis, so effective damping may differ slightly).

**Render mapping (minimal change).** The bodies are connected by 1-DOF revolute joints, so the relative orientation between adjacent segments is a single yaw = the joint angle. So we keep the **existing render path**: write the **root frame** from the head body's world transform, and each chain pivot's **local yaw** from its revolute joint angle — identical in shape to what the planar solver fed the renderer (`jointAngles[]` + root pose), now sourced from Rapier. Meshes and legs remain passengers.

**Diagnostic capture (3D).** `serializeCoupledCapture` reads: root 3D pose, per-joint angle, mass-weighted COM (from body translations), and the node polyline (body positions). The swim gate measures COM displacement projected on the snout axis — head-first, monotonic — the same metric as the planar gate, now in 3D.

**Retiring the planar solver.** Delete `solver.ts`. `body.ts`'s planar `buildBodySpec`/`PlanarSegment`/`PlanarJoint` are replaced by `body3d.ts`; the `nodeWeight` defaults (`DEFAULT_AXIAL_WEIGHT`, `DEFAULT_LEG_WEIGHT`, `STD_SEGMENT_WIDTH`, `defaultWeightFor`) move to `body3d.ts`. Anything importing the planar API is updated to the 3D one. The headless `scripts/locomotion-drag-direction.ts` is updated or retired (it tested the planar drag mapping; the 3D equivalent can re-prove direction once `body3d.ts` exists).

## Trade-offs

- **Decision 1 (collider shape):** capsule vs box. **Capsule** — better-behaved contact later (Phase D), rounded ends avoid snagging, inertia is clean. Box would match the old AABB intuition but contacts worse. Capsule.
- **Decision 2 (set mass vs density):** set the collider **mass explicitly** to `nodeWeight` (uniform, authored) rather than a density × volume — that is the whole point of the mass-decoupling from `add-uniform-mass-model`; density would re-introduce a size→mass coupling.
- **Decision 3 (torque vs motor):** apply **internal joint torque** (keeps the Ekeberg controller path byte-identical to the proven planar one) rather than Rapier's position motor.
- **Decision 4 (raw Rapier vs `@react-three/rapier`):** **raw `@dimforge/rapier3d-compat`** driven from `useLocomotion` — we need to step deterministically, inject custom drag forces, and read state for captures; the declarative R3F wrapper fights all three.
- **Decision 5 (delete vs keep `solver.ts`):** **delete.** Two body engines is a maintenance and divergence trap; the planar solver has no role once the body is in Rapier, and git preserves it.

## Spike findings (resolved — Rapier 0.12 compat, task 1.2)

Confirmed headless (`scripts/rapier-spike.ts`):
- World: `await RAPIER.init()`; `new RAPIER.World({x,y,z})`; `world.timestep = 1/120` (chosen fixed step).
- Body: `RAPIER.RigidBodyDesc.dynamic().setTranslation(...).setRotation(quat)` → `world.createRigidBody`.
- Collider: `RAPIER.ColliderDesc.capsule(halfHeight, radius).setMass(nodeWeight)` — engine derives the inertia tensor from the shape at that mass (`body.principalInertia()` confirmed). **Orient the capsule along the segment's forward (long) axis**, perpendicular to the yaw joint axis: the default capsule lies along local Y and its inertia about that long axis is tiny (~0.045 vs ~0.32 perpendicular). If the long axis coincided with the yaw axis, yaw would rotate about the thin axis and snap to its limits. So set the collider's local rotation so its axis = segment forward, and the revolute axis = segment up.
- Joint: `RAPIER.JointData.revolute(anchor1Local, anchor2Local, axisLocal)` → `world.createImpulseJoint(jd, parent, child, true)`; then `joint.setLimits(−yawBack, +yawFwd)` — limits are **not** on `JointData`; the setter clamps (verified).
- Joint angle: **compute from body quaternions** (relative rotation about the axis) — no `joint.angle()` in 0.12. Rate `φ̇`: `child.angvel() − parent.angvel()` projected on the world axis.
- Forces: `body.addForce({x,y,z}, true)` / `body.addTorque({x,y,z}, true)` each step before `world.step()`. Internal torque pair (`+τ` child, `−τ` parent) bent the joint without flinging the bodies — the intended model.

## Stability findings (real-rig debugging, 2026-06-06)

The first browser run on the real (curved 3D) rig went unstable (peakKE ~9000, head spinning, joints at 130% of caps). Three fixes, all validated headless on straight + curved + 3D-curved rigs (`scripts/locomotion-3d-swim-check.ts`):
1. **World-aligned bodies.** Orienting each rigid *body* to its own segment direction made adjacent revolute joints' yaw axes disagree on a curved rest pose, so the joints snapped violently at startup. Fix: all bodies keep identity orientation; only the **capsule collider** is rotated to the segment forward. Every joint's yaw axis is then world-up and consistent. (Straight rigs hid this because all segments share one orientation.)
2. **Joint damping.** The planar coupled mode added an effective ~2 N·m·s/rad of joint damping (`jointDampingScale`); the 3D port only had Ekeberg's δ=0.1. Added `JOINT_DAMPING_3D = 2` as a `−D·φ̇` torque per joint.
3. **Gain re-tune 12 → 1.** Rapier's revolute *limits are soft* — the planar gain of 12 blew straight through them (joints to 88° vs 45° caps) into chaos (KE 1e5+, direction even flipping run-to-run). At **gain ~1** the body stays in the controlled regime (peakKE ~140, maxJ ~43°) and swims head-first consistently across all rig curvatures. The planar tuning does not transfer; thrust speed is deferred (AZ-33).

## Open Questions

- **Out-of-plane drift.** With gravity off and full 3D freedom, does the body stay roughly in its starting (horizontal) plane during swimming, or does it slowly tumble/drift in pitch/roll? The axial joints are pure yaw, and the drag is symmetric, so it *should* stay planar — but confirm at the gate. If it drifts, options: a weak restoring drag toward the swim plane, or accept gentle 3D wander (it is, after all, a 3D swimmer now).
- **Exact mass-properties API.** Confirm the cleanest Rapier call to set a collider's mass to `nodeWeight` while letting the engine compute the inertia tensor from the capsule (`ColliderDesc.setMass` vs `setDensity` vs `RigidBodyDesc.setAdditionalMassProperties`). A spike during task 1.
- **Joint rate read.** Confirm how to read `φ̇ᵢ` for the Ekeberg δ-term — relative angular velocity of the two bodies projected on the joint axis. If Rapier doesn't expose it directly, compute from `child.angvel() − parent.angvel()`.
- **Drag re-tune.** The 3D perpendicular plane has two axes vs one in 2D; effective normal drag on the body may differ. Expect a small re-fit of `C_n` (ratio preserved) at the gate.
- **Capture determinism.** Verify two identical runs produce matching captures on this machine. If not bit-exact, the gate is "head-first monotonic forward drift," not bit-match.
- **WASM init timing.** `RAPIER.init()` is async; ensure the Simulate loop no-ops cleanly until the world is built (the rig also loads async, so there is already a not-ready path to mirror).
