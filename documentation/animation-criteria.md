# Animation criteria

Last settled 2-Aug-2026. The fixed context for every animation decision on this project.
Read this before proposing, specifying or implementing anything to do with creature motion.
Nothing here is open for re-litigation without an explicit decision from the owner.

**Purpose**

- Creatures must read as alive while moving around a habitat.
- Motion must look grounded: driven by the body, not authored on top of a sliding root.
- One creature at a time, in the admin studio, is the only current target.
  - Solve cost is irrelevant for now.
  - A frame budget arrives with the habitat and the stream overlay, later.

## Substrate invariants

- The node skeleton is the authoring surface, and the only thing animation moves.
- 3D meshes are passengers.
  - Segments are assigned to groups and rendered relative to the node skeleton.
  - Animation never touches a mesh directly.
  - No physical property is ever read from mesh art.
- One body group is one rigid bone.
  - Bone lengths are constant.
  - Nothing stretches at runtime.
- Hips are welded to their spine group at studio-placed offsets.
  - Moving the spine moves the hips.
- Limbs stay attached to their hips.
- The renderer reads only the node skeleton.
  - Whatever is written to the skeleton is the visual.
- Any rig works.
  - Variable spine counts and segment lengths.
  - The same head, spine, tail topology, with legs on hip sockets.
  - Nothing hard-coded per model.

## Fixed physical constraints

- The skeleton conforms to a printable model and cannot gain joints.
- Legs are single rigid segments.
  - Legs cannot be split.
  - Legs cannot stretch.
  - A foot is always a fixed distance from its hip.
- The body cannot bob, pitch or roll. The model sits flat on the ground.
- Angle caps are stored, never read, never enforced.

## The geometric law

**The two things that decide where the creature appears**

- The shape of the body: how much each spine joint is bent. The oscillator decides the shape.
- The placement of that shape in the world: forward, sideways, and heading.
  - Placement is three numbers, because the model sits flat.
  - Height, pitch and roll are fixed and cannot vary.
- The oscillator gives the shape. The placement is what remains to be solved.

**Why a planted foot removes only one degree of freedom**

- Pinning a point in space normally removes three degrees of freedom.
- A planted foot removes one, because the leg rotates two ways at the hip.
  - The foot can sit anywhere on a sphere of leg-length radius around the hip.
  - Whatever direction the hip lies from the planted foot, the leg points that way.
  - The two hip rotations absorb two of the three constraints.
- Only the distance between hip and planted foot is constrained.
  - The distance must equal the leg length, always.
  - That is one equation, not three.

**What the count forces**

```
+--------------+-------------------+---------------------------------+
| Feet planted | Freedom remaining | Consequence                     |
+--------------+-------------------+---------------------------------+
| 0            | 3                 | nothing anchors the body        |
| 1            | 2                 | body swings freely about a foot |
| 2            | 1                 | exactly one way left to move    |
| 3            | 0                 | body frozen, cannot advance     |
| 4            | over-constrained  | feet must slide                 |
+--------------+-------------------+---------------------------------+
```

- Two planted feet is the only count that anchors the body and still permits motion.
- A diagonal pair is the natural choice, matching a lizard's trot.

**Where forward motion comes from**

- One degree of freedom remains while two feet are down.
- The oscillator changes the body shape every frame, which moves both hips.
- The placement must keep changing so both hips stay at leg length from their planted feet.
- That forced adjustment is the forward motion.
  - Motion is computed, never authored.
  - The wave pushes the creature along, because no other placement satisfies the geometry.
- Backward slip is impossible, because a planted foot cannot move.

**Where the difficulty actually sits**

- Each hip must sit on a circle around its planted foot.
  - The circle's radius is set by leg length and hip height.
- The two hips sit some distance apart, and that distance changes as the body bends between the girdles.
- A valid placement exists whenever the hip separation falls inside the span the two circles allow.
- That span is wide, so the constraint is loose at any single instant.
- The binding moment is the moment of planting, not the middle of a stance.
  - A new foothold must stay reachable for the whole stance to come.
  - The oscillator is periodic and known ahead, so a hip's future path is computable before the foot lands.
- The lever is therefore foothold choice, decided ahead of the stance.
  - Amplitude reduction is the fallback, never the mechanism.
  - This section is provisional until Stage 3 proves the numbers.

**What is still unproven**

- Whether net advance per cycle is large enough to read as walking.
- Whether a foothold can always be chosen that stays reachable for a full stance.
- Both are answered at Stage 2, by measuring advance per cycle before any styling.

## Rules

**Sources**

- Every equation, coupling and constant comes from `reference/locomotion-reference.md`, never from memory.
- Where the reference and any other document disagree, the reference wins.
- A value that cannot be read from the paper is flagged, never invented.

**Approach**

- The oscillator drives all locomotion. Locomotion is never authored keyframes.
- Locomotion is solved kinematically. No physics engine, no simulated contact, no friction solver.
  - A closed-form force expression evaluated once per frame is permitted.
  - Integrating a body under accumulated forces is not.
- A planted foot is an input, never an output. Zero slide.
- Forward advance is an output of the wave, never an independent slide.
  - On land, advance comes from the planted-foot geometry.
  - In water, advance comes from a per-frame thrust expression: each segment's sideways
    velocity contributes thrust, the sum sets speed. Speed therefore emerges from wave
    shape, and a faster or deeper wave swims faster without further tuning.
- Footholds are chosen ahead of each stance, against the known future path of the hip.

**Process**

- One lever changes at a time, verified visually before the next change.
- Every claim about behaviour is backed by an observation, never by reading the code.
- A rejected approach is recorded here once and never re-proposed.

**Scope**

- Swimming, then walking, then navigation. Nothing else.
- Not idle, not eating, not sleeping, not other species.

## Settled, do not revisit

- Physics engines are not returning.
  - Both engines were tried; contact was derived from forces, and gripping never worked.
- Leg-reach workarounds are void.
  - Splitting a leg is void.
  - Stretching a leg is void.
  - Absorbing reach error by bobbing the body is void.
- Angle caps are not coming back.
- Keyframe pose cycles are never the locomotion path.
  - The runtime and the Animate studio exist and are left in place.
  - Any future use is limited to cycles that never translate the body.

## What has been tried

- Node-chain procedural animation, Feb-2026.
  - Feet found ground contact; the body had no undulation.
  - Stopped because motion read as a chain being dragged.
- Constraint solver with spine chains and foot anchoring, May-2026.
  - Closest prior art to the current direction.
  - Stopped when replaced by the oscillator and physics model.
- Oscillator with physics, May-2026 to Jul-2026.
  - Swimming worked, driven by simulated drag.
  - Walking never worked; feet would not grip and drive the body.
- Keyframe pose cycles, Aug-2026.
  - Runtime, studio and persistence all work.
  - Rejected for locomotion: the body slides independently of the feet by construction.

Prior implementations are recoverable from git history. Recover to read, never to resume.
