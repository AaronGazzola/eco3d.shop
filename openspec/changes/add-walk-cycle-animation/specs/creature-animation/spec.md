## ADDED Requirements

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

### Requirement: Angles are clamped to the rig's angle caps

Every joint angle the runtime returns SHALL be clamped to that joint's `effectiveAngleCaps`: yaw to `[-yawBack, +yaw]` (with `yawBack` defaulting to `yaw`) and pitch to `[-pitchDown, +pitchUp]`. An authored or interpolated pose SHALL never drive a joint past its cap.

#### Scenario: Over-cap pose is clamped

- **WHEN** a keyframe specifies a joint yaw greater than that joint's `yaw` cap
- **THEN** the runtime returns the joint at exactly the cap, not beyond

### Requirement: AnimatedDragon renders the posed skeleton

A component `app/game/AnimatedDragon.tsx` SHALL render a rig animated by a cycle. It SHALL walk `flattenSkeleton(buildSkeletonTree(groups))`, wrap each body group in a pivot `<group>` positioned at the joint's node anchor (axial joints at `nodeBack`/`nodeFront`, legs at `nodeHipLeft`/`nodeHipRight` off `attachedToSpineId`) whose rotation is set each frame from the runtime pose via `useFrame`, and render the same merged per-group meshes as `StaticPosedModel`. A leg whose `attachedToSpineId` does not resolve SHALL render at the model root and log a `console.error`. Multiple `AnimatedDragon` instances SHALL be renderable in one scene.

#### Scenario: Joints follow the cycle each frame

- **WHEN** `AnimatedDragon` plays the `walk` cycle
- **THEN** each axial and leg joint rotates about its node anchor following the runtime pose, within its angle caps, and loops

#### Scenario: Multiple creatures in one scene

- **WHEN** several `AnimatedDragon` instances render in the same canvas
- **THEN** each animates independently without a physics solver

### Requirement: Walk cycle

A built-in `walk` cycle SHALL exist as authored keyframes producing a readable walking motion: legs stride in an alternating gait and the axial chain sways, authored in place (no world translation). It SHALL loop seamlessly and read at small render sizes.

#### Scenario: Walk plays as a loop

- **WHEN** the `walk` cycle plays on a rig with legs
- **THEN** the legs alternate in a stride, the body sways, the motion loops seamlessly, and the root does not translate across the world
