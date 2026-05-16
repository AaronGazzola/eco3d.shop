# Handover — Foot-Anchored Locomotion, Incremental Build

**For:** the next AI agent picking up this conversation in a new chat.
**Date:** 2026-05-16.
**Status:** mid-build. Most recent commit landed the swing arc + per-foot phasing + leg pitch delta. User feedback: "looks shit." Implementation continues with more incremental refinement.

## Read first, in order

1. **`README.md`** — project overview, points at canonical docs.
2. **`documentation/animation_design.md`** — the design doctrine and Slice 1 roadmap. Especially §§ 1, 2, 4, 6 (Slice 1), 11.
3. **`documentation/skeleton_to_model_mapping.md`** — renderer↔skeleton contract.
4. **`openspec/changes/invert-locomotion-foot-anchored/`** — the canonical OpenSpec change. Implementation is mostly done per the spec, but the user is rebuilding it step-by-step in a smaller, more verifiable order.

## What the user wants

- **Foot-anchored locomotion** (Trifox-style). Feet plant in world; hips derive from foot midpoints; body translation is a consequence of feet stepping. Explicitly NOT head-driven.
- **Adaptive to any rig.** Variable spine joint count, variable hip positions, variable leg geometry. Every dimension derived from studio nodes; nothing hardcoded.
- **Incremental.** They explicitly want each step to be visible, small, and verifiable in the browser before adding the next. They will reject big multi-mechanism steps. They have already pushed back twice on me proposing too-large or off-direction next steps.

## Critical user-explicit preferences

- No attractor wandering. **Click on the floor sets `targetRef` directly.** TargetController was removed from `AnimateContent`.
- No rotation as a next step — they pushed back, correctly, because rotating the rigid body keeps the head-driven mindset. **Feet drive body, period.**
- Sidebar: **only the Model Opacity slider.** All other panel UI was stripped. Don't add panel UI back without asking.
- Overlay: **only the node skeleton** (joints, bones, hip anchors, foot markers). All other gizmos (head-target arrow, intent marker, step rings, swing arcs, hip-derivation lines) were stripped from `AnimationDebugOverlay.tsx`.
- They will pushback hard if you reinvent the wheel. **Check `animation_design.md` § 11 references (Trifox especially) before proposing anything new.**

## Where the conversation has been

1. **Built the full OpenSpec change `invert-locomotion-foot-anchored`** with proposal/design/tasks/spec deltas. Validates clean. Implementation done at the file level (tsc passes), browser verification pending.
2. **First browser run looked "garbled."** All segments bunched at origin. Reason: solver was over-constraining the rest pose with rotation logic that wasn't right.
3. **Stripped back to a static baseline** — solver `apply()` became a no-op; sidebar reduced to Model Opacity; overlay reduced to spine joints + bones + hips + foot markers. User confirmed the rest pose looks like the studio's node-placement view.
4. **Pitch double-counting bug:** the renderer's leg pitch was double-counting the rest hip-foot Y difference. Removed pitch entirely for static rest pose. (Has since been added back as a *delta* from rest, see below.)
5. **`restFootOffset` rotation bug:** initial solver rotated `restFootOffset` by `initialHeading`. Since `restFootOffset` is in model space which equals world space at rest, the rotation was wrong and the legs rendered inward. Fixed by using `restFootOffset` directly without rotation.
6. **Step 1 (rigid translation toward click):** added simple `Solver.apply()` that translates every joint and limb position toward `targetRef`. Worked: dragon slides toward click.
7. **User questioned next step:** I'd proposed body-rotation. They pushed back — correctly — saying that's head-driven. We checked the docs and confirmed: per `animation_design.md` § 6, the next canonical step is intent + foot stepping + hip derivation.
8. **Step 2 (intent + foot stepping + hip derivation):** replaced rigid translation with the canonical foot-driven loop. Intent moves toward click; feet teleport to references when drift > stepThreshold; hips derived from foot midpoints; non-hip chain joints rigid-drag with avg hip delta. **Result:** still looked rigid because all 4 feet drift in lockstep and pop together. User confirmed the rigidity.
9. **Step 3 (swing arc + per-foot phase + leg pitch delta):** added the swing state machine with parabolic Y lift, per-foot phase offsets baked into `restOffsetFromIntent` to break symmetry, and a pitch delta in `AnimatedModel.tsx`'s leg rotation so the leg mesh visibly follows the foot up. **User feedback: "looks shit."** Browser verification of this step is what they want to continue debugging next.

## Current code state

### `app/game/animations/solver.ts`

