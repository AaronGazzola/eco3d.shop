# TEMP handover — 2026-05-24

## Where we landed today

Replaced the constraint-cascade locomotion system with a **central pattern generator (CPG)** model based on Thandiackal et al. 2020 (Frontiers in Neurorobotics). The studio rig, IK rendering, diagnostics infrastructure, scene infrastructure, and time-scale controls are unchanged. The cascade waterfall, leg-length projection, strain-triggered stepping, and head-as-direction-goal framing are gone.

OpenSpec change: `openspec/changes/replace-locomotion-with-cpg/` — validates strict.
Type check: clean.

## What does NOT work

The CPG ticks correctly in isolation, but the rendered result is broken in three known ways. Recording captured in conversation today. Symptoms: the creature spasms in place, head whipping side-to-side, no forward translation.

### 1. Chain root is at the wrong end → cumulative bend explodes

`spine-6` (the rearmost cascade member) is the world-fixed root. CPG axial yaws are applied as **per-pivot rotations through a fixed-root chain**, so each segment's ~0.4 rad output stacks into ~2.8 rad of total bend at the head end. The CPG was designed for *segment-local relative* bends between neighbours, not absolute rotations on a stacked chain.

**Fix direction**: either (a) interpret CPG output as a relative bend between neighbouring segments (so segment-i's yaw is yaw_i − yaw_{i+1}, not yaw_i absolute), or (b) anchor the chain mid-body and let rotations propagate symmetrically. Option (a) is cleaner and matches the biology — each *joint* bends within its cap, not each segment in world.

### 2. `steer` feedback loop → flips every frame

`computeDriveSteer` reads `headPivot.matrixWorld` for the head's world position and forward vector, then computes signedAngle from head-forward to attractor. Because the head is itself violently swinging from the body bend, head-forward flips sign every frame. Result: `steer` flips between −1 and +1 each frame in the recording. Body rocks left-right with the steer, head flips with the body, steer flips again — closed positive-feedback loop.

**Fix direction**: compute `steer` from a stable body reference, not the head pivot. Candidates: the spine-6 (root) world forward, the model's `modelRotation` plus chain root direction, or a low-pass-filtered head forward (EMA over ~200 ms).

### 3. Stride forward direction uses head-forward → feet replant in random directions

`readHeadFrame` produces the body-forward vector used for `next_planted = hip_socket + ... + stride_forward * body_forward`. Same problem as steer — the head is flailing, so each foot replant target points in a different direction. Feet step in place rather than forward.

**Fix direction**: same as steer — use a stable body forward. The spine-6 (root) forward is the natural choice and matches "the body wants to go forward in its own frame."

## What to do first

The three issues compound. Don't try to fix them simultaneously. Suggested order:

1. **Pin a stable body forward** — derive once per frame from spine-6's local forward direction (its `nodeFront → nodeBack` vector transformed by its world quaternion), use it for both `steer` calculation and stride placement. This alone should stop the feedback loop. Verify by recording — `steer` should be smooth, not flipping.
2. **Reinterpret CPG output as relative-between-neighbours.** Either compute `per-pivot relative yaw = axialYaws[i] − axialYaws[i+1]` at apply time, or change the rig such that each pivot is in its parent's frame and yaws are local. Verify by visual inspection — the spine should curve in a gentle S/standing-wave, not whip around.
3. **Then tune amplitude / phase bias / drive scaling** to match what a lizard actually does. Reference: `documentation/locomotion.md` §8 parameter table — values there are starting guesses, not tuned.

## Files

### New
- `app/game/locomotion/cpg.ts` — pure-function CPG core + topology builder + `computeDriveSteer` + `axialYawWithSteer`.
- `documentation/locomotion.md` — single source of truth for the locomotion design.
- `openspec/changes/replace-locomotion-with-cpg/` — full change proposal, design, tasks, spec.

### Deleted
- `app/game/locomotion/cascade.ts`
- `documentation/animation_design.md`
- `documentation/animation_references.md`

### Modified
- `app/game/locomotion/useLocomotion.ts` — rewrote useFrame around CPG tick. Playback path applies snapshot pivot quaternions + foot positions directly. Calibration tab unchanged.
- `app/game/locomotion/foot.ts` — phase-driven stance/swing, no strain.
- `app/game/locomotion/diagnostics.ts` — `FrameSnapshot` now exposes `drive`, `steer`, `axialOscillators[]`, `limbOscillators[]`.
- `app/admin/animate/animateStore.ts` — removed `overlays` state.
- `app/admin/animate/AnimateScene.tsx` — removed strain-line + wanted-cascade-ghost overlays.
- `app/admin/animate/AnimateSidebar.tsx` — replaced cascade table + strain rows with drive/steer readout + oscillators tables.

## Where the bugs probably live

- **Cumulative bend**: `app/game/locomotion/useLocomotion.ts` around the "for (const sg of skeletonGroups)" loop where `targetQuat.current.setFromAxisAngle(Y_AXIS, finalYaw)` writes the per-pivot quaternion. `finalYaw` is the absolute axial output from CPG. If we want relative-between-neighbours, the math goes here.
- **Steer feedback**: `readHeadFrame` and the `computeDriveSteer` call site in `useLocomotion.ts`. Fix is to read from `spine-6` pivot (or chain root) instead.
- **Stride forward**: same `readHeadFrame` result used for `bodyForwardX/Z`. Fix is co-located.

## Diagnostic tools that work

- Time-scale slider (sidebar) — 0.1x lets you see what's happening at human pace.
- Recording + Copy recording → paste into chat. The recording shape is now `drive`, `steer`, `axialOscillators[]`, `limbOscillators[]`, `pivots[]`. Per-frame snapshots fire every render frame regardless of recording state, so `getLastSnapshot()` is always fresh.
- Playback scrubber — works, plays back from recorded snapshots.

## Status of the OpenSpec change

`replace-locomotion-with-cpg` is in flight. Code tasks 1–7 done; task 8 (browser verification) failed; task 9 (final validation) passed. **Do not archive the change** — the verification failed and the design needs the three fixes above before it ships.

Suggested next step: add a follow-up section to `tasks.md` under §8 capturing the three known bugs and the fix order, then re-run §8 after applying fix 1.
