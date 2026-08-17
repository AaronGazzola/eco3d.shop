## Why

The dragon leaves the overlay window and never comes back. Within about 16 seconds it reaches a tank wall,
parks in a corner, and by 90 seconds roughly half of it is outside the frame, so the overlay reads as empty.
Two explanations fit the evidence equally well and nothing on screen tells them apart: either the overhead
camera frames a rectangle smaller than the tank at the creature's own height, or the creature is leaving the
tank the physics claims to confine it to.

Both candidate fixes are expensive and they are different fixes. Guessing wrong means changing the camera
that four aspect ratios and three tank shapes already check, or reopening a contact model that has failed
three times before. A boundary drawn on screen settles it in one run: a creature inside the line but outside
the frame is a camera fault, and a creature outside the line is a physics fault.

Resetting the creature is the second half of the same problem. The simulation lives in the browser, so a
server restart leaves it running, and the only reset today is reloading the page. That makes every
observation a fresh 90-second wait and makes a before-and-after comparison at the same starting position
impossible.

## What Changes

- The overlay page renders an outline of the tank's floor rectangle, drawn from the bounds the physics
  already publishes, so the region the creature is confined to is visible in the same frame as the creature.
- The outline is off by default and switched on by a flag in the overlay link's hash, so a live stream is
  unchanged unless the flag is asked for.
- The animate store gains a reset that forces the MuJoCo structural rebuild, restarting the creature at its
  start position without reloading the page.
- The overlay page's existing read-only observation handle gains a reset entry, so a reset can be scripted
  from the harness rather than clicked.

This change deliberately makes no camera change and no physics change. It exists to decide which of those to
make next.

## Capabilities

### New Capabilities

None. Both behaviours attach to capabilities that already exist.

### Modified Capabilities

- `dragon-embed`: the hash gains an optional diagnostic flag; the page renders a tank boundary outline when
  that flag is set; the observation handle exposes a reset alongside the state it already reports.
- `locomotion`: the simulation gains an explicit reset that forces the structural rebuild, rather than a
  rebuild being reachable only as a side effect of changing gravity or tank dimensions.

## Impact

- `app/game/embed/page.tsx` — reads the new hash flag, renders the outline, adds reset to the handle.
- A new component under `app/game/` — draws the outline from the published tank bounds.
- `app/admin/animate/animateStore.ts` — a reset counter and the action that increments it, excluded from the
  persisted configuration so a reset never survives a reload as state.
- `app/game/locomotion/useMujocoLocomotion.ts` — the staleness check gains the reset counter.
- `openspec/specs/locomotion/spec.md` — the requirement that tank surfaces are not rendered as solid geometry
  is narrowed, since an outline is not solid geometry and is not shown on a live stream.
- No database change, no migration, no dependency added, and no change to the platform protocol.
