# Design — CPG swim

## Network sizing

The paper runs 25 axial segments, each with a left and a right oscillator, plus 4 limb
oscillators. Our rigs carry a head, a variable number of spine groups, and a tail — the
Demo Dragon rig has 11 axial groups, giving 10 joints.

The network is therefore sized from the rig: one oscillator pair per axial joint, indexed
head to tail. Limb oscillators are created but held silent for this stage.

The intersegmental phase bias in the paper is `+0.066·2π` per segment rostrocaudally, which
across 25 segments produces roughly one full body wave. Applying that per-segment value to
10 joints would produce a fraction of a wave. The bias is therefore scaled so total lag
head to tail is preserved:

```
biasPerJoint = paperBiasPerSegment * (paperSegmentCount - 1) / (jointCount - 1)
```

Weighting by segment length rather than joint index is deferred: segment lengths vary
modestly within a rig and uniform scaling is the simpler first cut. If the wave reads
unevenly on rigs with very uneven spine spacing, length weighting is the first thing to try.

## What the oscillator emits

Each axial joint has a left and a right oscillator. Each emits a one-sided activation
`xᵢ = rᵢ(1 + cos θᵢ)`, always non-negative. The signed bend at a joint is the difference of
the pair, scaled to radians by a single gain:

```
bendᵢ = gain * (xᵢˡ - xᵢʳ)
```

The gain is a tuning constant, not a paper value: the paper converts activation to torque
through muscles, and we convert it to an angle directly. The gain is exposed in the studio.

Bend maps to the pose's `yawRad` for each axial group. `pitchRad` stays zero for this
stage: the paper's axial joints are restricted to the horizontal plane, and the body sits
flat.

## Pose-source seam

`AnimatedDragon` already evaluates a pose each frame and writes joint rotations to the
pivot chain through refs. Only the source of that pose is specialised to keyframes.

The component gains an optional `poseSource` prop: a function called once per frame with
the frame delta, returning a `Pose`. When absent, the existing cycle behaviour is used
unchanged, so the Animate studio is unaffected. When present, the cycle is ignored.

This keeps one renderer and one pivot chain for both systems, and means the leg attachment
and hip anchoring already verified for keyframes carry over to locomotion without a second
implementation.

## Swimming thrust

Thrust is a closed-form expression evaluated once per frame, never an integrated force:

```
for each axial segment:
  vLateral = component of that segment's velocity perpendicular to its own axis
  thrust  += k * vLateral * segmentLength
speed = thrust / totalDrag
root  += heading * speed * dt
```

Segment velocity is the frame-to-frame change in that segment's midpoint, in body space.
`k` and `totalDrag` are two tuning constants exposed in the studio. Speed therefore rises
with both wave frequency and wave amplitude without either being fed in directly, which is
what keeps advance an output of the wave.

Heading is fixed forward for this stage. Turning is Stage 4.

## Why the oscillator is integrated, not sampled

The oscillator carries state: phase and amplitude both converge over time, and the
travelling wave is a property of the coupled network settling. It cannot be evaluated at an
arbitrary phase the way a keyframe cycle can. The driver therefore steps the network by the
frame delta and holds state across frames, and the pose source is stateful.

This is the one behavioural difference from the keyframe runtime, and the reason the seam
passes a delta rather than a phase.

## Studio placement

Locomotion gets its own step rather than a mode toggle inside Animate. The two systems have
different inputs, different state and different rules, and the criteria are explicit that
keyframe cycles are never the locomotion path. A separate step keeps that visible.

The step requires groups to exist, like the Animate step. It does not require a saved rig,
because nothing in this change is persisted.

## Deferred

- Limb oscillators exist but stay silent. Their coupling to the axial chain is Stage 3.
- Proprioceptive feedback is omitted, per the paper's own in-vivo runs.
- Drive random-walk noise is omitted, for the same reason.
- Differential drive across the body is Stage 4.
