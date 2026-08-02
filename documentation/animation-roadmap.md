# Animation roadmap

Last settled 2-Aug-2026. Five stages from a still creature to one that navigates to a
target. `animation-criteria.md` governs how each stage may be built; this file says what
gets built and how each stage is proved.

Each stage ships one observable behaviour, verified visually before the next stage starts.
No stage is styled until its success test passes.

**Stage 1 — Swim**

- Build the oscillator network from the reference extraction.
- Drive the axial chain from the oscillator, with limbs folded.
- Expose drive as the single control, setting both frequency and amplitude.
- Success: the body undulates head to tail and travels forward, watched in the studio.
- This stage carries no foot constraints, so the geometric law does not apply.

**Stage 2 — Plant**

- Add footholds: two feet planted at a time, frozen in world space.
- Solve the body placement from the planted feet each frame.
- Measure advance per cycle and record the number.
- Success: no planted foot moves across a full cycle.
- This stage answers the two unproven questions in the criteria.
  - Whether net advance per cycle is large enough to read as walking.
  - Whether a foothold can always be chosen that stays reachable for a full stance.
- If advance per cycle is negligible, stop and reassess before Stage 3.

**Stage 3 — Walk**

- Couple stance and swing timing to the oscillator phase, in a diagonal pattern.
- Choose each foothold ahead of its stance, against the hip's computed future path.
- Lift and sweep the swing leg between footholds.
- Success: the creature advances by its own wave, with zero foot slide, at a steady speed.
- The provisional section of the criteria is confirmed or rewritten here.

**Stage 4 — Turn**

- Bias stride length between the left and right sides.
- Let the head lead the turn.
- Success: heading changes while every foot stays planted through its stance.

**Stage 5 — Navigate**

- Steer toward an arbitrary target and decelerate to a stop on arrival.
- Success: the creature reaches a clicked point in the studio and holds still.

**Out of scope**

- Idle, eating, sleeping and every other non-locomotor behaviour.
- Species other than dragons.
- Habitat and stream-overlay integration, including any frame budget.
