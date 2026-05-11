## Why

The studio's Animate step (`app/studio/StepAnimate.tsx`) is a flat list of eight global sliders driving a dragon that animates in the viewport with no visual feedback layer. There is no way to see where the joints are, where the foot targets sit, or where the head is aimed — the panel exposes numbers against a black box, and tuning is guess-and-check.

The canonical animation design (`documentation/animation_design.md`) replaces this with a constraint-based procedural system whose iteration loop depends on two surfaces working together: a viewport that draws joints / anchors / targets over the dragon, and a panel split into **Intrinsic** (how the body relates to itself) and **Extrinsic** (how the body engages with the world) tabs. Every later slice (foot stepping rework, head behavior rework, per-node tuning, full-3D body, new constraint kinds, environmental reactivity) plugs into this shape — they add gizmos to an established overlay system and controls to established tab sections.

This change is the foundational slice. It does not add motion. It rebuilds the panel into the shape the rest of the roadmap needs, and adds the debug overlay that makes the current animation legible.

## What Changes

- **New debug overlay component** drawn over the existing translucent dragon in the Animate step's viewport. Reads from the live solver state already exposed by `useCreature`. Renders: a dot at every spine joint, lines between consecutive joints, a gizmo at each leg's hip anchor, a solid marker at each foot's `currentTarget`, a ghost marker at each foot's `desiredTarget`, and an arrow from the head to the head target. The overlay draws on top of the dragon; the dragon renders unchanged.
- **Panel rebuild** of `app/studio/StepAnimate.tsx`:
  - A row of overlay toggles at the top — one toggle per overlay kind (joints, bones, hips, foot targets, head-target arrow). State lives in `useStudioStore`.
  - Two tabs: **Intrinsic** and **Extrinsic**.
  - The **Intrinsic** tab holds the stiffness slider, plus a read-only summary of the skeleton's shape derived from the step 1 / step 2 data (joint count, total spine length, leg count). The summary is presentational only — there is no edit affordance.
  - The **Extrinsic** tab holds the remaining controls, split into a **Feet** subsection (foot angle offset, step threshold, step smoothing) and a **Head / Target** subsection (wander radius, wander speed, max speed, follow distance, show-attractor toggle, left-click hint).
- **No new sliders, no new mechanics, no motion changes.** The eight existing controls keep doing exactly what they do today; they just move.
- **No changes to step 1 (segment editor) or step 2 (node editor).** Those steps own the skeleton's shape and remain the only places that can edit it. The Animate panel reads that data and renders it as context, never edits it.
- **Non-goals:**
  - No foot-planting state machine, swing arc, or per-foot tuning (Slice 2 of the roadmap).
  - No head anticipation, arrival, idle drift, or gaze separation (Slice 3).
  - No per-node intrinsic sliders, no clickable joint dots, no node-detail card (Slice 4).
  - No Y-axis changes in the renderer (Slice 2 / Slice 5 territory).
  - No new constraint kinds (Slice 6).
  - No changes to `solver.ts`, `chain3d.ts`, `fabrik3d.ts`, `director.ts`, or any behavior file.
  - No changes to the renderer (`AnimatedModel.tsx`).
  - No database / Supabase changes.
  - No new dependencies.

## Capabilities

### Modified Capabilities

- `dragon-animation` — extended with the studio Animate panel's overlay + tab structure. The runtime animation system itself is unchanged; this change is purely the authoring surface that drives the existing config.

### New Capabilities

None. The work is entirely additive UX over the existing `dragon-animation` capability.

## Impact

- **New files** (estimated 2–3): a debug-overlay component under `app/studio/` (e.g. `AnimationDebugOverlay.tsx`), and one or two small panel-section components if `StepAnimate.tsx` grows past readability (e.g. `StepAnimate.intrinsic.tsx`, `StepAnimate.extrinsic.tsx`).
- **Edited files:**
  - `app/studio/StepAnimate.tsx` — rebuilt around the toggle row + tab shell.
  - `app/studio/page.stores.ts` — adds an `overlayToggles` state slice (booleans per overlay kind) and a setter. Persisted via the existing `partialize`.
  - `app/studio/page.types.ts` — adds an `OverlayToggles` type.
  - `app/studio/StudioScene.tsx` — mounts the new overlay component inside `AnimateContent`, passing the same solver refs that `AnimatedModel` already consumes. May require exposing `chainRef` / `limbStatesRef` from `useCreature` to the overlay; both are already returned, so the wiring is small.
- **Untouched:**
  - `app/game/animations/**` (solver, director, behaviors).
  - `app/game/chain3d.ts`, `app/game/fabrik3d.ts`, `app/game/useCreature.ts` body, `app/game/AnimatedModel.tsx`.
  - `app/studio/StepSegments*.tsx`, `app/studio/StepGroup.tsx`, `app/studio/NodeOverlay.tsx`, and any other step 1 / step 2 file.
  - The `AnimationConfig` type and its persisted values.
- **No external dependencies added.**
- **No database / Supabase changes.**
- **No breaking changes.** Existing tuned values in `useStudioStore.animationConfig` remain valid; controls move but their bindings, ranges, and effects are identical.
