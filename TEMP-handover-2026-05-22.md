# TEMP Handover — 2026-05-22 — Step 6 partial, world-anchored foot refactor needed

This file exists to bootstrap a fresh chat conversation. Delete it once the next session has picked up.

## TL;DR

Step 6 (rear hip + back legs) is **mechanically complete and visually attached**, but a deeper architectural gap surfaced during verification: **foot state is in the hip's local frame, not in world**. For small attractor moves it works. For large turns the body bends-and-slides through world instead of stepping.

Next move: world-anchored foot refactor. Do not start it without re-reading `documentation/animation_design.md` Current Status section first — the design's "feet planted in world" invariant is what the refactor enforces.

## Where the code is

Branch: `main`. All commits pushed (well, the first two were; check `git log origin/main..HEAD` to see if `c82f6eb` made it up — if not, push it).

Recent commits, newest first:

```
c82f6eb fix(animation): front legs follow body when rear hip rotates
334a8bc feature(animation): step 6 — rear hip + back legs (WIP)
88efb97 spec(animation): openspec for step 6 — rear hip + back legs
1cbdd1f refactor(admin): split studio into /admin/pick, /admin/group, /admin/animate
d9e103c feature(animation): step 5 verified — front legs swing on hip
```

OpenSpec change for this slice: `openspec/changes/add-rear-hip-back-legs/`. Tasks 1–9 + 12 marked done in `tasks.md`. Sections 10 (browser verification) and 11 (doc update) remain. Doc update for Step 6 itself happened in this handover commit; the openspec tasks.md hasn't been re-ticked because the user-visible verification (10.5 diagonal couplet) cannot pass until the world-anchored refactor lands.

## What the user is seeing

Recording from the last conversation: `c82f6eb` builds, types pass, legs render attached. Small attractor moves work. Large turns produce:

- Head reaches its desired yaw (correct).
- Spine joints between the two hips (spine-3, spine-4, spine-5) bend to fill the leftover cascade demand.
- Front hip's *world* position translates significantly (recorded: spine-2 worldPos.z went from -0.03 → +2.99 across one turn).
- Front feet stay frozen at their last-replanted *local-frame* positions; strain calculation (in local frame) doesn't see the world translation, so no step fires.
- Visually: body bends-and-slides through world, feet shuffle along carried by the front hip's local frame.
- Rear hip never engages — the mid-spine joints consume all the leftover cascade demand greedily before it reaches the rear hip slot.

The user pasted a 50-frame recording. The decisive datapoints:

| Frame | desiredHeadYaw | cascadeOut | spine-2 worldPos.z | front-foot strain |
|-------|---------------|------------|---------------------|-------------------|
| 1 | 0.09 | [0.09, 0, 0, 0, 0, 0, 0] | -0.05 | 0 |
| 22 | 1.65 | [0.30, 0.36, 0.39, 0.59, 0, 0, 0] | 0.40 | 0.058 |
| 50 | 2.86 | [0.30, 0.36, 0.39, 0.64, 0.68, 0.48, 0] | 2.99 | 0.058 |

Strain barely moves while the world position of the front hip drifts 3 units. That's the bug: strain is local-frame-only.

## The architectural gap, in one paragraph

Per `documentation/animation_design.md` § 2 "The constraint set" — "A foot in the *planted* state is pinned to its current world position." Per § 2 "How motion happens" item 3 — "Rotate further spine joints. More expensive as the cascade moves down the body, because each rotation displaces hip nodes and strains planted feet." The current `FootState` stores `plantedX/Z` in the owning hip's local model-space frame and treats those numbers as world coords. `computeStrain` measures distance using `wantedYaw = cascadeOut[hipIdx]` — the hip's own *local* cascade slot only, not the cumulative parent rotation. In Step 5 this worked because the front hip was the deepest cascade member and had no rotating tree-parents. In Step 6 the front hip has rotating parents (spine-3..6), so its world position diverges from its model position, but the strain calculation can't see it. The bridge from "spine bends" → "feet strain" → "step" is broken in the world-translation direction.

