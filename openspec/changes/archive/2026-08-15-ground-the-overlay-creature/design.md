## Context

The tank was built in Phase T1 for a creature with no weight. `mjcf.ts` emits either the walking world —
one infinite floor plane, contact group 1/2, touched by the feet — or the tank: six inward-facing planes
on contact group 4/4, touched only by one zero-mass hull sphere per trunk segment. The two are exclusive
branches of a ternary. The isolation was measured, not chosen for tidiness: putting the trunk capsules on
the feet's contact pair contained the body but destabilised the solver, stable to 30 s and exploded by
45 s, and that failure is recorded in the file.

The consequence nobody had reason to hit yet is that the tank takes the ground away. `base swim` has
gravity, stands on its legs and travels at 1.53 u/s; add `tankEnabled` to it and the feet have nothing to
touch, so the body sinks until the trunk's hull spheres rest on the glass bottom pane with the legs
hanging through it.

The overlay's camera is fixed side-on to the tank's +Z face. That is correct for flight and wrong for a
creature on the floor, which side-on is watched edge-on.

## Goals / Non-Goals

**Goals:**

- A creature with weight, standing on the ground, confined by the tank in X and Z.
- The overlay watching that tank from above.
- One lever between the grounded preset and the flight preset, so the pair stays a controlled comparison.
- The camera's fit checkable without a browser.

**Non-Goals:**

- Steering. The grounded creature will reach a wall and press against it, exactly as the flying one does.
  That is a phase, not a bug to be patched here.
- Deriving the tank from the overlay's box, and the room-size setting. Separate change.
- Any change to walking, stepping or foot thrust. The grounded creature swims along the floor; the walk
  is parked.
- Removing flight. `flight base` keeps its preset and its behaviour.

## Decisions

### Glass underfoot only when there is nothing to stand on

The world surface stops being a two-way branch on `tank` and becomes a composition of two independent
questions: is there a floor to stand on, and is there a container.

- Gravity non-zero: emit the walking floor plane at `groundTop` on contact group 1/2 exactly as today,
  and emit the tank's four side walls and ceiling. No glass bottom pane.
- Gravity zero: emit the six glass panes and no walking floor, exactly as today.
- No tank: emit the walking floor plane alone, exactly as today.

Alternative rejected: one bottom pane serving both, by widening its contact mask to bits 1 and 4. It
would put eleven trunk hull spheres in near-contact with the floor whenever the body lay low, which is
the many-redundant-coplanar-contacts failure this solver has already produced twice. Keeping the feet's
plane and the hull's walls on separate groups preserves the isolation that was measured.

The side walls and the ceiling are infinite planes; their `size` is a rendering hint only, so nothing has
to be trimmed to the floor. The ceiling is unreachable under gravity and is emitted anyway, because a
container the body cannot leave is cheaper to keep than to make conditional.

### Under gravity the tank stands on the ground

`tankMinY` is `groundTop` when gravity is non-zero, and stays `bodyCy - height/2` when it is zero.

The grounded case has a plane the tank must agree with — the surface underfoot — and disagreeing with it
would put the walls' published bounds somewhere the creature never goes, which is what the camera frames.
The flying case has no such plane, and its centring on the body was itself the fix for the creature
sitting along the bottom edge of the window.

`tankBounds` follows, so the published volume is the volume the camera frames and the volume the
observation harness scores against.

### `ground tank` differs from `flight base` by gravity alone

Same 60x30x40 tank, same `base swim` levers, same 0.1 kg legs. The pair then reads as one experiment: any
difference in how the body moves is the medium.

### A published motion declares the face its tank is watched through

`PublishedMotion` gains `view: 'side' | 'overhead'`. `cruise` is overhead; if flight is republished it is
side. `useGameSession` returns the resolved view alongside the rest, and the embed page hands it to
`TankCamera`.

Alternative rejected: hardcoding overhead. The camera is currently hardcoded side-on, and that hardcoding
is precisely what breaks the moment `cruise` points at a grounded preset. Replacing one hardcoded face
with another leaves the same trap for the next motion. The field is five lines and it makes the camera a
consequence of the motion rather than a second place to remember.

Alternative rejected: deriving the face from the tank's proportions. It would guess, and it would change
the camera when a later change resizes the tank to match the overlay's box.

### The fit becomes a pure function

`fitTankCamera({ bounds, view, aspect, fovDeg })` returns `{ position, target, up }` and imports nothing
from React or the store. `TankCamera` calls it and writes the result onto the camera.

Overhead needs an explicit `up`, because looking straight down −Y with the default up of +Y is degenerate
and `lookAt` produces an undefined roll. Overhead uses `up = (0, 0, -1)`, which puts +X to the right of
the frame and −Z toward the top: the creature travels across the window rather than up it.

Overhead fits width against the horizontal half-angle and depth against the vertical one, where side-on
fits width and height, and both measure from the near face rather than the centre so the near corners
stay inside the frustum.

Pure means the claim "all eight corners of the tank are in frame" is checked by projecting them, at
several aspect ratios, in a script — rather than asserted from a screenshot in which a corner outside the
frame looks exactly like a corner that is not there.

## Risks / Trade-offs

- **The creature reaches a wall and presses against it** → Not fixed here, and not hidden either. Under
  gravity a press cannot pitch the body into a ceiling the way flight's did, because weight opposes it,
  but the body will sit against the glass. The capture will show how it actually behaves and the number
  goes in the preset description rather than in a claim.
- **Foot friction is zero in `base swim`** (`bodyFriction: 0`, `legFriction: 0.05`) → the grounded run is
  a swim along the floor, which is what was asked for. If the floor turns out to hold the body back
  differently inside a tank than on the open plane, that is a measurement to report, not a lever to
  quietly turn.
- **The overhead view loses the depth cue** the fixed side-on camera existed to create → accepted and
  intended. A plan view of a floor is what a top-down camera is. The perspective camera is kept, so a
  creature that rises still grows; there is simply nothing making it rise.
- **A resize still restarts the creature** → unchanged by this work, and it becomes visible in the change
  that derives the tank from the box. Recorded there, not solved here.
