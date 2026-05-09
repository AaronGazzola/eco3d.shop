# Handover: Studio Live-Tuning Panel — OpenSpec Brainstorm

**For:** the next Claude Code agent picking up this conversation in a fresh window.
**Date written:** 2026-05-09.
**Status:** mid-brainstorm. Design not yet drafted. No code changes pending.

## Why this doc exists

The user (Aaron) and I started a brainstorming conversation about expanding the studio's Animate panel (`app/studio/StepAnimate.tsx`) into a live-tuning surface for the dragon animation system, so AI-assisted iteration on motion is fast and concrete instead of edit-reload-watch-guess.

We agreed the next step is an OpenSpec change proposal under `openspec/changes/`. The user wants to continue in a fresh agent window. This doc gives that agent everything needed to resume without re-reading the prior conversation.

## What you (the next agent) should do

1. Invoke the `superpowers:brainstorming` skill before doing anything else.
2. Read the files listed under "Files to load before asking anything" below.
3. Offer the visual companion as its own message (panel layout questions are coming).
4. Resume by asking the **first** clarifying question listed under "Clarifying questions queued up" — one at a time, multiple-choice preferred.
5. After clarifying, propose 2-3 approaches, then a design, then write the proposal under `openspec/changes/<change-id>/` following the repo's existing OpenSpec layout (see template pointer below).

The user is in **auto mode** — make reasonable assumptions on routine decisions, but the brainstorming skill's "no implementation until design approved" gate still holds. Design first, code never (this round).

## The core idea (from prior conversation)

I gave Aaron four dev-loop upgrades for animation work, ranked by ROI. He picked #1: a **leva/tweakpane-style live-tuning panel** wired to the dragon animation system.

Why it matters: AI is weakest at the "watch the motion" step of the iteration loop. A live panel closes that loop — the human tunes in real time at 60fps, lands on values, and the AI's job becomes "bake these into the constants file" instead of "guess a number that feels right." The `DragonDrive` struct (small, named, scalar) is already the perfect control surface for this.

The studio's existing Animate panel (`StepAnimate.tsx`) is the natural home — it already has the `SliderField` primitive and exposes a subset of `CreatureConfig` knobs. The expansion is to also expose:

- The constants in `app/game/animations/dragon/constants.ts` (egg depth, hatch duration, bank gain, foot-arc height, blend ms, etc.).
- Per-behavior `DragonDrive` overrides / scalars (e.g. boost `legLiftAmplitude` by 1.5x while wandering).
- Possibly: a live readout (HUD) of the current `DragonDrive` so you can see what the active behavior is emitting.
- Possibly: a "fire behavior" button to test transitions (`director.setBehavior('hatching')`).
- A way to bake the tuned values back into `dragon/constants.ts` (clipboard export, code-gen, or just persisted zustand state that gets manually reconciled).

Scope decisions on *which* of those bullets are in vs out are exactly what the clarifying questions below are meant to resolve.

## Files to load before asking anything

Animation system (the thing being tuned):
- `app/game/animations/types.ts` — `DragonDrive`, `Behavior`, `BehaviorContext`. The control surface.
- `app/game/animations/director.ts` — behavior switching + cross-fade.
- `app/game/animations/solver.ts` — consumes `DragonDrive`, writes the rig.
- `app/game/animations/blend.ts` — per-field lerp.
- `app/game/animations/dragon/constants.ts` — the values most worth exposing live.
- `app/game/animations/dragon/wandering.ts`
- `app/game/animations/dragon/hatching.ts`
- `app/game/animations/dragon/index.ts`
- `app/game/useCreature.ts` — wires director + solver into the React Three Fiber frame loop.

Studio panel (the thing being expanded):
- `app/studio/StepAnimate.tsx` — current panel. Uses `SliderField`, `SectionTitle`, `Divider` primitives from `app/game/ConfigPanel.primitives`.
- `app/studio/page.stores.ts` — `useStudioStore` (zustand + persist). Holds `animationConfig` and `setAnimationField`.
- `app/studio/page.types.ts` — `AnimationConfig` shape.
- `app/studio/StudioScene.tsx` — to see how the panel's values flow into the rendered creature.

