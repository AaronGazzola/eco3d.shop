## Context

Overlay boxes live on a 1080x1920 canvas as a position and one scale. `resizeFromCorner` moves the dragged
corner along the line from the opposite corner and converts that distance into a single scalar, which is
what makes aspect ratio impossible to violate. Position already works, for the game box as for every other.

The game is the one overlay for which a scale is not enough, because it is not a card whose pixels can be
stretched. It is a camera on a physics simulation, and the camera reframes on a genuine viewport change.
Stretching a 480 by 320 render gives it no more room and never triggers a reframe.

The overhead camera maps the tank's X across the window and its Z up the window, and it fits the tank's
floor. So the shape of the window and the shape of the tank floor are the same quantity seen twice, and
they are currently allowed to disagree.

## Goals / Non-Goals

**Goals:**

- Resize the game window to any width and height, and position it anywhere, on the stream canvas.
- Make the creature's world follow the window's shape, so a narrower window is a narrower tank.
- Let the streamer say how large the creature reads inside its window, independently of the window's size.
- Leave every other overlay's behaviour and every saved layout exactly as they are.

**Non-Goals:**

- Changing the OBS browser source. It is already the full canvas and Vids.Tube composes within it.
- The camera's headroom fault, where a creature at the glass can appear up to 13 pixels outside the drawn
  floor line. Deferred deliberately, and this change does not depend on it.
- Resolving whether the creature leaves its published bounds. Also deferred, and also independent.
- Scaling the creature. The rig is a physics body; changing its size changes mass and inertia.

## Decisions

**The box gains an optional width and height rather than a new box type.**
Only the game sets them. A box without them behaves exactly as it does now, which is what keeps saved
layouts loading and every other overlay untouched. A second box type would fork the container, the stage,
the validation and the persistence for one overlay.

**Free resize is a second function beside the uniform one, not a change to it.**
`resizeFromCorner` is correct for a card and is used by every other overlay. Free resize is a different
operation — two independent axes anchored at the opposite corner — so it is written as its own function and
selected by whether the box carries a width and height.

**The tank's floor takes the box's aspect, with the width set by the room figure.**
Tank width is a base of 60 units multiplied by the room figure, and tank depth is that width divided by the
box's aspect ratio. At the current 480 by 320 box and a room figure of 1 this yields exactly the 60 by 40
tank in use today, so the change begins as a no-op and every measured run stays comparable.

The consequence is that the room figure alone decides how large the creature reads across the window, and
reshaping the window changes how much room there is up the window without changing that. A rule where
reshaping also changed the creature's apparent size would make the two controls fight each other.

Tank height is left alone. Overhead framing was made independent of it deliberately, and a grounded
creature never uses the headroom.

**The room figure travels as an overlay setting, not as part of the box message.**
The box message is geometry the host measures; the room figure is a preference the streamer chooses. The
game already treats settings as an opaque object it maps rather than adopts, so an unknown key cannot break
it and a withdrawn key falls back to a default.

**The tank is resized when a drag ends, not while it moves.**
Tank walls are geometry inside the generated physics model, so a resize rebuilds it and the creature
restarts in the middle. Rebuilding on every pointer move would restart the creature continuously and make
the drag useless. This is a property of the engine and is stated rather than worked around.

## Risks / Trade-offs

- A saved layout has no width or height for the game box. → Absent values fall back to the current 480 by
  320, so an existing layout renders as it does today until the streamer resizes it.
- An extreme aspect produces an extreme tank, and a very deep tank is a long way for a creature to travel.
  → The derived dimensions are clamped, and the clamp is stated rather than silent.
- Every resize restarts the creature. → Applied on drag end, and the reset already built makes the restart
  reproducible rather than surprising.
- The creature may still leave the window after this change, because whether it leaves its bounds is
  unresolved. → Out of scope by decision; this change makes the tank match the window and claims nothing
  more.

## Open Questions

None.
