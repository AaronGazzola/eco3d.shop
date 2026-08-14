## Context

The overlay currently mounts `SceneContent` from the research studio and applies a `SimConfig` decoded
from its own URL hash. That is why the thing on stream is a wandering copy of the Simulate tab: it *is*
the Simulate tab, minus the sidebar.

Three renderers already exist in `app/game/AnimatedModel.tsx`:

- a per-`BodyGroup` path used by the studio, coloured by mechanical group, able to draw skeleton nodes;
- `PosedDragon`, which splits a group's segments by `role_tags` and paints each the resolved genetics
  colour, but which is **static** and self-fits its own scale;
- shared merge helpers underneath both.

The game needs the second one's colours with the first one's motion. Nothing needs rewriting.

`docs/game-architecture.md` decisions 9, 10 and 11 are the constraints this design implements. The
platform contract (decisions 3 to 6) is a separate change and is not built here.

## Goals / Non-Goals

**Goals:**

- A game core that holds world state, rules and actions, and that can be exercised without a browser.
- One interface between that core and everything environmental, with two implementations behind it.
- A creature that renders animated, genetics-coloured, and free of development affordances.
- Motion requested by name, with a fallback that cannot fail.
- The overlay and the home page running the same core, proven by both showing the same creature doing
  the same thing.

**Non-Goals:**

- Anonymous sessions. Separate change.
- Persistence of world state. The core holds state in memory here; a host supplies a save and nothing is
  written back.
- The platform contract: signed tokens, channel binding, live settings, pushed events. `PlatformHost`
  is the seat those plug into, and it is fed from the link in this change.
- Any movement primitive other than cruise.
- Any change to `app/admin/animate/**`, `app/game/locomotion/**`, the rig pipeline, or the observation
  harness. The studio is the animation track's tool and it stays exactly as it is.

## Decisions

**The core is plain TypeScript with no React and no store.** It lives in its own module, exposes actions
and a readable state, and is driven by a tick. Alternatives considered: a zustand store like the studio's,
or a React context. Both were rejected because the core must run headless in a check script, and because
a store shared with the studio is exactly how the game would drift back into being the Simulate tab.

**The Host is an interface, not a props bag.** The core asks the host for the save to load, who is
acting, the current settings, and any events since the last tick. A props bag would let a surface pass
whatever it happened to have, and the second surface would then differ from the first by accident. An
interface makes "the same mechanics in both places" checkable.

**`PlatformHost` is built now and fed from the link.** It reads what the embed reads today. This keeps
today's overlay behaviour intact and creates the seat that the token, the channel binding and live
settings drop into later, without inventing a contract before the host side of it exists.

**The render seam is a role-coloured variant of the animated path, not a fourth renderer.** The animated
path already applies per-segment world matrices; the role path already partitions segments by colour.
The join is to partition first and then apply the same matrices. `PosedDragon` keeps its static
behaviour because the genetics preview page uses it, and the studio path is untouched.

**Development affordances are absent by construction, not switched off.** The game surface does not pass
`showNodes`, does not mount the grid, and does not render stance or reach overlays. A boolean the game
sets to false is a boolean somebody later sets to true.

**Motion is resolved from a name to a configuration inside the motion layer, and the game never sees a
configuration.** `cruise` resolves to the published flight baseline. Any other name resolves to `cruise`
and records that it did. This is Decision 10's fallback rule, and it is what lets the gameplay track
write `pursue(target)` before the animation track has built it.

**Presets stay in the checked-in preset module for now.** Moving them server-side is Decision 10's
long-term shape but is not needed to make the seam real, and doing both at once would couple this change
to a schema change. The motion layer is the only thing that reads them, so the move is later work behind
one function.

## Risks / Trade-offs

- **The core drifts back into the studio store.** → The core never imports from `app/admin/animate/**`.
  The motion layer is the single place a `SimConfig` is produced, and it produces one only from a named
  preset.
- **Merging per colour multiplies draw calls.** → Merging is per colour per group, and role counts are
  small. If it measures badly, the merge key becomes colour across the whole body rather than per group.
- **The overlay regresses while being re-pointed at the core.** → `scripts/verify-embed.mjs` already
  drives the overlay in a fresh context with no session. It passes before the change and must pass after,
  and the creature must still be moving between two screenshots.
- **Scope creeps into gameplay.** → The core ships with the smallest action set that proves it runs, and
  every feature named in the roadmap's G phases is out of scope here.
- **"Same mechanics in both places" quietly stops being true.** → Both surfaces mount the same core
  through the same interface, so a mechanic added to one is present in the other or it does not compile.
