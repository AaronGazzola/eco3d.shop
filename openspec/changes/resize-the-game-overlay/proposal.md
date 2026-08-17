## Why

The game overlay cannot be shaped. Every overlay box on the 1080x1920 stream canvas carries a position and
a single scale, and resizing drives both dimensions from that one scalar, so aspect ratio cannot be
violated by construction. The streamer can move the game window and can make it uniformly bigger or
smaller, and can do nothing else.

Worse, the scale is a lie for this particular overlay. The framed game is pinned to 480 by 320 in code
whatever the scale says, so scaling stretches a fixed render rather than giving the game more room. The
camera inside never sees a viewport change, so it never reframes, and the creature's world is the same size
at every scale.

There is also no way to say how large the creature should read inside its window. That is a separate
quantity from the window's size, and today it is neither expressed nor adjustable.

## What Changes

- The overlay box gains an optional width and height in canvas units, set only for the game box, so every
  other overlay keeps its current shape and every saved layout still loads.
- Resizing the game box becomes free: the dragged corner follows the pointer on both axes against the
  opposite corner, and four new edge handles resize one axis at a time. Every other overlay keeps the
  uniform, aspect-locked resize it has now.
- The framed game is given the box's real width and height instead of the pinned constants, so the game
  renders at the chosen size rather than being stretched to it.
- The creature's world follows the window: the tank's width and depth are derived from the box's shape, so
  a narrower window is a narrower tank and the creature meets a nearer wall.
- A new streamer setting says how much room the creature has, which is what makes the creature read larger
  or smaller inside the same window.

The overlay message protocol already carries width, height and scale, and the host already sends the
message, so no message shape changes. The room setting travels as an overlay setting, which the game
already treats as an opaque object it maps rather than adopts.

## Capabilities

### New Capabilities

None. Both sides attach to capabilities that already exist.

### Modified Capabilities

- `dragon-embed`: the game sizes its tank from the box the host reports and from the room setting, rather
  than ignoring the box and running a fixed tank.
- `platform-contract`: the room setting is added to the settings the host sends and the game maps.

The Vids.Tube half of this change is specified in that repository and is not covered by these specs.

## Impact

- `app/game/embed/page.tsx` — subscribes to the box message and the room setting, and sizes the tank.
- A new pure module under `app/game/` — turns a box shape and a room figure into tank dimensions.
- `app/game/hosts.ts` — maps the room setting alongside the creature name.
- On Vids.Tube: the box type and its validation, the resize maths, the overlay container's handles, the
  game window's frame, the stage's box message, and a slider in the Overlays tab.
- Resizing the tank rebuilds the physics model and restarts the creature in the middle, because the tank's
  walls are geometry inside that model. The resize is therefore applied when a drag ends, not during it.
- No database change and no migration.
