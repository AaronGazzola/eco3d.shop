## Why

The first attempt at Phase A of the salamander-CPG rebuild (`documentation/animation-roadmap.md` § 3) landed body-spec extraction, the planar multibody solver, force model, render wiring, and sidebar controls in a single commit. The combined change could not pass its own visual gate, because the render path silently dropped the body's root transform (the computed `rootX / rootZ / rootHeadingY` were written to a `rootRef` that no JSX `<group>` was bound to) and rendered leg groups as world-space siblings of the spine chain rather than children of their attached spine's pivot. Joint angles also clamped on render regardless of solver state, so a misbehaving solver looked identical to a well-behaved one.

The roadmap's Phase-A gate — "verify the passive chain behaves and respects joint limits" — therefore can't be checked against the screen. Re-landing Phase A as one commit has the same property. Splitting Phase A into A2 (FK renderer, no solver) → A3 (zero-force loop) → A4 (damping + limits) → A5 (re-wired capture) gives each step its own falsifiable visual gate.

This change (A2) installs the renderer half *first*, without any dynamics, so that the data path from "intended pose" to "screen" can be exercised and verified by hand before any solver is asked to drive it. A3 then turns the solver back on against a renderer we already trust.

## What Changes

- **Body-spec extraction reintroduced.** `app/game/locomotion/body.ts` SHALL return derived per-segment data (length from node-to-node distance, mass and inertia from each segment's mesh AABB, rest-pose node + COM positions in the XZ plane) and per-joint data (1-DOF yaw between adjacent chain segments, limits from `effectiveAngleCaps`). The output is a typed `BodySpec`. No dynamics code; no `SolverState`; no solver step. This makes A1 part of A2 — the spec only earns its keep once A2 consumes it.
- **Manual `PoseState` in `animateStore`.** The store SHALL carry `manualPose: { rootX: number; rootZ: number; rootYawRad: number; jointAnglesRad: Record<string, number> }` plus setters. The joint-angle map is keyed by segment groupId (the child segment of each joint); missing entries default to `0`. Pose SHALL reset to zeros when groups are loaded or reset.
- **`AnimatedModel` accepts and binds a `rootRef`.** `AnimateScene` SHALL pass a `useRef<THREE.Group | null>` to `AnimatedModel`; `AnimatedModel`'s top-level `<group>` SHALL bind that ref. `useLocomotion` SHALL write `manualPose.rootX/rootZ` to `root.position` and `manualPose.rootYawRad` (Y-axis) to `root.quaternion` each frame, replacing the current no-op fallback.
- **Legs reparented under their attached spine.** In `AnimatedModel`, leg groups (`leg-left` / `leg-right`) SHALL be rendered as children of the inner pivot group of the spine identified by `attachedToSpineId`, not as siblings of `ChainNode` at the model root. A leg whose `attachedToSpineId` does not resolve to a chain group SHALL render at the model root with a `console.error` so the misconfiguration is loud.
- **Joint-pose render path.** `useLocomotion` SHALL, when not in calibrate mode, write each chain joint's quaternion as `setFromAxisAngle(Y_AXIS, clampedAngle)`, where `clampedAngle` is `manualPose.jointAnglesRad[child.groupId]` clamped to `effectiveAngleCaps(child).yaw` (forward) and `-(effectiveAngleCaps(child).yawBack ?? yaw)` (backward). The existing rest-pose / Calibrate behavior SHALL be preserved when `animateTab === 'calibrate'`.
- **Manual sliders in the Simulate sidebar.** The Simulate tab SHALL expose three root sliders (x / z / yaw) and one yaw slider per chain joint (head excluded), each bound to the matching `manualPose` field via the store. Root sliders SHALL use a fixed ±5 world units for x/z and ±π for yaw. Joint sliders SHALL use a fixed ±π/2 (±90°) range — wider than every realistic cap so the user can deliberately drag past a cap to visually verify the render-side clamp. A **Reset pose** button SHALL zero all `manualPose` fields. No Run, Perturb, Record, or diagnostic readouts in this change.

## Capabilities

### New Capabilities
- `locomotion`: the salamander-CPG-faithful rebuild. A2 establishes the renderer half.

### Modified Capabilities
None.

## Impact

- **Added files:**
  - `app/game/locomotion/body.ts` — `buildBodySpec(groups, segments): BodySpec | null` plus the `BodySpec / PlanarSegment / PlanarJoint` types.
  - `openspec/changes/add-fk-renderer-phase-a2/` — this change.
- **Edited files:**
  - `app/admin/animate/animateStore.ts` — adds `manualPose` state + setters + reset.
  - `app/admin/animate/AnimateScene.tsx` — creates a `rootRef`, passes it to `AnimatedModel`.
  - `app/admin/animate/AnimateSidebar.tsx` — Simulate tab gains root + per-joint sliders + Reset pose.
  - `app/game/AnimatedModel.tsx` — top `<group>` binds `rootRef`; leg groups render under their attached spine's `ChainNode` inner pivot.
  - `app/game/locomotion/useLocomotion.ts` — non-calibrate branch writes manual pose to root + per-joint pivots.
- **Untouched:**
  - `app/game/locomotion/chain.ts` — already provides `buildSkeletonTree` / `flattenSkeleton` / `effectiveAngleCaps`.
  - `app/game/locomotion/legs.ts` — `findFrontHip / findRearHip / findLegsForHip` are not consumed by A2 (leg parenting goes by `attachedToSpineId` directly).
  - `app/game/locomotion/diagnostics.ts` and `app/api/diagnostics/route.ts` — latent until A3.
  - `app/admin/animate/CalibrateTab.tsx` — Calibrate behavior unchanged.
  - Supabase schema / `ModelConfigRow` — unchanged.
