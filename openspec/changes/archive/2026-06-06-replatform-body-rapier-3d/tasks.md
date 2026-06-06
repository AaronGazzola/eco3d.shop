## 1. Rapier bootstrap + spikes

- [x] 1.1 Add `@dimforge/rapier3d-compat` as a direct dependency (already transitive via `@react-three/rapier`); confirm it imports and `await RAPIER.init()` resolves in the app.
- [x] 1.2 Spike: confirm the cleanest API to (a) create a dynamic body with a capsule collider whose **mass = a chosen value** while the engine derives the inertia tensor; (b) create a revolute joint with angle limits; (c) read a revolute joint's `angle()` and the bodies' angular velocities for `φ̇`. Record the chosen calls in design.md Open Questions.
- [x] 1.3 Decide + document the fixed timestep (1/120, fixed substep accumulator) (e.g. 1/120) and substep accumulator.

## 2. 3D body construction (`body3d.ts`)

- [x] 2.1 Move `DEFAULT_AXIAL_WEIGHT`, `DEFAULT_LEG_WEIGHT`, `STD_SEGMENT_WIDTH`, `defaultWeightFor` out of `body.ts` into `body3d.ts`.
- [x] 2.2 Build the axial chain (`flattenSkeleton(buildSkeletonTree(groups))`, head/spine/tail; legs excluded) → one dynamic rigid body per segment at its rest world transform from node x/y/z, capsule collider (half-length from node spacing, radius from `STD_SEGMENT_WIDTH`), collider mass = `group.nodeWeight ?? defaultWeightFor(type)`.
- [x] 2.3 Revolute joints head→tail at each `parent.nodeBack`, axis = segment local up, limits `[−yawBackwardLimit, +yawForwardLimit]` from `effectiveAngleCaps`. Head = free root body.
- [x] 2.4 Expose handles: ordered body list, joint list, and a `jointToCpgSegment[i] = segmentIndex` map (the proven non-reversed mapping). Build is deterministic for equal `(groups, segments)`.
- [x] 2.5 `npx tsc --noEmit` and `npx eslint` pass. **Validated headless** (`scripts/locomotion-3d-swim-check.ts`): the full CPG→Ekeberg→Rapier→3D-drag pipeline swims the 3D body HEAD-FIRST (COM Δx −18 over 10 s). Proves body3d construction + controller wiring + 3D drag logic before UI.

## 3. Controller → engine joints (`useLocomotion`)

- [x] 3.1 Stand up the Rapier world (gravity 0), build the body via `body3d.ts` when coupled mode starts; guard the whole loop until `RAPIER.init()` + rig are ready.
- [x] 3.2 Per fixed substep: `stepCpg`; for each joint read `φᵢ`, `φ̇ᵢ`; compute `mL/mR = oscillatorOutput(segmentIndex / +n)·CPG_TO_MUSCLE_GAIN` → 10 ms delay → `ekebergTorque` → apply `+τ·axis` to child, `−τ·axis` to parent; then `world.step()`.
- [x] 3.3 Reuse the tuned defaults (drive 2.0, exc 0.09, gain 12); the CPG/muscle modules are imported unchanged.
- [x] 3.4 `npx tsc --noEmit` and `npx eslint` pass.

## 4. 3D drag (`environment.ts`)

- [x] 4.1 Replace the planar generalized-force drag with the 3D per-body version: `v_∥ = (v·t̂)t̂`, `v_⊥ = v − v_∥`. Applied as **semi-implicit (exponential) velocity damping post-step** — `v_∥ ·= exp(−C_t·L·dt/m)`, `v_⊥ ·= exp(−C_n·L·dt/m)`, `ω ·= exp(−C_ω·L·dt/I)` — not an explicit force (an explicit `F = −L(C_n·v_⊥ + C_t·v_∥)` ran energy away; see design Stability finding 4). `applyEnvironment3D(body, dt)` runs after `world.step()` when `environmentEnabled`.
- [x] 4.2 Keep `DRAG_NORMAL/TANGENT/ANGULAR = 0.6/0.05/0.03` as the starting values; ratio ≥10:1 preserved.
- [x] 4.3 `npx tsc --noEmit` and `npx eslint` pass.

## 5. Render from engine

- [x] 5.1 Write the rig root frame from the head body's world transform and each chain pivot's local yaw from its revolute joint angle (reuse the existing root + per-joint render path; source from Rapier instead of the planar solver). Meshes + legs stay passengers.
- [x] 5.2 Confirm in-studio the rig follows the body (no NaN, no detached meshes). Verified via the headless observation loop — render now reads each segment's actual Rapier transform (truthful render); body follows correctly, no NaN.

## 6. Diagnostics (3D)

- [x] 6.1 Update `serializeCoupledCapture` to read 3D state: root pose, per-joint angle, mass-weighted COM (from body translations), node polyline; snout-projected COM drift as the gate metric.
- [x] 6.2 Verify two identical runs reproduce a matching capture on this machine (or, if not bit-exact, that the head-first monotonic drift is stable). Head-first monotonic drift is stable and reproducible across runs (drift 0→23 monotonic).

## 7. Retire the planar solver

- [x] 7.1 Delete `app/game/locomotion/solver.ts` and the planar `buildBodySpec`/`PlanarSegment`/`PlanarJoint` path in `body.ts`; update all imports to the 3D API.
- [x] 7.2 Update or retire `scripts/locomotion-drag-direction.ts` (it tested the planar drag mapping; re-point at the 3D drag or remove).
- [x] 7.3 `npx tsc --noEmit` and `npx eslint` pass across the repo (no dangling planar-solver imports).

## 8. Visual gate — 3D swimming

- [x] 8.1 Load a rig, run coupled drive with **Drag OFF** in the 3D world: body undulates head→tail in place, COM does not translate, no out-of-plane tumble blow-up. ✓ (KE flat ~0.1, planar, COM stationary).
- [x] 8.2 **Drag ON**, record ≥ 3 s: snout-projected COM drift increases monotonically **head-first**, reproducing the planar swim in 3D. ✓ — clean coordinated traveling wave, drift 0→23 over 16s, monotonic.
- [x] 8.3 Confirm the body stays roughly in its start plane; decide on the out-of-plane handling and record it. ✓ — **soft post-step planar projection** (`planarProject`, gated by `planarConstraint`); with the motor-muscle fix the raw out-of-plane tilt is only 4–9° so the projection is a gentle cleanup. Decision recorded in roadmap §4.

## 9. Documentation

- [x] 9.1 Update `documentation/animation-roadmap.md` §4 with dated entries: Rapier world params, body/collider/joint construction, drag, the energy-pump root cause + motor-muscle fix, the swim-gate result, and the calibration + faithfulness ledger. Done.

## 10. OpenSpec validation

- [x] 10.1 `npx openspec validate replatform-body-rapier-3d --strict` passes.
