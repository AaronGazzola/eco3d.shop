# Node Skeleton → 3D Model Mapping

How the studio's node skeleton drives the runtime 3D model, and how to author new animations that work for any dragon.

## TL;DR

**The animation is fully isolated to the node skeleton.** You can change how the nodes move and trust that any dragon set up in the studio will follow — provided your animation respects a small contract.

The renderer reads only three things from the simulation each frame:

1. `chain.joints[i]` — world (x, z) of each spine joint
2. `limb.anchor` (per leg) — world (x, z) of the hip
3. `limb.currentTarget` (per leg) — world (x, z) of where the foot should point

Whatever code writes into those three buckets *is* the animation. Replace `useCreature` with keyframes, recorded paths, sine waves, scripted poses — anything — and the model will follow with zero renderer changes.

## Studio: placing the node skeleton

Each piece of the dragon mesh is grouped into a **BodyGroup** with a `type`: `head`, `spine`, `tail`, `leg-left`, or `leg-right`. The skeleton is a small set of 2D anchor points (`{x, z}`, y is always 0) placed onto each group:

- Spine-chain groups (head, spines, tail) get a `nodeFront` and `nodeBack` — the two endpoints of that group's "bone."
- Spine groups with legs attached also get `nodeHipLeft` / `nodeHipRight`.
- Each leg gets a `nodeFoot`.

These are deliberately **shared** between groups so adjacent bones share endpoints:

- `chain[i].nodeBack` *is* `chain[i+1].nodeFront`. The back is the canonical owner; only `chain[0]` owns its own `nodeFront`.
- `spine.nodeHipLeft/Right` *is* the leg's hip.
- The leg owns its own `nodeFoot`.

The saved skeleton is just a list of (x, z) points placed in the model's local mesh coordinates, persisted on `ModelConfigRow.groups`.

## Conversion: nodes → simulation parameters

`app/game/modelConfigToCreatureConfig.ts` is the bridge. It converts static node positions into runtime parameters that drive the chain simulation:

