# eco3d.shop

A multi-species breed-and-sell creature tycoon game with compostable 3D-print fulfillment.
Dragons are the first species. Players buy rarity-tiered eggs, breed, sell and upgrade, and
may print a creature they own while that creature is alive. The current engineering focus is
creature animation; the product track is in `docs/roadmap.md`.

## What's in the repo

- **Admin studio** (`app/admin/`) — the authoring workflow that turns a 3D model into an
  animation-ready rig. Admin login required. Not player-facing.
- **Creature runtime** (`app/game/`) — the skeleton model, the static and animated renderers,
  and the colour-genetics engine.
- **Genetics** — schema, pure engine and admin authoring surfaces, described in
  `documentation/dragon-genetics.md`.

There is no shop, no checkout and no commerce surface. Those arrive at E5 on the product roadmap.

## The studio pipeline

1. **Pick a model.** An STL is chosen from storage, against a target variant and life stage.
2. **Group segments.** A detection pass splits the STL into connected components, which are
   assembled into body groups, each typed as head, spine, tail, leg-left or leg-right.
3. **Place nodes.** Head, spine and tail groups take a front and a back node; spine groups
   carrying legs also take hip nodes; each leg takes a foot node.
4. **Animate.** The node skeleton is what animates. Mesh groups are passengers, positioned
   and rotated each frame to follow the skeleton.

Every per-rig dimension comes from node placement. Nothing is hard-coded per model, and any
rig following the head, spine, tail topology with legs on hip sockets will work.

## Animation documentation

Read in this order before touching creature motion.

1. **`documentation/animation-criteria.md`** — governing document. The rig's fixed physical
   constraints, the substrate invariants, the geometric law any locomotion solution must obey,
   the rules, and the approaches already rejected.
2. **`documentation/animation-roadmap.md`** — the five stages, and how each is proved.
3. **`documentation/cpg-model.md`** — the oscillator model in plain language.
4. **`documentation/reference/locomotion-reference.md`** — the verified equation-by-equation
   extraction of the source paper. Wins any conflict on a number or a formula.
5. **`documentation/reference/knusel-2020-salamander-cpg.pdf`** — the paper itself.

`documentation/observation-loop.md` describes how to watch the animation headlessly. That
document is rewritten once Stage 1 exposes real hooks.

## Other documentation

- `CLAUDE.md` — code conventions, file organisation, spec governance.
- `docs/roadmap.md` — the product track, E0 to E5.
- `documentation/dragon-genetics.md` — genetics schema, engine and admin surfaces.
- `documentation/react-query.guide.md` — data-fetching patterns.
- `documentation/starter_kit.plan.phase{1,2,3}.md` and `documentation/initial_configuration/` —
  scaffolding and setup notes.
- `documentation/template_files/` — the utility-file templates cited by `CLAUDE.md`.

## Specifications

Capability specs live under `openspec/specs/`. In-flight changes live under
`openspec/changes/`, each with a proposal, a task list and per-capability spec deltas.
Completed changes are archived alongside. Per `CLAUDE.md`, a backlog item is promoted into a
new change before any code is written.

## Stack

Next.js 15 (App Router), TypeScript, TailwindCSS v4, Shadcn/ui, Supabase (remote only),
Zustand, React Query, and react-three-fiber.

## Local dev

```bash
npm run dev
```

Then open `/admin` for the authoring workflow.

### Use the prod build for animation work

The studio is close to unusable under `next dev`. The cost is not in the animation runtime;
the same code runs fast in a production build. Dev-mode overhead comes from react-three-fiber
reconciliation amplified by React Strict Mode, Turbopack's per-module runtime proxy,
non-minified bundles and the dev overlay. Two symptoms appear: a multi-second freeze on first
mount, and per-frame overhead that persists afterwards. Both disappear in a production build.

```bash
npm run prod
```

Rebuild between changes when working on animation. Record performance profiles against the
production build only; dev traces are dominated by double-mount noise and minifier artefacts.
