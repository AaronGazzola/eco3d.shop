# Handover — Animation panel foundation (Slice 0 of the roadmap)

**Audience:** Aaron + the next Claude Code agent picking this up cold.
**Date:** 2026-05-12.
**Status:** Implementation complete, type-check clean, **browser verification pending**.

> **Update (2026-05-16):** Slice 0 (this handover) still applies as written — the panel-foundation work is unchanged. **Slices 1 and beyond have been redefined.** What used to be "Slice 1 — Foot stepping rework" and "Slice 2 — Attractor + head behavior rework" are now folded into a single foundational inversion: **Slice 1 — Invert the locomotion model (foot-anchored body)**. The new Slice 1 introduces an `intent` state, per-foot world-anchored plant points, hip joints derived from feet, dual-anchor FABRIK for the mid-spine, and gaze-only head joint behavior. See `documentation/animation_design.md` § 7 for the rewritten roadmap and `openspec/changes/invert-locomotion-foot-anchored/` for the OpenSpec change implementing it.

## TL;DR

A foundational rebuild of the studio Animate step (`/studio` step 3) landed. The dragon animates identically to before, but the viewport now draws a toggleable debug overlay (joints / bones / hips / foot targets / head-target arrow) over the translucent dragon, and the panel was restructured into an `Intrinsic` / `Extrinsic` tab pair with the existing controls relocated under the right tab. Two pre-existing perf bugs (solver rebuild storm on every slider tick, plus whole-store subscriptions in the scene components) were fixed as part of the same slice.

This is the **prerequisite slice** the canonical animation design (`documentation/animation_design.md`) calls out before any motion work can land. Every later slice (foot stepping, head behavior, per-node tuning, etc.) plugs into the overlay system and tab shell this slice put in place.

## Read these first, in this order

1. `documentation/animation_design.md` — canonical design doc for the constraint-based procedural animation system and its authoring interface. Defines the slice roadmap (§ 7) and the panel's Intrinsic/Extrinsic split (§ 5).
2. `documentation/skeleton_to_model_mapping.md` — the renderer ↔ skeleton contract. The overlay reads the same refs the renderer reads; understanding this is one paragraph and saves confusion.
3. `documentation/handover_studio_animate_step.md` — engineering history of how step 3 was originally wired in, plus the perf-investigation notes that this slice acted on (Suspect 2 is now fully fixed; Suspect 3 — per-segment materials — still pending).
4. `openspec/changes/rebuild-animation-panel-foundation/` — the OpenSpec change for this slice. `proposal.md` for what + why, `design.md` for the decisions, `tasks.md` for the checklist (with browser verification still unchecked), `specs/dragon-animation/spec.md` for the spec delta.

## What landed in this session

### Documentation

- New OpenSpec change folder: `openspec/changes/rebuild-animation-panel-foundation/` with `proposal.md`, `design.md`, `tasks.md`, `specs/dragon-animation/spec.md`.

### Code (all under `app/`)

**`app/studio/page.types.ts`** — added `OverlayToggles` (booleans: `joints`, `bones`, `hips`, `footTargets`, `headTarget`).

**`app/studio/page.stores.ts`** — added `overlayToggles` state + `setOverlayToggle(key, value)` setter; defaulted to all-on; added to the `partialize` allowlist so user preferences survive reload.

**`app/studio/AnimationDebugOverlay.tsx`** (new) — R3F component that draws over the dragon:
- joint dots (cyan, instanced mesh)
- bone lines between consecutive joints (cyan `LineSegments`)
- hip gizmos at each `limb.anchor` (pink)
- foot current markers at each `limb.currentTarget` (solid green spheres)
- foot desired markers at each `limb.desiredTarget` (amber wireframe spheres)
- head-to-target arrow (violet `Line`)

All primitives run with `depthTest={false}` + high `renderOrder` so they show through the translucent body. All have `raycast = () => null` so they never block floor clicks. Visibility is gated per-overlay by `useStudioStore.overlayToggles`; per-frame work mutates instance matrices / buffer attributes directly without React re-renders.