- **`segmentLengths[i]`** = distance from `chain[i].nodeFront` to `chain[i].nodeBack`. The simulated bone lengths are read directly off the model.
- For each leg:
  - **`hipOffset`** = `hipNode − parentLocalOrigin` (vector from parent spine joint to hip, in the parent's local frame)
  - **`limbReach`** = spineCentroid → foot distance
  - **`limbSegmentLength`** = (hip → foot) / 2
  - **`bodyHalfWidth`** = spineCentroid → hip distance
  - **`parentRestAngle`** = direction the bone points in the model's natural pose

Nothing about the mesh shape is sent to the simulation — only those derived distances and angles. This is why the skeleton is fully separable from the geometry.

## Runtime: skeleton math

`useCreature` (`app/game/useCreature.ts`) constructs a `Chain3D` with `segmentCount` joints linked by the bone lengths derived above. Each frame, the animator updates joint world positions and limb anchors/targets according to the foot-anchored procedural model documented in `animation_design.md` § 6 (Slice 1). At a high level:

1. **Intent** steers toward `targetRef.current` (the attractor), producing the body's desired position, heading, and velocity.
2. **Per-foot state machines** advance — each foot either holds its plant point or interpolates along a swing arc toward a new plant point, depending on its drift from its desired position relative to intent.
3. **Hip joints** in the spine are positioned from the midpoints of their respective feet, lifted by `bodyHeight`. The hip joint position *is* the corresponding `limb.anchor`.
4. **Spine** resolves in three sections: dual-anchor FABRIK between the two hip joints (mid-spine), one-anchored FABRIK from the front hip outward with the head joint biased to gaze at the attractor (head section), one-anchored chain resolve trailing off the rear hip (tail section). Every joint respects `segmentLengths[i]` and the per-joint `angleConstraint`.
5. **Leg FABRIK** resolves each 3-joint leg between `limb.anchor` and `limb.currentTarget`.

The renderer downstream reads `chain.joints[i]`, `limb.anchor`, and `limb.currentTarget` — nothing else.

## Rendering: model locked to skeleton

In `app/game/AnimatedModel.tsx` the `useFrame` (lines 318–345) sets each BodyGroup's transform from the simulation. Two cases.

**Spine-chain groups** (head, spines, tail):

```
joint0 = chain.joints[segIdx]
joint1 = chain.joints[segIdx + 1]
boneAngle = atan2(joint1.z − joint0.z, joint1.x − joint0.x)
group.position = (joint0.x, 0, joint0.z)
group.rotation.y = restAngles[segIdx] + π − boneAngle
```

The mesh inside that group has its vertices pre-shifted by `(-nodeFront.x, -nodeFront.z)` (in `SegmentMesh`, lines 188–192). That puts the model's `nodeFront` at the group's local origin. So when the group is planted at `joint0`, the model's `nodeFront` lands on `joint0`. The rotation term aligns the mesh's `nodeFront → nodeBack` axis with the chain's `joint0 → joint1` axis.

The line drawn between studio's `nodeFront` and `nodeBack` is laid exactly on top of the chain's bone segment, every frame. No slop, no offset, no blending.

**Leg groups** (lines 333–343):

```
group.position = (limb.anchor.x, 0, limb.anchor.z)
worldAngle = atan2(currentTarget − anchor)
group.rotation.y = legRestAngles[limbIdx] − worldAngle
```

The mesh is pre-shifted so the *hip node* sits at the group's local origin. The leg's resting `nodeHip → nodeFoot` direction is `legRestAngles`. Once we plant the group at the hip and rotate by the difference, the leg mesh always points from the hip toward the current foot target.

## Rules your animation must follow

If you respect these rules, any dragon you set up in the studio will animate identically:

### 1. Keep bone lengths constant

Distance between consecutive `joints[i]` and `joints[i+1]` should equal `segmentLengths[i]`. The model is rigid — it won't stretch or compress to fit. If you violate this, joint0 is placed correctly but the model's geometry will overshoot or undershoot joint1.

`Chain3D.resolve()` enforces this for free. Any replacement animator should preserve it. The cleanest pattern: keep `Chain3D.resolve()` and only replace the part that picks where the chain *head* goes.

### 2. Treat limb anchor/target as direction signals only

The leg mesh rotates to point from `anchor` toward `currentTarget`, but the *distance* between them is irrelevant to the visual (the leg renders as a rigid piece its natural length). Don't expect a leg to "reach" or "extend" by moving the target farther.

### 3. Stay in (x, z)

The renderer ignores joint y. Vertical detail comes from the mesh geometry only.

### 4. One BodyGroup = one rigid bone

Whatever mesh segments you grouped together in studio rotate as a block. The animation granularity is the studio grouping. To get a bend mid-part, split it into two groups in studio with a shared node between them.

## Why it works for any dragon

The renderer's `restAngles + π − boneAngle` math is derived per-model from that model's studio node placement. It's not hardcoded to a body orientation. A dragon facing east with a long tail and a dragon facing north with a stubby tail both work — as long as their studio nodes are placed correctly.

The simulation parameters that drive the math (`segmentLengths`, `hipOffset`, `bodyHalfWidth`, `limbReach`, `parentRestAngle`) are all derived per-model. When you swap dragons, the simulation auto-tunes its bone lengths and limb geometry to that dragon. Your animation logic doesn't need to know which dragon is loaded.

## What `useCreature` provides

If a new animator bypasses `useCreature` entirely, it has to reproduce these or accept their absence:

- **Rigid bone lengths** via `chain.resolve()` and `chain.resolveDualAnchor()` (rule #1 above).
- **Hips anchored to the body** — hip joint positions derived from planted feet plus `bodyHeight`.
- **Per-foot plant/swing state machine** — discrete step-then-arc foot motion, world-anchored plant points.
- **Three-section spine solve** — dual-anchor for the mid-spine, one-anchored for head and tail sections.

For most extensions, the cleanest path is to add behavior inside the existing pipeline (intent steering, foot rules, constraint kinds) rather than replacing the pipeline.

## Bottom line

Model rendering is a pure function of `(joints, limb anchors, limb targets)` plus per-model studio data. You can swap the animation source freely, and as long as you respect bone lengths (easily achieved by reusing `Chain3D.resolve()`) and stay in (x, z), every dragon mapped to nodes in the studio will animate identically without any model-side adjustment.

## File map

- `app/studio/NodeOverlay.tsx` — places and edits node positions in studio
- `app/studio/page.types.ts` — `BodyGroup`, `NodeType`, `ModelConfigRow` definitions
- `app/game/modelConfigToCreatureConfig.ts` — converts saved nodes into simulation parameters
- `app/game/chain3d.ts` — `Chain3D.resolve()` (one-anchored) and `Chain3D.resolveDualAnchor()` (two-anchored) spine solvers
- `app/game/fabrik3d.ts` — leg IK (3-joint resolve)
- `app/game/useCreature.ts` — animation source: intent → feet → hips → spine → legs pipeline
- `app/game/AnimatedModel.tsx` — renderer; locks each BodyGroup to a joint pair (spine) or anchor/target pair (leg)