## The fix shape (do not implement without re-reading the doc)

1. **Foot state in true world coordinates.** `FootState.plantedX/Z/swing*X/Z` become world. `restOffsetX/Z` and `restY` stay as hip-local config.
2. **`ensureHipInit`** plants each foot at `hipPivot.parent.matrixWorld.transformPoint(modelFoot - hipBack)` — the foot's world position derived through all parent rotations at init time. For Step 5 (no rotating parents) this equals model-space, so no regression.
3. **`computeStrain`** in world frame: compute model-space `footTargetAt(localYaw)`, then `parent.matrixWorld.transformPoint(target - hipBack)` to get world target, then world distance to `plantedX/Z`.
4. **Step trigger**: when strain exceeds threshold, `swingFrom = current world planted`, `swingTarget = world transform of model-space footTargetAt(wantedLocalYaw)`. On replant, `plantedX/Z = swingTarget` in world.
5. **`applyLegBone`** simplifies: `fNow` becomes just `(foot.plantedX, foot.restY, foot.plantedZ)` directly (no parent transform needed; foot is already world).
6. **Marker write** simplifies similarly: marker world position = foot world position directly.

Once world-anchored, mid-spine rotations create real strain, feet step, the front-hip "consumed cap" doesn't translate the body unrestricted, and the rear hip starts seeing cascade demand because spine-3..5 can no longer fill greedily without consequence.

## What might break / what to watch for

- **Diagonal couplet** is the design-stated outcome (front-left + back-right tending to step together). It can't be tested until world-anchoring is in. After the refactor, retest by clicking the attractor in a circle around the dragon.
- **Step 5 regression check**: with the front hip alone in the cascade (single-hip rig), the new code should behave identically to current code, because the parent matrix reduces to identity-with-translation that cancels out. Verify by running a single-hip test rig.
- **Tuning surface widens**: with strain now responsive to mid-spine rotations, `STRAIN_THRESHOLD` may need re-tuning. Steps may fire much more frequently. The spine-3..5 angle caps may need tightening if the body bends too far before a step relieves the strain.
- **`FrameSnapshot`** restructured this slice — diagnostics is broken for any saved Step 5 recordings (no migration; it's an in-memory ring buffer).
- **The user explicitly corrected** that legs are single-bone — never propose multi-bone IK or knee nodes. Saved as feedback memory `feedback-animation-rigid-bones`.

## Files touched this slice

- `app/game/locomotion/chain.ts` — `buildCascadeChain` extended to second hip
- `app/game/locomotion/legs.ts` — `findRearHip` added
- `app/game/locomotion/diagnostics.ts` — `HipSnapshot` type, `FrameSnapshot` restructured
- `app/game/locomotion/useLocomotion.ts` — `HipRuntime`, `runHipStep`, `applyHipLegs`, world-aware `applyLegBone`
- `app/game/AnimatedModel.tsx` — four foot markers, `FootMarkerRefs` shape change
- `documentation/animation_design.md` — Current Status updated
- `openspec/changes/add-rear-hip-back-legs/` — full openspec change

## Pointers for the next session

1. Read `documentation/animation_design.md` § 1 (invariants), § 2 (constraint set + cost ordering), and Current Status. The five invariants are non-negotiable; the cost ordering is the design intent the world-anchored refactor is trying to realize.
2. Read the "Open issue" bullet in Current Status. That's the gap to fix.
3. Read `app/game/locomotion/foot.ts` and `app/game/locomotion/useLocomotion.ts` — particularly `runHipStep` and `applyLegBone` — to see where world-vs-local lives today.
4. Decide whether to write a new openspec change (`world-anchored-feet` or similar) or extend `add-rear-hip-back-legs` with a delta spec.
5. The user prefers to understand before fixing. Walk through the recorded data with them if they're unsure.

## How to delete this file when done

```
rm TEMP-handover-2026-05-22.md
git add -A && git commit -m "chore: remove temp handover"
```
