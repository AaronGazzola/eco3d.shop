# eco3d.shop

A game built around 3D-printable creatures. Each creature is a 3D model brought to life by a constraint-based procedural animation system. The gameplay layer is undefined and intentionally not in scope yet — the current focus is the animation framework. Eventually, players will be able to purchase the 3D models from the game to be printed and delivered as physical objects.

## What's in the repo right now

- **Admin / studio** (`app/admin/`) — an authoring workflow that turns a raw 3D model into an animation-ready rig. Gated to admin users (login required at `/admin`). The studio is *not* a player-facing tool.
- **Animation runtime** (`app/game/`) — the constraint-based procedural animation system that drives any rig authored in the studio. Renderer-contract is fixed; the animator can be swapped without touching the renderer.
- **Home page** (`app/page.tsx`) — a single dragon animating against the same runtime. Today this stands in for "the game."

There is no shop, no checkout, no commerce surface yet. The Supabase backend exists for future use; nothing in the current animation work depends on it.

## The studio→animation pipeline

This is the load-bearing concept. Every other doc builds on it.

1. **Import a 3D model.** The model arrives as a set of separable meshes (one STL per part, conceptually).
2. **Group segments.** Step 1 of the studio lets the user assemble those meshes into `BodyGroup`s, each typed as one of: `head`, `spine`, `tail`, `leg-left`, `leg-right`.
3. **Place nodes on each group.** Step 2 places small 2D anchor points onto each group: spine groups get a `nodeFront` and `nodeBack` (their bone endpoints); spine groups with legs attached also get `nodeHipLeft` / `nodeHipRight`; each leg group gets a `nodeFoot`. These nodes are deliberately *shared* between adjacent groups so consecutive bones share endpoints.
4. **Animate.** Step 3 runs the locomotion simulation. The node skeleton is what gets animated; the 3D mesh groups are positioned and rotated each frame to follow the node skeleton.

The animation is adaptive — it works for any rig that follows the same essential structure (head, spine, tail, two pairs of legs), regardless of how many spine joints the user placed, how long each segment is, or where the hips and feet sit. Every per-rig dimension is derived from the studio node placement; nothing is hardcoded for a specific model.

Locomotion is **not** hand-authored. A central pattern generator drives virtual muscles inside a physics simulation, and movement emerges from controller → muscles → body dynamics → environment forces, following Knüsel et al. (2020).

## Canonical documentation

Read these in order to get full context on the animation system. They are the source of truth — any conflict with code is a doc bug to be fixed, not the other way around.

1. **`documentation/reference/locomotion-reference.md`** — the verified, equation-by-equation extraction of the source paper. Every number, coupling and formula comes from here; where anything else disagrees, the reference wins.
2. **`documentation/locomotion.md`** — how the paper's model maps onto our rig: the fixed substrate, the pipeline, and the L0–L8 layer decomposition.
3. **`documentation/animation-roadmap.md`** — the living plan: the model in plain language, the locked decisions, the build phases, the decision log, and the measured baseline (§5) every change is scored against.
4. **`documentation/observation-loop.md`** — how to observe the running system. No claim about behaviour is made without a capture.

Disposable, not a reference:

- `documentation/locomotion-handover.md` — a **delete-after-reading** baton from the last session to the next. It is dated, it goes stale as soon as anything changes, and it must be deleted and rewritten rather than updated. Never cite it as a source; the four documents above are the record.

Unrelated to animation:

- `documentation/react-query.guide.md` — React Query patterns used elsewhere in the app.
- `documentation/starter_kit.plan.phase{1,2,3}.md` — Next.js / Supabase scaffolding plans.
- `documentation/initial_configuration/*.md` — initial app setup notes.

## OpenSpec changes

In-flight architectural changes live under `openspec/changes/`. Each change has `proposal.md`, `design.md`, `tasks.md`, and a per-capability spec delta under `specs/<capability>/spec.md`. Capabilities live under `openspec/specs/`: `locomotion`, `rig-authoring`, `dragon-rendering`, `dragon-genetics`.

An active change contains only tasks that will be implemented in the current cycle. Anything that cannot be finished in code moves to Linear and leaves `tasks.md`. See the governance rules in `CLAUDE.md`.

## Stack

Next.js 15 (App Router), TypeScript, TailwindCSS v4, Shadcn/ui, Supabase (remote only), Zustand, React Query, R3F (`@react-three/fiber`). See `CLAUDE.md` for code conventions and file-organization rules.

## Local dev

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) for the home page or `/admin` for the authoring workflow.

### Dev-mode performance — use the prod build for animation work

`/admin/animate` is essentially unusable in `next dev`. The cost is **not** a bug in the animation runtime — the prod build runs the same code fast. The dev-mode tax comes from r3f Fiber reconciliation amplified by React Strict Mode, Next.js Turbopack's per-module runtime proxy, non-minified bundles, and the dev overlay. A Firefox Performance trace of the dev freeze shows 65–70% of samples inside the r3f reconciler stack (`performWorkUntilDeadline → Xl → Di → Wa → Ap → Lf → yh → Hf → _h → el → Eh → lh → wr → ...`); the same stack is fast in prod where StrictMode and HMR aren't running.

There are two costs in dev:

1. **Mount freeze on first load** — several seconds while r3f reconciles the rig.
2. **Ongoing per-frame overhead** — the animation continues to feel sluggish after mount, because every `useFrame` tick pays Turbopack's runtime cost on every helper call.

Both go away in prod. The recommended workflow when working on the animation is therefore to **rebuild and run the prod build between code changes**:

```bash
npm run prod
```

That runs `doppler run -- next build && doppler run -- next start`. It's slow per-edit (a few seconds to rebuild) but the resulting app is honest about runtime perf. Use `npm run dev` for non-animation work where HMR is more valuable than runtime fidelity.

If you record a profile during a real perf investigation, do it against the prod build. The flame graph is non-minified (readable function names, no double-mount noise) and only there does CPU time reflect what real users see.

## Briefing a fresh AI on this project

Have it read, in this order:

1. This `README.md`.
2. `CLAUDE.md` — code conventions, file-organization rules, and spec governance.
3. `documentation/locomotion.md` — how the paper's model maps onto our rig.
4. `documentation/animation-roadmap.md` — the plan, the locked decisions, and the measured baseline (§5).
5. `documentation/locomotion-handover.md` — the last session's baton. Read it once for where things stand, then delete it and write a fresh one when you finish; it is dated and goes stale immediately.
6. `documentation/observation-loop.md` — how to see the system before making any claim about it.
7. Whichever in-flight OpenSpec change under `openspec/changes/` is the focus of the work.

Pull every equation and constant from `documentation/reference/locomotion-reference.md`, never from memory. That is enough context to continue the animation work coherently.
