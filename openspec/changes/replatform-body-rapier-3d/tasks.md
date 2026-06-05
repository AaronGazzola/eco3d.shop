## 1. Rapier bootstrap + spikes

- [ ] 1.1 Add `@dimforge/rapier3d-compat` as a direct dependency (already transitive via `@react-three/rapier`); confirm it imports and `await RAPIER.init()` resolves in the app.
- [ ] 1.2 Spike: confirm the cleanest API to (a) create a dynamic body with a capsule collider whose **mass = a chosen value** while the engine derives the inertia tensor; (b) create a revolute joint with angle limits; (c) read a revolute joint's `angle()` and the bodies' angular velocities for `φ̇`. Record the chosen calls in design.md Open Questions.
- [ ] 1.3 Decide + document the fixed timestep (e.g. 1/120) and substep accumulator.

## 2. 3D body construction (`body3d.ts`)

- [ ] 2.1 Move `DEFAULT_AXIAL_WEIGHT`, `DEFAULT_LEG_WEIGHT`, `STD_SEGMENT_WIDTH`, `defaultWeightFor` out of `body.ts` into `body3d.ts`.
- [ ] 2.2 Build the axial chain (`flattenSkeleton(buildSkeletonTree(groups))`, head/spine/tail; legs excluded) → one dynamic rigid body per segment at its rest world transform from node x/y/z, capsule collider (half-length from node spacing, radius from `STD_SEGMENT_WIDTH`), collider mass = `group.nodeWeight ?? defaultWeightFor(type)`.
- [ ] 2.3 Revolute joints head→tail at each `parent.nodeBack`, axis = segment local up, limits `[−yawBackwardLimit, +yawForwardLimit]` from `effectiveAngleCaps`. Head = free root body.
- [ ] 2.4 Expose handles: ordered body list, joint list, and a `jointToCpgSegment[i] = segmentIndex` map (the proven non-reversed mapping). Build is deterministic for equal `(groups, segments)`.
- [ ] 2.5 `npx tsc --noEmit` and `npx eslint` pass.

## 3. Controller → engine joints (`useLocomotion`)

- [ ] 3.1 Stand up the Rapier world (gravity 0), build the body via `body3d.ts` when coupled mode starts; guard the whole loop until `RAPIER.init()` + rig are ready.
- [ ] 3.2 Per fixed substep: `stepCpg`; for each joint read `φᵢ`, `φ̇ᵢ`; compute `mL/mR = oscillatorOutput(segmentIndex / +n)·CPG_TO_MUSCLE_GAIN` → 10 ms delay → `ekebergTorque` → apply `+τ·axis` to child, `−τ·axis` to parent; then `world.step()`.
- [ ] 3.3 Reuse the tuned defaults (drive 2.0, exc 0.09, gain 12); the CPG/muscle modules are imported unchanged.
- [ ] 3.4 `npx tsc --noEmit` and `npx eslint` pass.

## 4. 3D drag (`environment.ts`)

- [ ] 4.1 Replace the planar generalized-force drag with the 3D per-body version: `v_∥ = (v·t̂)t̂`, `v_⊥ = v − v_∥`, `F = −L(C_n·v_⊥ + C_t·v_∥)`, `τ = −L·C_ω·ω`; apply via `body.addForce`/`addTorque` each step when `environmentEnabled`.
- [ ] 4.2 Keep `DRAG_NORMAL/TANGENT/ANGULAR = 0.6/0.05/0.03` as the starting values; ratio ≥10:1 preserved.
- [ ] 4.3 `npx tsc --noEmit` and `npx eslint` pass.

## 5. Render from engine

- [ ] 5.1 Write the rig root frame from the head body's world transform and each chain pivot's local yaw from its revolute joint angle (reuse the existing root + per-joint render path; source from Rapier instead of the planar solver). Meshes + legs stay passengers.
- [ ] 5.2 Confirm in-studio the rig follows the body (no NaN, no detached meshes).

## 6. Diagnostics (3D)

- [ ] 6.1 Update `serializeCoupledCapture` to read 3D state: root pose, per-joint angle, mass-weighted COM (from body translations), node polyline; snout-projected COM drift as the gate metric.
- [ ] 6.2 Verify two identical runs reproduce a matching capture on this machine (or, if not bit-exact, that the head-first monotonic drift is stable).

## 7. Retire the planar solver

- [ ] 7.1 Delete `app/game/locomotion/solver.ts` and the planar `buildBodySpec`/`PlanarSegment`/`PlanarJoint` path in `body.ts`; update all imports to the 3D API.
- [ ] 7.2 Update or retire `scripts/locomotion-drag-direction.ts` (it tested the planar drag mapping; re-point at the 3D drag or remove).
- [ ] 7.3 `npx tsc --noEmit` and `npx eslint` pass across the repo (no dangling planar-solver imports).

## 8. Visual gate — 3D swimming

- [ ] 8.1 Load a rig, run coupled drive with **Drag OFF** in the 3D world: body undulates head→tail in place, COM does not translate, no out-of-plane tumble blow-up.
- [ ] 8.2 **Drag ON**, record ≥ 3 s: snout-projected COM drift increases monotonically **head-first**, reproducing the planar swim in 3D. Re-fit `C_n` (ratio preserved) if needed.
- [ ] 8.3 Confirm the body stays roughly in its start plane (Open Question: out-of-plane drift); if it tumbles, decide on a weak in-plane restoring drag vs accepting gentle 3D wander, and record the choice.

## 9. Documentation

- [ ] 9.1 Update `documentation/animation-roadmap.md` §4 with a dated entry: Rapier world params (timestep, gravity), body/collider/joint construction, the 3D drag, the 3D swim-gate result, and any re-tune; mark Phase C-3D done and confirm Decisions 1/2/8 read correctly.

## 10. OpenSpec validation

- [ ] 10.1 `npx openspec validate replatform-body-rapier-3d --strict` passes.