**`app/studio/StepAnimate.tsx`** — rebuilt. Overlay-toggle row → Shadcn `Tabs` (default `extrinsic`). `IntrinsicTab` renders a read-only skeleton summary (`Spine joints`, `Spine length`, `Legs`) computed from `groups` + `segments`, then the Stiffness slider. `ExtrinsicTab` groups: **Feet** (Foot Angle Offset, Step Threshold, Step Smoothing) and **Head / Target** (Wander Radius, Wander Speed, Max Speed, Follow Distance, Show Attractor checkbox, click hint). Every binding identical to before.

**`app/studio/StudioScene.tsx`** — `AnimateContent` now owns the `useCreature` call and passes `chainRef`/`limbStatesRef` to both `<AnimatedModel>` and `<AnimationDebugOverlay>`. Also applied the long-pending memo split: `baseCreatureConfig` (depends only on `modelConfig` + `segments`) is separated from `creatureConfig` (the overlay of `animationConfig`). Whole-store subscriptions in `AnimateContent`, `CameraController`, and `SceneContent` were narrowed to per-field selectors.

**`app/game/useCreature.ts`** — accepts an `enabled` arg so it can be opted out from inside `AnimatedModel` when refs are externally provided. **Critical perf fix**: removed `config` from the solver-construction effect's dep array (the structural keys were already listed individually). Added a separate cheap effect that mutates `solverRef.current.config = config` whenever config changes. This stopped the per-slider-tick `new Solver()` / `new Director()` storm that was hitching the frame loop.

**`app/game/AnimatedModel.tsx`** — accepts optional `chainRef` / `limbStatesRef` props. When passed (studio path), it consumes them and the internal `useCreature` call short-circuits via `enabled=false`. When omitted (home page via `HatchingDragon`), it works exactly as before.

## What still works the same

- Home page (`HomeScene` → `HatchingDragon` → `AnimatedModel`) — the optional props on `AnimatedModel` keep the home path on its existing internal `useCreature` call.
- Studio steps 1 and 2 — segment editor and node placement are untouched. The Animate panel never edits the data those steps own; the read-only skeleton summary makes the boundary structurally visible.
- All eight existing animation sliders + the Show Attractor toggle + the left-click hint — all preserved with identical bindings, just relocated.

## Browser verification — STILL PENDING

`openspec/changes/rebuild-animation-panel-foundation/tasks.md` § 8 lists seven visual checks unchecked. Type-check passes (8.8 ✓), but nothing has been opened in a browser yet:

- 8.1 Dragon motion is identical (no regression).
- 8.2 With all overlays on, all five gizmo kinds are visible over the dragon.
- 8.3 Each overlay toggle hides/shows only its own gizmo.
- 8.4 Intrinsic tab: summary + Stiffness work.
- 8.5 Extrinsic tab: every slider in Feet + Head/Target still effects the live preview.
- 8.6 Steps 1 and 2 are unchanged.
- 8.7 Overlay-toggle prefs + `animationConfig` survive reload.

Plus the OpenSpec validate / status steps (9.1, 9.2) — the `openspec` CLI isn't installed locally; the user will run those when ready.

**First thing to do next session:** run the dev server, open `/studio`, and walk through 8.1–8.7. If anything regresses, the suspect order is (a) overlay primitives blocking the click plane (mitigated via `raycast = null` but worth double-checking), (b) the Tabs Radix component bleeding pointer events into the canvas, (c) the memo split breaking initial joint placement (shouldn't, but `baseCreatureConfig`'s `segmentLengths` is the value to inspect first).

## Outstanding / known issues

- **Per-segment materials** (Suspect 3 from `handover_studio_animate_step.md`). Each `<SegmentMesh>` renders its own `MeshStandardMaterial` — ~150 materials for a typical dragon. Affects both the home page and the studio; pre-existing. The cheap fix is batching geometries per group; non-trivial scope and impacts the renderer's contract, so it's its own change.
- **OpenSpec CLI not installed.** `npx openspec` errors with "executable not found." The user runs validate/status; we just have to write conformant artifacts.
- **The home page `HatchingDragon` still scale-pops.** Not in this slice's scope — that's `add-dragon-animation-system` § 8 territory (the prior OpenSpec change wired hatching as a Director behavior). Independent of this work.

