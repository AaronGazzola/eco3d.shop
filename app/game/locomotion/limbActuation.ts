import RAPIER from '@dimforge/rapier3d-compat'

export const DUTY_STANCE = 0.77

export function phaseToTarget(
  phi: number,
  capStance: number,
  capSwing: number,
  dutyStance: number = DUTY_STANCE
): number {
  const TWO_PI = Math.PI * 2
  const wrapped = ((phi % TWO_PI) + TWO_PI) % TWO_PI
  const phiStanceEnd = TWO_PI * dutyStance
  const span = capStance + capSwing
  if (wrapped < phiStanceEnd) {
    const t = wrapped / phiStanceEnd
    return capStance - span * t
  }
  const t = (wrapped - phiStanceEnd) / (TWO_PI - phiStanceEnd)
  return -capSwing + span * t
}

export interface SingleHipWorld {
  pelvis: RAPIER.RigidBody
  thigh: RAPIER.RigidBody
  joint: RAPIER.RevoluteImpulseJoint
  capStance: number
  capSwing: number
}

const THIGH_LENGTH = 2
const THIGH_RADIUS = 0.25

export function buildSingleHipWorld(
  world: RAPIER.World,
  capStance: number,
  capSwing: number
): SingleHipWorld {
  const pelvisDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
  const pelvis = world.createRigidBody(pelvisDesc)

  const thighCenterX = THIGH_LENGTH / 2
  const thighDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(thighCenterX, 0, 0)
  const thigh = world.createRigidBody(thighDesc)
  const halfHeight = Math.max(THIGH_LENGTH / 2 - THIGH_RADIUS, 1e-3)
  const capQ = new RAPIER.Quaternion(0, 0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4))
  const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, THIGH_RADIUS)
    .setRotation({ x: capQ.x, y: capQ.y, z: capQ.z, w: capQ.w })
    .setMass(1)
  world.createCollider(colliderDesc, thigh)

  const jd = RAPIER.JointData.revolute(
    { x: 0, y: 0, z: 0 },
    { x: -thighCenterX, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }
  )
  const joint = world.createImpulseJoint(jd, pelvis, thigh, true) as RAPIER.RevoluteImpulseJoint
  joint.setLimits(-capSwing, capStance)
  joint.configureMotorModel(RAPIER.MotorModel.ForceBased)

  return { pelvis, thigh, joint, capStance, capSwing }
}

export function singleHipAngle(thigh: RAPIER.RigidBody): number {
  const q = thigh.rotation()
  return 2 * Math.atan2(q.y, q.w)
}
