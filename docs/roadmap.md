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
- **The dragons FLY; walking is parked** (amended 2026-08-10). Stepping could
  not be made to work — foot plant timing produced complication after
  complication — while the base swim with drag on has been reliable
  throughout. Flight is that same swim with gravity removed: the wave pushes
  against direction-dependent drag, and drag does not care whether the fluid
  is water or air. The controller does not change. Foot thrust is **kept as a
  lever, defaulted off**, and no stepping code is deleted. See
  `docs/animation-roadmap.md` Decisions 12–15 and Phase T.
- **Vids.Tube is a general overlay-game platform, and eco3d is tenant one**
  (added 2026-08-12). Overlays are sandboxed frames forever, because
  third-party overlays are an explicit goal and stranger code can never render
  inside the host app. Every overlay gets one capability tier; tiers separate
  review and distribution, never power. Viewers are pseudonymous until they
  consent. Overlays are self-hosted and proxied through a fixed platform
  origin, Discord-style rather than Twitch-style, which keeps eco3d serving its
  own overlay page and keeps `npm start` in eco3d as the development loop. Full
  reasoning and the ten locked decisions are in `docs/game-architecture.md`.
- **Table unification**: `model_configs` (old studio output) merges into
  `dragon_models` (variant x stage, rig + `role_tags`); the full `groups`
  schema — segment membership, node assignments, angle caps, rotation — is
  carried verbatim. The admin studio saves to the unified table;
  `model_configs` is then dropped.

## Two tracks, running in parallel (added 2026-08-12)

Work splits in two, and the split is deliberate: each track has its own tool,
its own definition of done, and its own way of being judged.

- **The animation track** makes the creature move well. Tuned in the research
  studio at `/admin/animate`, judged by capture and measurement through the
  observation harness, never by assertion. Tracked as Phase T in
  `docs/animation-roadmap.md`. Phases E1b and E1c belong here.
- **The gameplay track** makes the creature *do things*. Behaviours (hunting,
  fleeing, hiding, sleeping, mating, waste), the objects those behaviours need
  (prey, waste, food), eggs, breeding and genetic expression. Built against the
  game page and the overlay, judged by playing it. Phases E2 to E4 belong here,
  restated as G phases below.

**The two tracks meet at a published vocabulary, never at a config blob.** The
animation track publishes named, versioned presets and named movement
primitives — cruise, turn to heading, pursue a point, flee a point, hold
station, rest. The gameplay track consumes them *by name* and never by tuning
value. Hunting is written as a sequence of primitives plus game state, never as
a set of oscillator constants. This is what lets the tracks run at the same time
without blocking each other, and it is Decision 10 in
`docs/game-architecture.md`.

Neither track waits on the other. The gameplay track can build against a
creature that only cruises; the animation track can improve cruising without the
gameplay track changing.

## The gameplay track (added 2026-08-12)

### G0 — The game render
Split the game render from the studio render: no node skeleton, no grid, no
debug overlay, coloured by genetics in the available PHA filaments. The
genetics-coloured path already exists but is static, and the animated path
colours by mechanical group — the work is joining the physics pose to the
genetics dressing, not writing a renderer. Anonymous sessions land here too,
since the home page must work with no account.

### G1 — The base game on the home page
A small playable loop at eco3d.shop, open to anonymous visitors: one habitat,
one creature, a handful of actions, state that persists. Slow state is
server-held and resolved from timestamps, so time passes with nobody watching.
Deliberately small; it is the thing every later feature is added to.

### G2 — The overlay as tenant one
The platform contract as eco3d consumes it: the signed channel token, the
one-time pairing claim that binds a channel to an eco3d account, settings
arriving live from Vids.Tube, and the same game loop as G1 rendered for a
stream. Replaces the single build-time configuration blob that cannot serve two
streamers. **The matching platform work lives in the Vids.Tube repository and is
its own track there.**

### G3 — Community interaction
Chat commands reaching the game as pushed events, acting on the streamer's
habitat under a pseudonymous viewer id, rate limited per viewer and per habitat.
Streamer direction alongside chatter actions.

### G4 — Behaviours and the objects they need
Hunting, fleeing, hiding, sleeping, mating, waste. Prey items, waste items,
food. Each behaviour written against movement primitives published by the
animation track.

### G5 — Eggs, breeding and expression
Far more of this exists than the E2 entry below suggests. Read
`docs/dragon-genetics.md` first: the data model, the pure engine
(`resolveGenotype`, `rollGenotype`), role-tagged rendering, the admin authoring
UIs and the orderability map all landed under AZ-102, and a preview page already
rolls a genotype and renders it in role colours.
What is genuinely missing is the play layer: eggs, two-parent crossing with a
visible-odds preview, growth through the stages, rare morphs, shape-tier rarity,
and a PHA-rules seed. The deferred Linear threads name the pieces: breeding
(AZ-96), growth (AZ-97), mutations (AZ-98), selection and population (AZ-99),
traits and conditional expression (AZ-100).

## The original track (E phases)

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

### E1b — Walking by foot thrust. **PARKED 2026-08-10**
Superseded by E1c. Foot thrust shipped and works; foot planting does not, and
chasing it was blocking everything downstream. No code is deleted and foot
thrust stays available as a lever. Tracked as Phase D-T in
`docs/animation-roadmap.md`, marked parked there.

### E1c — Flying in a tank
Make the creature fly inside a bounded volume, seen through a fixed side-on
camera in a rectangular window on the Vids.Tube overlay. Gravity off, legs
rigid and inert, wave-driven motion against drag exactly as in the base swim.
Then turning (already built), level flight and banking, climb and dive on a
new pitch hinge per spine joint, the speed/turn/climb preset grid, and finally
wall-aware roaming and object tracking. **This phase is also the E4 dependency
in practice** — the overlay is what the whole flight phase is delivered
through, and the owner streams against it while working. Tracked as Phase T in
`docs/animation-roadmap.md`.

*Restated 2026-08-12: E2, E3 and E4 are now delivered through the G phases
above, which carry the current shape. The E entries below are kept for their
scope notes and their inputs, not as the plan of record. E4 in particular is
no longer a bespoke integration API — it is eco3d consuming the general overlay
contract as tenant one, which is G2.*

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
with a working swim and an observation harness; a public overlay page that
renders a saved rig with no login on a transparent background, already
configured and verified inside Vids.Tube. Greenfield: flight, breeding,
economy, habitats, persistence wiring, API, commerce.
