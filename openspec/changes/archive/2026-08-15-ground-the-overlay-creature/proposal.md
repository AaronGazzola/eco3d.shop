## Why

The overlay creature flies. Flight reaches a wall after about 22 seconds and then presses against the
glass until it is pitched into the ceiling, and steering — the thing that would fix it — is a phase that
has not been built. The owner has sidelined flight and asked for a grounded creature first: the approved
`base swim` running along the floor, confined to the container, seen from above.

The grounded tank cannot be assembled from the parts that exist. The tank was built for flight, where
the bottom is glass like the rest, and it **replaces** the world's floor plane rather than adding to it.
The six panes sit on a contact group touched only by the trunk's hull spheres; the feet touch the walking
floor and nothing else. Switching the tank on under gravity therefore takes the ground away: the creature
sinks until its trunk rests on the bottom pane with its legs through the glass. This change makes the
tank work under gravity, which it never has.

## What Changes

- The tank's bottom is glass only when there is nothing to stand on. Under gravity the world keeps its
  walking floor and the tank contributes its four side walls and its ceiling, so the feet still find the
  ground and the body still bumps into the container.
- Under gravity the tank stands on the ground rather than being centred on the body, so its floor and the
  surface underfoot are the same plane.
- A new MuJoCo preset, `ground tank`: the approved `base swim` inside the same 60x30x40 tank the flight
  baseline uses. Gravity is the only lever that differs from `flight base`, so any difference between
  them is the medium and not a retune.
- `cruise` resolves to `ground tank` instead of `flight base`. The game core does not change; that is
  what naming motions bought.
- Each published motion declares the face its tank is watched through, and the overlay camera reads it.
  `cruise` is watched from overhead, fitting the tank's width and depth. This is not generality for its
  own sake: the camera is currently hardcoded side-on, so pointing `cruise` at a grounded preset without
  it would leave the overlay watching the floor edge-on.
- The camera's fit becomes a pure function of bounds, aspect, field of view and face, so that "the whole
  tank is in frame" can be checked rather than asserted.

Flight is sidelined, not removed. `flight base` keeps its preset, its side-on face and its requirements.

## Capabilities

### New Capabilities

None. Every behaviour here is a change to one that already exists.

### Modified Capabilities

- `locomotion`: the bounded tank no longer always replaces the floor plane, and its vertical placement
  depends on whether the body has weight.
- `motion-vocabulary`: `cruise` resolves to the grounded baseline, and a published motion carries the
  face its tank is watched through.
- `dragon-embed`: the overlay camera's face is chosen by the running motion rather than fixed side-on,
  and the fit is separable from the rendering.

## Impact

- `app/game/locomotion/mjcf.ts` — the world surface block and the published tank bounds.
- `app/admin/animate/simPresets.ts` — one new MuJoCo preset.
- `app/game/motion/resolve.ts` — `cruise`'s target, and a face on each published motion.
- `app/game/TankCamera.tsx` — split into a pure fit and a thin component; overhead support.
- `scripts/check-motion-vocabulary.ts` — extended; a new `scripts/check-tank-world.ts`.
- No database change, no protocol change, no dependency change. The overlay's address is unchanged.
