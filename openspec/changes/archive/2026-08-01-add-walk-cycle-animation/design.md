# Walk-cycle animation — Design

## Context

The rig gives every dragon a node-skeleton: an axial chain (head → spines → tail) plus legs attached to spines at hip nodes, each joint carrying `AngleCaps` (`yaw`, `yawBack`, `pitchUp`, `pitchDown`, radians). `buildSkeletonTree`/`flattenSkeleton` (`app/game/skeleton.ts`) expose the chain; `StaticPosedModel` (`app/game/StaticDragon.tsx`) renders one merged mesh per group. Nothing animates yet. The old physics studio was deleted; this change re-uses only its frame and per-joint editor shape.

## Goals / Non-Goals

**Goals:**

- A kinematic animation runtime that poses the skeleton each frame with no physics solver.
- One authored, loopable `walk` cycle that reads as walking.
- A studio to view and author the walk cycle, structurally the same as the old animate page (collapsible sidebar).
- A layer boundary (per-joint angle map) that lets IK and physics be added later without reworking the core.

**Non-Goals:**

- No physics engine, no IK, no terrain adaptation, no world interaction (all deferred; the runtime is designed to accept them later).
- No other cycles (idle/eat/sleep) and no game/habitat state machine — deferred to E3.
- No root-locomotion pathfinding; the walk is authored in place (feet stride, body sway), with world translation left to the habitat layer later.
- No changes to the rig-authoring pipeline behavior or genetics.

## Decisions

- **Kinematic keyframe interpolation, not a physics engine.** Movement is per-joint rotations applied to the skeleton each frame via react-three-fiber `useFrame`. Rationale: cheap, deterministic, many-on-screen friendly, and the industry-standard base layer for ambient game creatures. Alternatives (Rapier/MuJoCo) were deleted in E1 for being a time sink and are unnecessary for contained, small-rendered habitats.
- **Pose = per-joint angle map + root offset; cycle = keyframes + params.** A `Pose` is `{ root: { x, z, yawRad }, joints: Record<groupId, { yawRad, pitchRad }> }` (reuses the old `manualPose` shape). A `Cycle` is `{ keyframes: Pose[], speed, amplitude }`. The runtime tweens between keyframes on a looping phase clock and returns the interpolated pose. This is the explicit **layer boundary**: `animation.ts` produces the joint angle map; an IK solver could later override leg/foot joints in that map before render, and physics could post-process — no core rework. Alternative (pure parametric sinusoids) rejected: harder to author expressive, readable motion by hand.
- **Angles are clamped to `effectiveAngleCaps` at evaluation.** Every returned yaw/pitch is clamped (`yaw`/`yawBack` for the two yaw directions, `pitchUp`/`pitchDown` for pitch), so an authored or interpolated pose can never exceed the rig's joint limits. The caps remain owned by the Calibrate step; animation only reads them.
- **`AnimatedDragon` mirrors `StaticPosedModel`'s structure.** It renders one `<group>` per body group with the same merged-mesh children, but wraps each joint in a pivot `<group>` (rotation set from the pose) positioned at the joint's node anchor (`nodeBack`/`nodeFront` for axial, `nodeHipLeft`/`nodeHipRight` for legs), walking `flattenSkeleton` for parent→child composition. `StaticPosedModel` stays as-is for non-animated contexts.
- **Storage: `animations` JSON column on `dragon_models`.** A map `{ [cycleName]: Cycle }`, authored per rig (variant × stage) because joint ids are per model. Mirrors the existing `role_tags` JSON column (no join, consistent pattern). The studio save writes only `animations` (never `groups`/`role_tags`); reads come through the existing rig load. Alternative (separate table) rejected for E1: more wiring, no payoff at one cycle.
- **Studio reuses the frame; Animate is stepper step 3.** `/admin/animate` = `AdminFrame` + `StudioCanvas` + a new `AnimateSidebar`, exactly the old composition. `SidebarShell` regains step 3 "Animate" (Pick → Group → Animate), enabled once groups exist. The scene renders `AnimatedDragon` from the shared store; a new `animateStore` holds view/playback/authoring state only (no SimConfig). The per-joint editor reuses the Calibrate accordion ordering (head → spine → attached legs → tail) with one cap-clamped slider per joint, writing the selected keyframe's pose.

## Risks / Trade-offs

- [Canned motion ignores terrain/interaction] → Accepted and intended for E1; the per-joint-angle-map boundary keeps IK/physics as additive layers on the same skeleton for later.
- [Hand-authoring a good walk is fiddly] → The studio gives live preview, per-joint sliders clamped to caps, and scrub; keyframe count stays small.
- [Determinism] → Playback phase derives from a time accumulator seeded outside the pure module; `animation.ts` uses no `Math.random`/`Date.now`, matching skeleton purity, so the same phase yields the same pose.
- [Legs are off-tree] → `AnimatedDragon` resolves legs via `attachedToSpineId` and pivots them at hip nodes, the same resolution the deleted renderer used; unresolved legs render at root with a `console.error`.

## Migration Plan

1. Add the `animations` column (nullable JSON, default `{}`) to `dragon_models` via a migration; regenerate `supabase/types.ts`. Purely additive — existing rows get `{}`.
2. Ship the runtime + studio behind the admin route; no data backfill needed.

## Open Questions

None blocking. Whether root translation eventually rides in the cycle or is owned entirely by the habitat layer is an E3 decision; for E1 the walk is authored in place.
