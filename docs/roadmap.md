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
game is retired.

**Amended 2026-08-03:** the CPG locomotion program is **not** retired. It was
briefly replaced by hand-tuned pose cycles, which slide by construction — the
root translates independently of the feet — and that direction was reversed.
Creature motion is CPG-driven inside a physics simulation, and the animate
research studio is the tool that tunes it. See `docs/locomotion.md`.
Pose cycles remain valid only for animations that never translate the body.

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
  node-skeleton assignment pipeline, and the skeleton→segment binding
  (including per-joint angle caps) are the animation foundation. They are
  preserved in full through any refactor. Angle caps are enforced as joint
  limits by the physics body — they are read, not merely stored.
- **Locomotion is CPG-driven, in physics** (amended 2026-08-03, reverses the
  E1 plan to drop it): the oscillator network drives virtual muscles inside a
  simulation, and motion emerges. Both drivers are live and both are kept:
  Rapier for the tuned swim, MuJoCo where genuinely rigid legs are needed.
  The animate research studio is kept as the tuning tool. Legs propel the
  body by **thrust**, not by a grip pin — a pinned foot is a constraint and it
  flattens the axial wave (`docs/animation-roadmap.md` Decision 10).
- **Table unification**: `model_configs` (old studio output) merges into
  `dragon_models` (variant x stage, rig + `role_tags`); the full `groups`
  schema — segment membership, node assignments, angle caps, rotation — is
  carried verbatim. The admin studio saves to the unified table;
  `model_configs` is then dropped.

## The track

### E0 — Direction reset
Linear cleanup (retire old-game tickets), this roadmap committed, project
description updated. *The locomotion arc was parked here and un-parked on
2026-08-03; it is an active track again.*

### E1 — Rig foundation
Keep and harden the admin studio pipeline (segmentation worker, grouping,
node-skeleton assignment, angle caps, role tagging). Unify `model_configs` →
`dragon_models`, carrying the full `groups` schema verbatim. **Done.**

*As shipped, E1 also deleted the locomotion runtime, the animate studio and
the MuJoCo dependency, and built hand-tuned pose cycles in their place. That
part was reversed on 2026-08-02: the pose cycles slide by construction, so the
CPG runtime and the studio were restored onto the unified rig table. The table
unification itself stands and is not revisited.*

### E1b — Walking by foot thrust
Make the creature walk, not swim, on the restored runtime. The body wave is
already correct and already produces diagonal-couplet footfall timing for
free; the gap is that the body glides while the feet churn. Add a per-foot
backward thrust clocked off the limb CPG, then front/hind balance, turning,
braking. Tracked as Phase D-T in `docs/animation-roadmap.md`.

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
auth/profiles/admin gating; the CPG locomotion runtime on two physics engines
with a working swim and an observation harness. Greenfield: walking, breeding,
economy, habitats, persistence wiring, API, commerce.
