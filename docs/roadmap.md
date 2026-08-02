# eco3d.shop Roadmap

Written 2026-07-26 after the cross-project strategy sessions with Vids.Tube
(`../Vids.Tube/docs/roadmap.md` holds the platform-side track and the settled
economy decisions). Future agents: read this document, then pick work from the
Linear backlog (Az team, eco3d.shop project) filtered to the current phase —
ticket titles carry phase labels like `[E1]`. Per repo governance, promote a
ticket into a new OpenSpec change before writing any code.

## Product statement (new direction, replaces the prior game concept)

eco3d.shop is a **multi-species breed-and-sell creature tycoon game** (fish-
tycoon style) with **compostable 3D-print fulfillment**, playable standalone
and embeddable by streaming platforms — Vids.Tube is integration #1, where a
habitat renders as a stream-overlay game that chatters interact with.

Dragons are the first species. Habitats (terrariums, tanks, ...) hold
creatures; players buy rarity-tiered eggs, breed, sell, and upgrade. No
care/training loop, no lineage system. The prior tamagotchi/egg-hatch home
game and the procedural-locomotion research program are retired.

## Settled decisions (do not re-litigate)

- **Material**: PHA only, 3 colors (white, black, light brown). Identical on
  screen and in print. No PLA, no painting. Marketing wording: "plant-based,
  compostable" (industrially) — never plain "biodegradable".
- **Rarity**: from genetics (allele frequency; rare morphs like all-white /
  all-black as low-frequency alleles) AND from shape (model variants, crests,
  size) so rarity reads at a glance in 3 colors. `max_print_colors` keeps
  every rolled phenotype printable by construction.
- **Ownership & printing**: ownership transfers by in-game purchase or
  streamer gift; ownership grants the right to print the creature **while it
  is alive**. Creatures retire on a timer (keeps gameplay moving, creates
  print urgency). Remaining lifespan is visible wherever a creature changes
  hands or can be printed. Retired creatures leave a trophy record on the
  owner's profile (no breeding-lineage system).
- **Economy valve**: the game runs on its own in-game currency (earned by
  selling creatures, spent on eggs/habitats/upgrades). Vids.Tube Credits
  convert INTO the game (egg purchases, gifts) and never convert back out.
- **Rig foundation is sacrosanct**: the STL → segment-detection → segment-to-
  node-skeleton assignment pipeline and the skeleton→segment binding are the
  animation foundation. They are preserved in full through any refactor.
  Per-joint angle caps are retained as stored data but are no longer read or
  enforced.
- **Locomotion is CPG-driven and kinematic** (settled 2-Aug-2026, supersedes the
  pose-cycle plan). The oscillator model from the Knüsel paper drives body
  undulation; the body's placement is solved each frame against planted feet, so
  forward motion is an output of the wave rather than an authored slide. The
  MuJoCo and Rapier physics drivers stay dropped: contact is asserted, never
  simulated. Hand-authored pose cycles are never the locomotion path. Governing
  document: `documentation/animation-criteria.md`.
- **Table unification**: `model_configs` (old studio output) merges into
  `dragon_models` (variant x stage, rig + `role_tags`); the full `groups`
  schema — segment membership, node assignments, angle caps, rotation — is
  carried verbatim. The admin studio saves to the unified table;
  `model_configs` is then dropped.

## The track

### E0 — Direction reset
Linear cleanup (park the locomotion arc, retire old-game tickets), this
roadmap committed, project description updated.

### E1 — Rig foundation
Keep and harden the admin studio pipeline (segmentation worker, grouping,
node-skeleton assignment, role tagging). Unify `model_configs` →
`dragon_models`. Then build locomotion in five stages — swim, plant, walk,
turn, navigate — driven by the CPG oscillator and solved kinematically against
planted feet. Scope is locomotion only; idle, eating and sleeping are out.
Stages and success tests: `documentation/animation-roadmap.md`.

### E2 — Genetics v1 on PHA
3 `filament_colors` rows; roles/genes/alleles with dominance; rare morphs;
shape-tier rarity; two-parent Mendelian crossing with a visible-odds
(Punnett) preview. Inputs: the shipped AZ-102 genetics foundation and the
decisions recorded in the completed genetics tickets.

### E3 — Tycoon core
Creature persistence (wire the existing `dragons` table); rarity-tiered egg
market; breeding; selling; habitat framework (terrariums/tanks; species
framework with dragons first); retirement timers; ownership + print-rights
transfer; trophy records; standalone play loop at eco3d.shop.

### E4 — Integration API (unblocks Vids.Tube V4)
Auth handoff from Vids.Tube identity; habitat/creature state reads for the
overlay; action endpoints (game actions, egg purchases, gifts/transfers);
event push (hatches, sales, retirements) for overlay moments.

### E5 — Commerce
Checkout + fulfillment (rebuilt; removed 2026-02). Per-filament STL export
(one file per PHA color per print). Print purchases of owned living
creatures; standalone players print what they breed. Shared infrastructure
for any future physical product.

## Sync points

- E1–E3 have no Vids.Tube dependency; build in parallel with Vids.Tube V1–V3.
- E4 must complete before Vids.Tube V4 (dragon on stream).
- The dragon stream-interaction design session (owner + agent, not yet
  scheduled) gates E3 finalization and V4.

## Foundations already in place

Rig studio (STL segmentation, grouping, skeleton binding, angle caps, role
tagging); genetics schema (7 tables) + pure engine
(`app/game/dragons.genetics.ts`) + admin authoring UIs; STL load pipeline;
auth/profiles/admin gating. Greenfield: simple animation, breeding, economy,
habitats, persistence wiring, API, commerce.
