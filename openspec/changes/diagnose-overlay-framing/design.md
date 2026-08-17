## Context

The overhead camera is fitted so the tank's floor rectangle exactly fills the window, plus five percent of
room, and that fit is checked by projecting the tank's corners at four aspect ratios over three tank shapes.
The check passes. The creature still leaves the window.

The two are not in conflict. The camera is placed a fixed distance above the floor and aimed straight down,
so the rectangle it frames is the floor plane. The creature does not lie in that plane: its body rides above
the floor, closer to the camera, where less of the world fits. The visible rectangle therefore narrows with
height, and the five percent of room runs out at roughly two units of body height. Above that, the strip
along each wall is outside the window while still inside the tank.

That is a hypothesis, not an observation. The competing hypothesis is that the creature leaves the tank. The
physics side has already been measured once: a 90-second grounded run recorded a closest approach of 0.81
units to any wall with nothing leaving. Taken together with a drawn boundary, that measurement is what makes
a single picture decisive.

Separately, the simulation runs entirely in the browser. Restarting the server leaves it untouched, so the
only reset today is a page reload, and every observation costs a fresh run from an uncontrolled start.

## Goals / Non-Goals

**Goals:**

- Make the region the creature is confined to visible in the same frame as the creature.
- Decide, from one observation, whether the camera or the physics is why the creature leaves the window.
- Restart the creature at its start position without reloading the page.
- Leave a live stream looking exactly as it does today unless a diagnostic flag is asked for.

**Non-Goals:**

- Changing the camera fit. That is the fix this change exists to justify or rule out.
- Changing the contact model, the tank geometry, or anything else in the physics.
- The overlay box resize and reposition work, which is a separate change.
- Steering, which is the reason the creature reaches a wall at all and is tracked separately.
- Any viewer-facing feature. Neither the outline nor the reset is for an audience.

## Decisions

**The outline is drawn from the bounds the physics publishes, not from the store's tank dimensions.**
The driver publishes its tank bounds after every build, and the camera is already fitted from those same
bounds. Drawing from the same source means the line cannot disagree with either the physics or the camera.
Deriving the rectangle independently from the width, height and depth values would introduce a third opinion,
and a diagnostic that can be wrong about the thing it is measuring is worse than no diagnostic.

**The floor rectangle is drawn, not the full box.**
Overhead, the camera fits the floor, so the floor rectangle is the exact shape the fit claims to frame.
Drawing it puts the claim on screen: the rectangle should sit just inside the window edge with a small
margin. The twelve edges of the full box were rejected because the top four project outward under
perspective, and a line that is expected to fall outside the window cannot be read as evidence that
something has fallen outside the window.

**The reading is unambiguous only because the physics side is already measured.**
A creature appearing outside the drawn floor line has two possible causes: it left the tank, or it is above
the floor near a wall and perspective carries it outward. The existing containment check settles the first,
so the outline settles the second. Where the outline and the containment check disagree, the follow-up is a
second rectangle drawn at body height rather than a guess; that is deliberately not built now, because
building both would be speculating about which one is needed.

**The outline is switched on by a flag in the hash, defaulting off.**
The hash already carries the rig and an inspect flag, and a browser source never navigates, so a flag read
once at load is enough. It is a separate flag rather than the existing inspect flag because inspect turns on
orbit controls and a black background, which are wrong on a stream, whereas the outline must be observable
in the real overlay to be worth anything.

**The reset is a counter in the store that the staleness check reads, not a value inside `SimConfig`.**
The simulation already rebuilds when a structural value changes, and a rebuild restarts the creature at its
start position, so a reset is a forced rebuild and needs no new mechanism. The counter is kept out of
`SimConfig` because `SimConfig` is what makes a preset reproducible and what is persisted; a nonce inside it
would make two identical presets compare unequal and would persist a reset as though it were configuration.
Toggling the tank off and on again was rejected: it rebuilds twice and puts the creature briefly in an
unbounded world.

**The reset is exposed on the existing read-only observation handle.**
The overlay already installs a handle reporting world state and channel. Adding reset there keeps every
diagnostic in one place and makes a reset scriptable from the harness. It stays out of the platform protocol
because a chatter resetting the creature is a game design decision nobody has made.

## Risks / Trade-offs

- A diagnostic flag that reaches a live stream would draw a line across the overlay. → The flag defaults off
  and is read from the hash, so the line appears only where it was explicitly asked for.
- The observation handle becomes able to change the world, where before it only reported. → The change is
  confined to a reset, which destroys no data and is indistinguishable from a page reload in its effect.
- A forced rebuild throws away the running simulation. → That is what a reset means; the cost is stated
  rather than mitigated.
- The outline may show that neither hypothesis is right. → That is a successful outcome for a diagnostic, and
  the change is scoped so that neither the camera nor the physics has been touched in anticipation.

## Open Questions

None. The camera fix and the resize both depend on what this change observes, and neither is specified here.
