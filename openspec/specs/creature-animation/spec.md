# creature-animation Specification

## Purpose
TBD - created by archiving change add-walk-cycle-animation. Update Purpose after archive.
## Requirements
### Requirement: Kinematic pose runtime with no physics

The animation runtime SHALL pose the skeleton purely kinematically, with no physics, IK, or simulation dependency. A module `app/game/animation.ts` SHALL expose a pure function that, given a cycle and a phase/time value, returns a pose. The module SHALL NOT import any physics, simulation, or randomness source (`@dimforge/rapier3d-compat`, `@react-three/rapier`, `@mujoco/mujoco`, `Math.random`, `Date.now`), so the same input yields the same output.

#### Scenario: Deterministic pose evaluation

- **WHEN** the runtime is evaluated for a given cycle at a given phase value twice
- **THEN** it returns identical poses both times

#### Scenario: No physics in the import graph

- **WHEN** the import graph of `app/game/animation.ts` is traversed
- **THEN** it contains no physics, simulation, or Rapier/MuJoCo module

### Requirement: Pose and cycle data model

A `Pose` SHALL be `{ root: { x, z, yawRad }, joints: Record<groupId, { yawRad, pitchRad }> }`. A `Cycle` SHALL be `{ keyframes: Pose[], speed: number, amplitude: number }`. The runtime SHALL play a cycle by advancing a looping phase, interpolating between adjacent keyframes, and scaling joint offsets by `amplitude` and playback rate by `speed`. With fewer than two keyframes the single keyframe (or rest pose) SHALL be returned unchanged.

#### Scenario: Looping interpolation between keyframes

- **WHEN** a cycle with two or more keyframes is played across a full phase period
- **THEN** the returned pose interpolates from the first keyframe through the others and back to the first, continuously and without discontinuity at the loop point

#### Scenario: Amplitude scales joint motion

- **GIVEN** two cycles identical except `amplitude`
- **THEN** the cycle with larger `amplitude` yields proportionally larger joint offsets from the rest pose at the same phase

### Requirement: Angle caps are not enforced

The runtime SHALL NOT clamp, read, or otherwise consult `angleCaps`. Realistic joint ranges are the author's responsibility, enforced by eye when posing keyframes rather than by the runtime. Stored `angleCaps` values SHALL be carried through the rig unchanged and ignored.

#### Scenario: A pose beyond a stored cap is honoured

- **WHEN** a keyframe specifies a joint yaw greater than that joint's stored `yaw` cap
- **THEN** the runtime returns the authored angle unmodified

### Requirement: AnimatedDragon renders the posed skeleton

A component `app/game/AnimatedDragon.tsx` SHALL render a rig animated by a cycle. It SHALL walk `flattenSkeleton(buildSkeletonTree(groups))`, wrap each body group in a pivot `<group>` positioned at the joint's node anchor (axial joints at `nodeBack`/`nodeFront`, legs at `nodeHipLeft`/`nodeHipRight` off `attachedToSpineId`) whose rotation is set each frame from the runtime pose via `useFrame`, and render the same merged per-group meshes as `StaticPosedModel`. A leg whose `attachedToSpineId` does not resolve SHALL render at the model root and log a `console.error`. Multiple `AnimatedDragon` instances SHALL be renderable in one scene.

#### Scenario: Joints follow the cycle each frame

- **WHEN** `AnimatedDragon` plays the `walk` cycle
- **THEN** each axial and leg joint rotates about its node anchor following the runtime pose, and loops

#### Scenario: Multiple creatures in one scene

- **WHEN** several `AnimatedDragon` instances render in the same canvas
- **THEN** each animates independently without a physics solver

### Requirement: Authored cycles never carry locomotion

An authored cycle SHALL NOT be used to move a creature through the world. Locomotion is driven by the oscillator and solved against planted feet, per `documentation/animation-criteria.md`. Authored cycles SHALL be limited to motion that leaves the creature where it stands. A built-in `walk` cycle SHALL exist as a default seed, serving as a worked example of the authoring surface and not as the locomotion path.

#### Scenario: A cycle leaves the creature in place

- **WHEN** any authored cycle plays through a full period
- **THEN** the creature ends where it began, having never translated across the world