Constructor sets up:
- Chain seeded from `initialJoints` (studio-derived spine joint positions).
- Intent state (`{position, heading, velocity}`) seeded at the head joint position.
- Per-leg `LimbState` with hip anchor computed via `hipOffset` + parent-rotation math (matches studio rest pose), plus `plantPos` set to `anchor + restFootOffset` (rest world position), plus `restOffsetFromIntent` = `plantPos - intent.position` **plus a per-foot phase offset** (4-element pattern, scaled by 0.4 × stepThreshold).

`apply(drive, dt)`:
1. Intent translates toward `drive.headTarget` at `maxSpeed`.
2. Per-foot state machine: planted → swinging when drift > stepThreshold; swing interpolates over `swingDuration` with parabolic Y lift = `liftHeight × 4t(1-t)`.
3. Hips repositioned from foot midpoints using `currentTarget` (NOT `plantPos`) so the midpoint glides during swings.
4. Non-hip chain joints translate by the average hip delta (rigid drag).
5. Limb anchors translate by their own hip's delta.

**No spine FABRIK yet. No head gaze.** Both are future steps per `animation_design.md` § 6 Slice 1 steps 4 + 5.

### `app/game/AnimatedModel.tsx`

Renderer reads `joint.y` and `anchor.y` (no longer hardcoded `0`). Leg rotation uses Euler order `YXZ` with:
- Yaw: `legRestAngles[limbIdx] - worldAngle` (XZ direction from anchor to foot).
- Pitch: `currentPitch - legRestPitches[limbIdx]` (delta from rest pose's hip-foot Y angle).

`legRestPitches` is precomputed from studio nodes: `atan2(dy, planar)` between nodeHip and nodeFoot.

### `app/studio/AnimationDebugOverlay.tsx`

Stripped to spine joints, bones, hip anchors (pink), foot markers (green). No toggles, no other gizmos. Always renders all four.

### `app/studio/StepAnimate.tsx`

Stripped to a single `ModelOpacityRow`. No tabs, no sliders, no overlay toggles. The store's `OverlayToggles` field still exists (unused by the panel) — fine for now.

### `app/studio/StudioScene.tsx`

`AnimateContent` no longer mounts `TargetController`. The click handler writes directly to `targetRef`. `userTargetGoalRef` removed. `intentRef` no longer threaded through.

### `app/page.constants.ts`

`CREATURE_DEFAULTS.lizard` has all the new fields: `arrivalRadius: 3.0`, `intentDamping: 0.85`, `idleDriftAmplitude: 0`, `idleDriftFrequency: 0.4`, `swingDuration: 0.25`, `liftHeight: 0.35`, `predictionGain: 0.15`, `bodyHeight: 0.6`, `groundY: 0`, `hipJointFrontIndex: 3`, `hipJointBackIndex: 12`.

The `useStudioStore`'s `ANIMATION_DEFAULTS` mirrors these.

## What "looks shit" probably means

User's full feedback for the latest step was: "looks shit but let's continue it later." No specifics. Likely candidates the next agent should investigate:

1. **Phase pattern is arbitrary.** The 4-element phase offset I baked in (`[(0,0), (1,0), (0,1), (-0.5,-0.5)]` scaled) is a guess at producing an emergent gait. It probably doesn't produce a trot or any recognizable pattern; it might produce odd asymmetry that looks unnatural. Worth trying alternatives — particularly trot pairing (FL+BR get one phase, FR+BL get another).
2. **`stepThreshold` is large (1.5).** Feet take a long time to drift before stepping, so steps look infrequent and chunky. Try smaller threshold (e.g., 0.5–0.8).
3. **`swingDuration` (0.25s) vs `maxSpeed` (3.0).** Body can outrun the feet — a foot is mid-swing while intent has already moved far. The swing's target was computed at trigger time and is now stale. Worth tuning, or worth adding prediction (`swingTo += intent.velocity × predictionGain`) which the design doc calls for but isn't implemented yet.
4. **Hip Y is fixed at `groundY + bodyHeight`.** The body doesn't bob vertically as feet step. Real walking has Y bob. Possibly worth adding (Trifox uses avg foot Y for body bob).
5. **No spine bending.** The spine drags as a rigid block. Visually wooden between the head and tail because there's no FABRIK between hips. This is the next planned step (#4 in `animation_design.md` § 6 Slice 1).
6. **Leg pitch delta** may have sign/axis issues. Worth checking that legs visibly tilt UP when foot lifts (not DOWN). With YXZ Euler order and the pitch sign I used, it should be correct, but easy to invert if needed.

The most likely productive next step is **adding the spine FABRIK between hips** — that's what the design doc says comes next, and it'd remove the wooden rigid-drag appearance even before tuning the gait further.

## Next planned step (per design doc)

**Spine FABRIK between hips.** From `animation_design.md` § 6 Slice 1:

> Spine resolves in three sections.
> - Mid-spine (between the front and rear hip joints): dual-anchor FABRIK — forward pass from the front hip, backward pass from the rear hip, iterate until distance and angle constraints converge.
> - Head section (front hip outward to joint 0): one-anchored FABRIK with the head joint biased toward the attractor within its own angle constraint. The head joint gazes — it rotates locally, not by translating.
> - Tail section (rear hip outward to the last joint): one-anchored Chain3D with no target — distance + angle constraints alone, naturally trailing.

`Chain3D` already has `resolveDualAnchor`, `resolveHeadSection`, and `resolveTailSection` methods (added during the OpenSpec implementation). They just aren't being called from the solver right now. The solver currently does rigid drag on non-hip joints instead.

To enable, replace the rigid-drag block in `Solver.apply()` (the loop that adds `avgDx`/`avgDz` to each non-hip joint) with calls to the three section solvers. Use `drive.headTarget` as the attractor for the head section. Tail section takes no target.

## OpenSpec change status

`openspec/changes/invert-locomotion-foot-anchored/` is in a weird state:
- `tasks.md` has most boxes ticked because the original full implementation passed tsc. But the implementation was then partially reverted/simplified, so some "completed" tasks don't actually reflect the running code.
- `proposal.md`, `design.md`, `specs/dragon-animation/spec.md` describe the full Slice 1 (all 5 mechanisms) — that's still the target, just being built incrementally instead of in one commit.
- `openspec validate invert-locomotion-foot-anchored --strict` should still pass.

**Don't archive this change yet.** The implementation isn't matching the spec — the spec describes the full Slice 1 (intent + feet + hips + three-section spine + leg IK), the code currently does the first three plus rigid drag.

## File map (recently modified)

- `app/studio/page.types.ts` — `AnimationConfig` has new fields, old ones removed (`limbAngleOffset`, `stepSmoothing`, `followDistance`); `OverlayToggles` has 5 new keys that are currently unused.
- `app/studio/page.stores.ts` — defaults, persistence migration v2 (drops obsolete keys, renames `followDistance → arrivalRadius`), `modelOpacity` field added.
- `app/page.types.ts` — `CreatureConfig` has new fields including `hipJointFrontIndex`, `hipJointBackIndex`.
- `app/page.constants.ts` — `CREATURE_DEFAULTS.lizard` with all new field defaults.
- `app/game/chain3d.ts` — `resolveDualAnchor`, `resolveHeadSection`, `resolveTailSection` methods added. Original `resolve` preserved.
- `app/game/animations/solver.ts` — full rewrite (then simplified). Currently implements intent + foot stepping + hip derivation + rigid drag. Spine FABRIK methods are NOT called.
- `app/game/animations/types.ts` — unchanged.
- `app/game/animations/dragon/wandering.ts` — unchanged (still writes `drive.headTarget = targetRef.current`).
- `app/game/useCreature.ts` — exposes `intentRef`; structural dep array includes hip indices.
- `app/game/AnimatedModel.tsx` — renderer reads joint.y/anchor.y; leg uses YXZ Euler with pitch delta from rest.
- `app/game/modelConfigToCreatureConfig.ts` — derives `hipJointFrontIndex` / `hipJointBackIndex` from limbNodes; per-leg `restFootOffset` from studio nodes.
- `app/studio/StepAnimate.tsx` — single Model Opacity slider. Nothing else.
- `app/studio/AnimationDebugOverlay.tsx` — minimal: joints, bones, hips, foot markers. No toggles.
- `app/studio/StudioScene.tsx` — no TargetController, click writes to targetRef directly.

## Tone / collaboration notes

- The user is technically literate but not a graphics expert. They want plain-language explanations, not jargon.
- They have low tolerance for big changes or vague proposals. **Always describe the exact next step in plain language before implementing it. Wait for their go-ahead.**
- They will reject things that "reinvent the wheel" — always check the canonical docs and Trifox before proposing novel mechanisms.
- They will reject explanations that don't connect back to the design doctrine. When proposing a step, explicitly reference where it sits in `animation_design.md` § 6 Slice 1.
- They want incremental builds where each step is visible. Don't bundle multiple mechanisms into one step unless they explicitly approve.