OpenSpec convention (this repo's style):
- `openspec/changes/add-dragon-animation-system/proposal.md` — read this for the proposal format (Why / What Changes / Capabilities / Impact sections).
- `openspec/changes/add-dragon-animation-system/design.md` — read for the design.md format.
- `openspec/changes/add-dragon-animation-system/tasks.md` — read for the tasks.md format (numbered, granular, checkbox-tracked).
- `openspec/changes/add-dragon-animation-system/specs/dragon-animation/spec.md` — read for the per-capability spec format.

Project conventions:
- `CLAUDE.md` (project root) — naming, file organization, no-comments rule, hook/store/action/types patterns. Important: this is a Next.js + Zustand + React Query + Supabase project; route protection via DB queries in react-query hooks, not middleware.

## Current state of `StepAnimate.tsx` (what already exists)

The panel today exposes 8 sliders across 3 sections and 1 toggle:

- **Spine**: Stiffness (derived from `angleConstraint`).
- **Limbs**: Foot Angle Offset, Step Threshold, Step Smoothing.
- **Navigation**: Wander Radius, Wander Speed, Max Speed, Follow Distance. Plus a "Show attractor" checkbox and a hint that left-click sets a target.

All values live in `useStudioStore.animationConfig` (an `AnimationConfig` typed object) and are persisted via zustand's `persist` middleware. They flow into the live creature via `StudioScene` → `useCreature(config, targetRef)`.

What's **not** exposed today:
- Anything in `dragon/constants.ts` (egg depth, hatch duration, bank gain, foot arc height, blend ms, hatching head-pitch peak, max bank angle).
- Any behavior-specific knob — both behaviors read shared constants directly.
- Any per-frame `DragonDrive` field as either a readout or an override.
- Any way to switch behaviors from the UI (the director picks initial behavior at construction time).

## Clarifying questions queued up

Ask these one at a time, in order. Multiple-choice preferred. Adapt based on answers — these are starting points, not a script.

1. **Scope of knobs.** Which of these should the expanded panel control? (a) only `dragon/constants.ts` values; (b) constants + per-behavior `DragonDrive` overrides; (c) all of the above + live `DragonDrive` HUD readout; (d) all of the above + a "fire behavior" trigger UI for testing transitions.

2. **Per-behavior tuning isolation.** Should each behavior get its own constants section in the panel (e.g. a "Hatching" group with hatch duration + head-pitch peak, separate from a "Wandering" group with bank gain), or should constants stay grouped by what they affect (Spine / Limbs / Locomotion / Lifecycle)?

3. **Bake-back workflow.** When the user lands on values they like, how should they get back into the codebase? Options: (a) clipboard "Copy as TypeScript" button that emits a ready-to-paste `constants.ts` block; (b) export-to-JSON download; (c) just rely on persisted zustand state and the user tells the AI the values verbally; (d) generate a draft file edit via a small dev-only API route.

4. **Storage of tuned values.** Should tuned values overlay `dragon/constants.ts` at runtime via a "tuning store" (constants stay as defaults, store provides overrides), or should the panel write directly to a copy of the constants object that the director/solver consume? The first keeps the source of truth in code; the second is simpler.

5. **Persistence scope.** Tuned values currently live in `useStudioStore` with zustand persist. Should the new constants/overrides also persist (survive reload, fast iteration), or stay session-only (forces explicit bake-back)?

6. **Studio-only vs game-wide.** The studio is for authoring per-model configs. The dragon animation also runs on the home page (`HomeScene`/`HatchingDragon`). Should the live-tuning panel only affect the studio scene, or should there be a way to tune against the home-page hatching sequence too (probably out of scope, but worth confirming)?

7. **Auth / route gating.** The studio appears to be authoring-only. Should the live-tuning expansion be gated behind any role, or is it fine to leave on whatever access control the studio already has?

## Things to **not** propose (likely scope creep)

- New behaviors (saved for later — Aaron and I discussed an "idle/breath layer" as a future #2 priority, but that's its own change).
- Behavior recorder + replay (the #2 ROI item from the original list, also its own change).
- Reference-clip system (the #4 item, future).
- Mood / event-driven behavior selection (also future).
- Any change to `solver.ts` or `director.ts` semantics — the panel should drive existing knobs, not invent new ones.
- Any non-dragon creature support.
- Any DB / Supabase schema change.

## Final reminders

- No comments in code (per CLAUDE.md).
- No `console.log` in app code; `console.error` for thrown errors.
- Use `cn` from `@/lib/utils` for class concatenation.
- File naming: `*.stores.ts` plural, `*.hooks.tsx`, `*.actions.ts`, `*.types.ts`.
- The brainstorming skill's terminal state is `superpowers:writing-plans` — invoke that after the spec is written and the user approves it.
- The OpenSpec proposal goes under `openspec/changes/<change-id>/` with `proposal.md`, `design.md`, `tasks.md`, and `specs/<capability>/spec.md`. Match the prior change's structure.

Good luck.
