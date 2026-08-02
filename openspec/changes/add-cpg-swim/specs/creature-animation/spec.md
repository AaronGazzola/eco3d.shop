## MODIFIED Requirements

### Requirement: AnimatedDragon renders the posed skeleton

A component `app/game/AnimatedDragon.tsx` SHALL render a rig animated by a pose. It SHALL walk `flattenSkeleton(buildSkeletonTree(groups))`, wrap each body group in a pivot `<group>` positioned at the joint's node anchor (axial joints at `nodeBack`/`nodeFront`, legs at `nodeHipLeft`/`nodeHipRight` off `attachedToSpineId`) whose rotation is set each frame via `useFrame`, and render the same merged per-group meshes as `StaticPosedModel`. A leg whose `attachedToSpineId` does not resolve SHALL render at the model root and log a `console.error`. Multiple instances SHALL be renderable in one scene.

The pose SHALL come from one of two sources. When a `poseSource` is supplied, the component SHALL call it once per frame with the frame delta and use the returned pose, ignoring any cycle. When no `poseSource` is supplied, the component SHALL evaluate the supplied cycle as before. One pivot chain therefore serves both the keyframe runtime and the locomotion controller.

#### Scenario: Joints follow the pose each frame

- **WHEN** `AnimatedDragon` renders with either pose source
- **THEN** each axial and leg joint rotates about its node anchor following the pose

#### Scenario: A stateful driver poses the skeleton

- **WHEN** a `poseSource` is supplied
- **THEN** the source is called once per frame with the elapsed delta, and the cycle prop has no effect

#### Scenario: Existing keyframe playback is unchanged

- **WHEN** no `poseSource` is supplied
- **THEN** the component plays the cycle exactly as before, and the Animate studio is unaffected

#### Scenario: Multiple creatures in one scene

- **WHEN** several `AnimatedDragon` instances render in the same canvas
- **THEN** each animates independently without a physics solver
