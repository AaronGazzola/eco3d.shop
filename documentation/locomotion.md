# Locomotion (project design)

This doc describes **how we apply the CPG model to our rig** — the rules, the skeleton
foundation, and the decisions specific to this project.

It deliberately contains **no equations and no parameter values**. Those live in exactly
one place:

> **`documentation/reference/locomotion-reference.md`** — the verified extraction of the
> source paper (Knüsel et al. 2020). It is the single source of truth for the animation
> math. If anything here ever appears to restate a formula or a number, the reference
> wins.

---

## 1. Rules

These hold for every rig, every pose, every frame. Code that violates one is broken.

1. **Bone lengths are constant.** Each body group is a rigid bone — its mesh never stretches.
2. **Hips are welded to the spine.** `nodeHipLeft` / `nodeHipRight` are fixed offsets in their owning spine group's local frame.
3. **One BodyGroup = one rigid bone.** To bend mid-piece, split into two groups in the studio — never at runtime.
4. **Nodes are the only authoring surface.** Animation moves studio-placed nodes only; it does not invent attach points or bypass the skeleton.
5. **Studio angle caps are sacred.** Every joint angle is clamped to its `angleCap` before being applied. Code may clamp tighter for a single frame; it never raises, overrides, or substitutes caps.
6. **Feet stay grounded during stance and lift smoothly during swing.** A foot never teleports. Its world position changes only via a swing arc between stance phases.

---

## 2. The model in one paragraph

The body is driven by a **central pattern generator** — a network of coupled phase
oscillators. A single scalar `drive` sets the speed; the oscillators produce a travelling
body wave and a leg-stepping rhythm that together make the creature walk. Turning comes
from biasing the drive across the body. Standing still is `drive = 0`. There is no solver,
no strain calculation, no inverse-kinematics goal-chasing — the pose each frame is a pure
function of the oscillator state. **All equations, couplings, and parameter values:** see
the reference doc.

---

## 3. The skeleton foundation (what we keep)

This is unchanged from the existing studio rig and is the base every step builds on:

- The creature is a **node skeleton positioned relative to the 3D model**. Each
  `BodyGroup` (head / spine / tail / leg) is a rigid bone carrying studio-placed node
  offsets (`nodeFront`, `nodeBack`, `nodeHipLeft/Right`, `nodeFoot`) and `angleCaps`.
- The structure is fixed but the **counts and lengths vary**: any number of spine
  segments, any bone lengths, the same overall head→spine→tail topology with legs on
  hip sockets. The animation code reads this topology; it is never hand-wired per rig.
- `buildCascadeChain` / `buildSkeletonTree` define the ordered chain (head → spines →
  tail) the oscillators attach to.
- Our rig is **kinematic**: we set joint angles directly. There is no physics engine.

---

## 4. How the paper maps to our rig (settled decisions)

| Studio / rig concept | CPG role |
|---|---|
| Each spine group in the chain | a **left + right** axial oscillator pair (the paper's double chain) |
| Hip socket (`nodeHipLeft/Right` + matching leg group) | one limb oscillator per leg |
| Group adjacency in the chain | axial neighbour coupling |
| Hip socket's parent segment | limb-to-girdle coupling target |
| `angleCap.yaw` | clamp on the final joint bend angle |
| `angleCap.yaw` / `angleCap.yawBack` on leg groups | leg rotation clamp (existing rig code) |
| `nodeFoot` rest offset | foot home position for stride placement |

**The one substitution from the paper.** The paper turns oscillator output into muscle
torque and runs a physics simulation. We are kinematic, so instead we map the segment's
left/right oscillator outputs directly to a **joint bend angle** (the left−right
difference), then clamp to the studio cap. This is the only place we depart from the
paper, and it is documented in the reference doc §4. Everything upstream — the oscillator
network itself — is built 1:1 from the paper.

`drive` is derived from the attractor (how far away it is). Turning is produced by
**differential drive** across the body, the paper's own mechanism (reference §6).

Adding a spine segment in the studio adds an oscillator pair. Removing a leg removes a
limb oscillator. Changing bone lengths changes the rendered geometry but not the
oscillator math. The same code path serves a snake (no limbs), a lizard, or a centipede.

---

## 5. Open decisions (to settle during the incremental build)

These are **not yet decided** and must not be assumed. Each is resolved and visually
verified in its own build step:

- **Attractor → drive curve** — the exact falloff/close-radius mapping.
- **Body reference frame** — drive/steer must be computed from a **stable body frame**
  (e.g. the root/tail segment), *not* the head's live forward vector. (Using the head
  caused a feedback loop in the previous attempt.)
- **Steering** — how the attractor's bearing maps onto a left/right (or front/back)
  drive split.
- **Foot world placement** — how a limb oscillator's phase becomes a planted-then-
  swinging foot position in the scene (the paper got this from physics; we place it
  kinematically).
- **Gait phase offsets** — the initial limb phases for our specific leg set; whether the
  tail participates in the body wave.

---

## 6. Sources

- **`documentation/reference/locomotion-reference.md`** — verified model; single source
  of truth for all math and parameters.
- **`documentation/reference/knusel-2020-salamander-cpg.pdf`** — the paper itself
  (Knüsel et al. 2020, *Frontiers in Neurorobotics* 14:604426). Open access.
</content>
