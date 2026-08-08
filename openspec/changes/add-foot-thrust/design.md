# Design — foot thrust (Phase D-T1)

## The seven decisions, and why each one is what it is

### 1. A force, never a constraint

This is the whole reason the change exists. The grip pin was a `connect` equality tying a foot to a world anchor. The solver enforces equalities by removing degrees of freedom, so the joints the muscles were driving lost authority and the traveling wave collapsed into a standing wave. Thrust is written into `xfrc_applied`, which the solver folds into the generalized forces alongside the muscle torques. It removes nothing and overrides nothing.

**Consequence to verify, not assume:** peak joint angle as a fraction of cap must be unchanged between the swim baseline and the thrust run. If it moves, the claim "the wave is untouched" is false and the change is wrong.

### 2. Clocked from the limb CPG girdle phase

Rejected alternative: deriving the push window from the foot's measured fore/aft velocity. That was initially recommended on the grounds that the grip work failed on phase alignment — **that premise was wrong**. The timing was verified good: with grip switched off, the windows were confirmed opening at max-forward reach and closing at max-backward. Timing was never the failure.

So the existing clock stays: `girdleClockPhase(state, spec, limbIdx)`, the same function the grip windows used. This keeps one clock in the system, keeps the push predictive rather than reactive, and keeps the diagonal-couplet phasing that already emerges for free.

### 3. Magnitude proportional to backward sweep rate

Under the established convention, `rel = (phase − shift) mod 1` has `rel = 0` at max-forward reach and `rel = 0.5` at max-backward. The foot's fore/aft offset therefore varies as `cos(2π·rel)`, so its **backward** rate varies as `sin(2π·rel)`: positive across the whole back stroke, zero at both turning points, peak at mid-stroke.

```
w = max(0, sin(2π · rel))
```

Half-rectification makes the push exactly zero on the forward stroke without a separate on/off window, and the shape is the retraction rate itself rather than an approximation of it. A square window was rejected: it steps the force discontinuously at the window edges, which is both a solver shock and a visual tick.

### 4. Direction: the hip segment's forward axis, negated

Rejected alternative: pushing along a body heading. The body has no heading — heading is emergent (Decision 4), and inventing one would make the mechanism reach outside the local frame. The hip segment's own `+x` in world is always defined, is already computed the same way in the drag loop, and sweeps naturally with the wave.

```
f̂ = hipBody local +x, in world, from xquat
F = −gain · w · f̂        (applied at the leg body)
```

Summed over a stroke with equal gains, the sideways components of the four pushes cancel and the net is straight ahead — which is why D-T1 expects no heading drift. Unequal gains leave the cancellation incomplete, which is where D-T3's turning comes from, with no new mechanism.

### 5. Applied to the leg body, not the girdle

Applying at the girdle would bypass the hip servo entirely and remove any risk of exciting it. It would also destroy the lateral lever arm, and that lever arm is precisely what turns a backward force into a yaw torque. Turning is a requirement two iterations away, so the offset is kept and the servo risk is **measured** instead: roll reversals per second is the buzz detector, already reported by the harness.

`xfrc_applied` acts at the body's centre of mass, so the effective lever arm is the leg's mid-point rather than the foot. That retains most of the offset and needs no site-force machinery.

### 6. Signed gain

Braking is the same term with the sign flipped, so Phase D-T4 needs no schema change and no second code path. The gain is a force in newtons at peak sweep, defaulting to `0` — with the default, every existing config and shared link behaves byte-for-byte as before.

### 7. MuJoCo only, this change

Three reasons, in order of weight:

- The legs are **genuinely rigid** there — measured sweep 0.00 rad at both caps under calm servo gains. Under Rapier the motors behave as springs and the legs are compliant, which would blur the thing being measured.
- Drag covers **spine segments only** under MuJoCo (it covers spine *and* legs under Rapier). So under MuJoCo every unit of foot-derived impulse is cleanly attributable to the new term.
- Narrowness. Two engines means two tunings and two sets of gates for one unproven idea.

## Risk this change is explicitly designed to expose

Adding thrust on top of drag raises speed, and higher speed makes the visible slide **worse**, not better. The measurement is unambiguous: current speed 1.03 u/s is already near the fore/aft slip optimum (mean residual 0.52 u/s at 1.03, worsening to 0.66 at 1.35), because the front girdle wants 0.80 and the hind wants 1.64.

So the gate is **not** "less slip". The gate is **coupling at unchanged speed**: the feet take over as the source of the motion without the creature going faster. That is why the tasks tune the gain and the drive together, and why mean speed is a pass condition rather than an observation.

## Impulse accounting without inventing a heading

The runtime accumulates the applied impulse from each source as a **vector**, in world coordinates, and reports the components. It does not project onto any forward direction, because doing so would require the heading this design refuses to define. Projection onto the actual travel direction happens offline, in analysis, where the travel direction is a measured output rather than an input.

## Rejected outright, recorded so it is not re-proposed

- **Root transposition / velocity correction.** Measured: 29% of slip removed, speed halved, 5.6 deg/s yaw wobble demanded. Needs a forward direction as an input, which does not exist.
- **Planting as a goal.** 36% of foot motion is sideways and uncancellable by any body translation; the two girdles demand speeds differing 2 to 1. No single body velocity plants both.
- **Grip in any form.** A constraint competes with the muscles for the same joints.
