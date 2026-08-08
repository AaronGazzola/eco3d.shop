# Design — wave shaping (Phase D-T2)

## The sampling defect, and why it comes first

`buildCpgSpec` builds the axial chain at `CPG_AXIAL_SEGMENTS = 25` regardless of how many joints the body
has (paper Fig 2A: a 25-segment CPG mapped onto an 8-joint robot). `oscOfSegment[i]` is the fine
oscillator that body segment `i` should read, computed from the segment's fractional arc position.

- Rapier remaps: `for (const jt of body.joints) jt.cpgSegment = spec.oscOfSegment[jt.cpgSegment]`.
- MuJoCo does not. `mjcf.ts` sets `childIndex: i` (a body index, and its own comment says so),
  `mujocoRuntime.ts` stores it as `k`, and the spine loop calls `oscillatorOutput(state, sp.k)` — a fine
  index — on it.

For the 11-segment rig the body reads fine oscillators 0–10 instead of the arc-correct 2–22. It sees
10 of the 24 phase-bias intervals, so the wave held on the body is `10/24 × 1.58 = 0.66` body waves
rather than 1.58, and the joints bunch into the head end of the chain.

A five-point profile is indexed by position along the spine. On the broken mapping, "position along the
spine" and "position along the CPG chain" disagree by more than a factor of two, so a control point
placed at the hind girdle would land near the mid-body. The fix is a precondition, not a tidy-up.

**Measurement note, stated honestly.** The defect is established from the code, which is unambiguous. It
is *not* cleanly confirmed by the captures: measuring per-joint phase lag on the baseline gives 0.711
cycles across joints 1–9, between the 0.53 predicted for the broken mapping and the 0.92 for the fixed
one. That measurement cannot discriminate, because a joint angle is a *loaded mechanical response* — the
servo tracks the commanded equilibrium angle with load-dependent lag, and body inertia and drag shift it
further. The commanded signal, not the resulting angle, is what would settle it. This is recorded so no
one later reads the phase-lag number as evidence either way.

## What the profile multiplies: drive, not the muscle command

Two places could carry the multiplier.

- **Drive, inside `stepCpg`.** Decision 11 says "drive multiplier", and the paper already drives by
  region. Amplitude follows because `R = d·P(d, d_th)` and the forward regime sits well below the axial
  threshold, so `P ≈ 1` and `R ≈ d`.
- **The muscle command, at the sampling point.** Simpler, and provably cannot perturb the CPG's phase
  dynamics, but it is not what the locked decision says and it is a further deviation from the paper.

**Chosen: drive.** It is the locked decision and the paper-faithful one. The known cost is that
`ν = d·e` too, so a region with a lower multiplier has a lower *intrinsic* frequency. This does not
produce two frequencies in the body — the couplings entrain the chain to one — but it is supplied by the
oscillators settling off their preferred phase offsets, which distorts the phase lag. That distortion is
a measurable prediction: if the wave's head-to-tail travel changes as the profile flattens, this is why.
The muscle-side variant is the fallback, to be built only if the measurement shows the distortion matters,
and only presented with numbers beside it.

## Why a low multiplier does not scale amplitude proportionally

Under MuJoCo the spine target is the Ekeberg equilibrium angle, not a torque:

```
φEq = α(mL − mR) / [β(mL + mR + γ)]
```

Scaling both activations by `c` does not scale `φEq` by `c`, because the tonic `γ` does not scale. As
`c` grows the expression saturates toward `α(mL−mR)/[β(mL+mR)]`; as `c → 0` it falls off linearly. So the
profile's response is **compressive at the top and linear at the bottom**: cutting a hot region from 1.0
to 0.7 will move it less than 30%, and the tuning should expect to overshoot rather than assume linearity.

## Head isolation: what it does and does not do

At `c = 0` the head oscillators have `R = 0` and `ν = 0`, so `mL = mR = 0` and `φEq = 0` exactly. Under
MuJoCo that is **not** a limp head: the joint is a position servo commanded to zero, so it is actively
held straight against the body's motion at the MJCF gain. (Under Rapier's Ekeberg-torque path the same
setting would leave the head slack, held only by the tonic `γ` stiffness — one more reason head isolation
is scoped to MuJoCo.)

Two things follow, and the second must not be over-claimed:

- The head stops contributing its own bend to the wave. Its oscillators also fall to zero amplitude, so
  by the `rⱼ` factor in the coupling term they stop pulling on their neighbours — the head leaves the
  network rather than being muted inside it.
- **The head still yaws in world space**, because it is now rigid to the neck and the neck still waves.
  Isolation removes the head's *own* contribution; it does not stabilise the head against the body.
  Making the head hold a world direction is the aiming layer, and it is deliberately not in this change.

Isolation is implemented as its own switch rather than as the profile's first control point, because
linear interpolation cannot deliver it. On this rig the head segment's centre sits at arc 0.083 while the
next control point is at 0.25, so a control point of 0 at position 0 leaves the head joint at roughly a
third of full drive. Decision 11 says "excluded from the wave outright rather than damped" — a ramp is
damping, so the exclusion is explicit.

## Control point placement

Five control points at normalised arc positions **0, 0.25, 0.5, 0.75, 1.0** along the fine chain,
linearly interpolated, evaluated per oscillator at `k/(n−1)`.

Defining them on arc position keeps them rig-general. On the current rig they also land on the anatomy:
the front girdle sits at arc **0.254** and the hind girdle at **0.506**, so control points 2 and 3 fall
almost exactly on the two girdles. That matters for §6 metric 2, whose gate is that the two girdles
rotate by about the same amount — it is dialled directly by those two control points against each other.
Control points 4 and 5 both sit in the tail, which is correct for this rig: half the body's arc length
lies behind the hind girdle, and that long tail is the 2.4× swing being brought down.

Every multiplier defaults to **1.0**, which reproduces today's behaviour exactly, so the levers are
provably inert until set.

## Measuring metric 2

The gate is per-joint peak angle as a fraction of **its own** cap. Local by construction, so it survives
turning, and it is the same quantity the cap limit uses — "as high as possible without clipping" becomes
one number. Evenness is the spread across joints; girdle equality falls out of comparing the two girdle
joints. The harness already reports this per joint and by girdle distance; what it lacks is the spread,
the explicit front-versus-hind pair, and the head sweep.

The secondary measure — what actually reads as pronounced on screen — is each node's sideways travel
against a **fitted curved centreline** rather than a straight axis. A straight axis mixes the body's own
curvature into the swing and stops meaning anything once the body turns, which is why the fit is curved.