## Where this lands on the roadmap

From `animation_design.md` § 7:

```
✓ Slice 0 — Foundation (THIS SESSION)
  Viewport overlays + Intrinsic/Extrinsic panel shell.
  Implicit pre-Slice-1 setup the doc names as a precondition.

⏭ Slice 1 — Foot stepping rework + Y-axis graduation for legs
  Per-foot planted/swinging state machine, parabolic swing arc,
  step-trigger threshold per foot, phase offsets for alternating gait.
  Renderer: read anchor.y instead of forcing 0.
  New overlay gizmos: per-foot state badge, step-trigger ring,
  dashed swing-arc preview.

  Slice 2 — Attractor + head behavior (arrival, anticipation, idle drift)
  Slice 3 — Per-node intrinsic tuning (stiffness/damping/catch-up per joint)
  Slice 4 — 3D body root (pickup/jump/fall)
  Slice 5 — New constraint kinds (spring-damper, look-ahead, ground, secondary chain)
  Slice 6 — Environmental reactivity
```

### Recommended next session: Slice 1 — Foot stepping

The biggest visible defect today is sliding feet. Slice 1 fixes it and proves the foundation slice is right — its visualizations (state badges, trigger rings, arc previews) drop into the existing `AnimationDebugOverlay` and its new params (`swingDuration`, `liftHeight`, `phaseOffset`, `groundY`) slot under the Extrinsic → Feet subsection without restructuring anything.

Open a fresh session and:

1. Run browser verification on this slice first (§ 8 above). If anything regresses, fix before starting Slice 1.
2. Draft `openspec/changes/foot-stepping-rework/` following the same structure as `rebuild-animation-panel-foundation/`.
3. Implement: state machine in `Solver` (or a new file under `app/game/animations/`), per-foot config additions on `AnimationConfig` (per-foot or per-pair — make the call in the design doc), the renderer `anchor.y` change in `AnimatedModel.tsx`, the new overlay gizmos in `AnimationDebugOverlay.tsx`, and the new panel controls in `StepAnimate.tsx`'s Feet subsection.
4. "Done when" — copy from `animation_design.md` § 7 Slice 1: all four feet plant and lift visibly with a proper arc, gait reads as walking rather than sliding, foot state visible at all times.

### File map cheat sheet for Slice 1

To implement Slice 1, you will touch:

- `app/page.types.ts` or `app/studio/page.types.ts` — extend `AnimationConfig` (or split into `IntrinsicConfig` / `ExtrinsicConfig` if it grows enough to justify it) with per-foot fields.
- `app/game/animations/solver.ts` — the per-frame foot-state advancement in `Solver.apply()`.
- `app/game/AnimatedModel.tsx` — read `anchor.y` (line ~342); update the leg's rotation calc for vertical hip-to-foot offset.
- `app/studio/AnimationDebugOverlay.tsx` — add state-badge / trigger-ring / swing-arc gizmos and corresponding overlay toggles.
- `app/studio/StepAnimate.tsx` — new sliders under Extrinsic → Feet.
- `app/studio/page.stores.ts` — extend `OverlayToggles` with the new gizmo keys; defaults true; persisted.

### What NOT to do in Slice 1

- Don't touch the head's lerp behavior — that's Slice 2.
- Don't add per-joint stiffness — Slice 3.
- Don't lift the body root into 3D — Slice 4. Spine joints stay at their current Y.
- Don't refactor the solver into a constraint registry — Slice 5.

## Final reminders for the next agent

- Project conventions in `CLAUDE.md`: no comments, no `console.log`, throw errors, `cn` from `@/lib/utils`, `*.stores.ts` plural, hooks via React Query, actions for Supabase, no middleware.
- The runtime animation contract is locked at three buckets: `chain.joints[i]`, `limb.anchor`, `limb.currentTarget`. Only `Solver.apply()` writes them. Don't add a fourth bucket; don't write them from anywhere else.
- Slices ship with their visualizations. If you can't see what changed, the slice isn't done.
- The user is in auto mode and prefers concise output.
