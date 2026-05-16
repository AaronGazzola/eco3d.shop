# eco3d.shop

A game built around 3D-printable creatures. Each creature is a 3D model brought to life by a constraint-based procedural animation system. The gameplay layer is undefined and intentionally not in scope yet — the current focus is the animation framework. Eventually, players will be able to purchase the 3D models from the game to be printed and delivered as physical objects.

## What's in the repo right now

- **Studio** (`app/studio/`) — an authoring workflow that turns a raw 3D model into an animation-ready rig. Currently exposed to anyone; **will be gated to admin only** once the gameplay surface lands. The studio is *not* a player-facing tool.
- **Animation runtime** (`app/game/`) — the constraint-based procedural animation system that drives any rig authored in the studio. Renderer-contract is fixed; the animator can be swapped without touching the renderer.
- **Home page** (`app/page.tsx`) — a single dragon animating against the same runtime. Today this stands in for "the game."

There is no shop, no checkout, no commerce surface yet. The Supabase backend exists for future use; nothing in the current animation work depends on it.

## The studio→animation pipeline

This is the load-bearing concept. Every other doc builds on it.

1. **Import a 3D model.** The model arrives as a set of separable meshes (one STL per part, conceptually).
2. **Group segments.** Step 1 of the studio lets the user assemble those meshes into `BodyGroup`s, each typed as one of: `head`, `spine`, `tail`, `leg-left`, `leg-right`.
3. **Place nodes on each group.** Step 2 places small 2D anchor points onto each group: spine groups get a `nodeFront` and `nodeBack` (their bone endpoints); spine groups with legs attached also get `nodeHipLeft` / `nodeHipRight`; each leg group gets a `nodeFoot`. These nodes are deliberately *shared* between adjacent groups so consecutive bones share endpoints.
4. **Animate.** Step 3 runs the procedural animation. The node skeleton is what gets animated; the 3D mesh groups are positioned and rotated each frame to follow the node skeleton.

The animation is procedural and adaptive — it works for any rig that follows the same essential structure (head, spine, tail, two pairs of legs), regardless of how many spine joints the user placed, how long each segment is, or where the hips and feet sit. Every per-rig dimension is derived from the studio node placement; nothing is hardcoded for a specific model.

## Canonical documentation

Read these in order to get full context on the animation system. They are the source of truth — any conflict with code is a doc bug to be fixed, not the other way around.

1. **`documentation/animation_design.md`** — the design doctrine. Constraint-based procedural animation, the Intrinsic / Extrinsic vocabulary, the hard invariants the system must preserve, and the slice-by-slice roadmap for evolving the animation.
2. **`documentation/skeleton_to_model_mapping.md`** — the studio↔runtime↔renderer contract. How studio nodes become simulation parameters, what the renderer reads from the simulation each frame, and what an animation must respect to work on *any* rig the studio produces.

Active engineering history (still relevant context):

- `documentation/handover_animation_panel_foundation.md` — handover for the panel + debug overlay foundation.
- `documentation/handover_studio_animate_step.md` — engineering history of how studio step 3 was originally wired in, plus an open perf investigation thread.

Unrelated to animation:

- `documentation/react-query.guide.md` — React Query patterns used elsewhere in the app.
- `documentation/starter_kit.plan.phase{1,2,3}.md` — Next.js / Supabase scaffolding plans.
- `documentation/initial_configuration/*.md` — initial app setup notes.

## OpenSpec changes

In-flight architectural changes live under `openspec/changes/`. Each change has `proposal.md`, `design.md`, `tasks.md`, and a per-capability spec delta under `specs/<capability>/spec.md`. The current capability is `dragon-animation`.

## Stack

Next.js 15 (App Router), TypeScript, TailwindCSS v4, Shadcn/ui, Supabase (remote only), Zustand, React Query, R3F (`@react-three/fiber`). See `CLAUDE.md` for code conventions and file-organization rules.

## Local dev

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) for the home page or `/studio` for the authoring workflow.

## Briefing a fresh AI on this project

Have it read, in this order:

1. This `README.md`.
2. `CLAUDE.md` — code conventions and file-organization rules.
3. `documentation/animation_design.md` — design doctrine and roadmap.
4. `documentation/skeleton_to_model_mapping.md` — the renderer contract.
5. Whichever in-flight OpenSpec change under `openspec/changes/` is the focus of the work, plus the last handover doc (`documentation/handover_animation_panel_foundation.md`) for engineering context.

That is enough context to continue the animation work coherently.
