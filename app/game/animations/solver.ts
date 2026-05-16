import * as THREE from 'three'
import { CreatureConfig } from '../../page.types'
import { Chain3D } from '../chain3d'
import { DragonDrive } from './types'

export interface LimbState {
  joints: THREE.Vector3[]
  anchor: THREE.Vector3
  currentTarget: THREE.Vector3
  desiredTarget: THREE.Vector3
  plantPos: THREE.Vector3
  plantState: 'planted' | 'swinging'
  swingFrom: THREE.Vector3
  swingTo: THREE.Vector3
  swingT: number
  restOffsetFromIntent: THREE.Vector3
}

export interface IntentState {
  position: THREE.Vector3
  heading: THREE.Vector3
  velocity: THREE.Vector3
}

function makeLimb(): LimbState {
  return {
    joints: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    anchor: new THREE.Vector3(),
    currentTarget: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
    plantPos: new THREE.Vector3(),
    plantState: 'planted',
    swingFrom: new THREE.Vector3(),
    swingTo: new THREE.Vector3(),
    swingT: 0,
    restOffsetFromIntent: new THREE.Vector3(),
  }
}

export class Solver {
  config: CreatureConfig
  chain: Chain3D
  limbs: LimbState[]
  intent: IntentState

  constructor(config: CreatureConfig) {
    this.config = config
    const groundY = config.groundY ?? 0
    const bodyHeight = config.bodyHeight ?? 0.6
    const ox = config.chainOrigin?.x ?? 0
    const oy = config.chainOrigin?.y ?? (groundY + bodyHeight)
    const oz = config.chainOrigin?.z ?? 0
    const origin = new THREE.Vector3(ox, oy, oz)
    const segmentLengths =
      config.segmentLengths ?? Array(config.segmentCount - 1).fill(config.segmentLength)
    this.chain = new Chain3D(origin, config.segmentCount, segmentLengths, config.angleConstraint)

    let initialHeading = 0
    if (config.initialJoints && config.initialJoints.length > 0) {
      for (let i = 0; i < this.chain.joints.length; i++) {
        const ij = config.initialJoints[Math.min(i, config.initialJoints.length - 1)]
        const y = ij.y ?? oy
        this.chain.joints[i].set(ij.x, y, ij.z)
      }
      const j0 = this.chain.joints[0]
      const j1 = this.chain.joints[Math.min(1, this.chain.joints.length - 1)]
      initialHeading = Math.atan2(j0.z - j1.z, j0.x - j1.x)
      for (let i = 0; i < this.chain.angles.length; i++) this.chain.angles[i] = initialHeading
    }

    this.intent = {
      position: new THREE.Vector3(this.chain.joints[0].x, groundY, this.chain.joints[0].z),
      heading: new THREE.Vector3(Math.cos(initialHeading), 0, Math.sin(initialHeading)),
      velocity: new THREE.Vector3(),
    }

    const phaseScale = 0.4 * config.stepThreshold
    const PHASE_PATTERN: Array<{ x: number; z: number }> = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -0.5, z: -0.5 },
    ]

    this.limbs = config.limbNodes.map((limbNode, idx) => {
      const limb = makeLimb()
      const jointIdx = Math.min(limbNode.index, this.chain.joints.length - 1)
      const spineJoint = this.chain.joints[jointIdx]
      const nextJoint = this.chain.joints[Math.min(jointIdx + 1, this.chain.joints.length - 1)]
      const boneAngle = Math.atan2(nextJoint.z - spineJoint.z, nextJoint.x - spineJoint.x)
      const effectiveBoneAngle = (nextJoint.x !== spineJoint.x || nextJoint.z !== spineJoint.z)
        ? boneAngle
        : initialHeading

      if (limbNode.hipOffset && limbNode.parentRestAngle !== undefined) {
        const parentRot = limbNode.parentRestAngle + Math.PI - effectiveBoneAngle
        const cos = Math.cos(parentRot)
        const sin = Math.sin(parentRot)
        limb.anchor.set(
          spineJoint.x + limbNode.hipOffset.x * cos + limbNode.hipOffset.z * sin,
          spineJoint.y + limbNode.hipOffset.y,
          spineJoint.z - limbNode.hipOffset.x * sin + limbNode.hipOffset.z * cos,
        )
      } else {
        const halfWidth = limbNode.bodyHalfWidth ?? config.bodyHalfWidth
        const sideAngle = effectiveBoneAngle + (Math.PI / 2) * limbNode.side
        limb.anchor.set(
          spineJoint.x + Math.cos(sideAngle) * halfWidth,
          spineJoint.y,
          spineJoint.z + Math.sin(sideAngle) * halfWidth,
        )
      }

      if (limbNode.restFootOffset) {
        limb.plantPos.set(
          limb.anchor.x + limbNode.restFootOffset.x,
          groundY,
          limb.anchor.z + limbNode.restFootOffset.z,
        )
      } else {
        const reach = limbNode.limbReach ?? config.limbReach
        const sideAngle = initialHeading + (Math.PI / 2) * limbNode.side
        limb.plantPos.set(
          spineJoint.x + Math.cos(sideAngle) * reach,
          groundY,
          spineJoint.z + Math.sin(sideAngle) * reach,
        )
      }
      limb.currentTarget.copy(limb.plantPos)
      limb.desiredTarget.copy(limb.plantPos)
      limb.swingFrom.copy(limb.plantPos)
      limb.swingTo.copy(limb.plantPos)

      const phase = PHASE_PATTERN[idx % PHASE_PATTERN.length]
      limb.restOffsetFromIntent.set(
        limb.plantPos.x - this.intent.position.x + phase.x * phaseScale,
        0,
        limb.plantPos.z - this.intent.position.z + phase.z * phaseScale,
      )

      return limb
    })
  }

  apply(drive: DragonDrive, dt: number): void {
    const config = this.config
    const groundY = config.groundY ?? 0
    const bodyHeight = config.bodyHeight ?? 0.6
    const hipY = groundY + bodyHeight
    const frontIdx = config.hipJointFrontIndex
    const backIdx = config.hipJointBackIndex

    const tdx = drive.headTarget.x - this.intent.position.x
    const tdz = drive.headTarget.z - this.intent.position.z
    const tdist = Math.hypot(tdx, tdz)
    if (tdist > 0.05) {
      const step = Math.min(config.maxSpeed * dt, tdist)
      this.intent.position.x += (tdx / tdist) * step
      this.intent.position.z += (tdz / tdist) * step
    }

    for (const limb of this.limbs) {
      const refX = this.intent.position.x + limb.restOffsetFromIntent.x
      const refZ = this.intent.position.z + limb.restOffsetFromIntent.z

      if (limb.plantState === 'planted') {
        const drift = Math.hypot(limb.plantPos.x - refX, limb.plantPos.z - refZ)
        if (drift > config.stepThreshold) {
          limb.swingFrom.copy(limb.plantPos)
          limb.swingTo.set(refX, groundY, refZ)
          limb.swingT = 0
          limb.plantState = 'swinging'
        } else {
          limb.currentTarget.copy(limb.plantPos)
        }
      }

      if (limb.plantState === 'swinging') {
        limb.swingT += dt / Math.max(0.001, config.swingDuration)
        if (limb.swingT >= 1) {
          limb.plantPos.copy(limb.swingTo)
          limb.currentTarget.copy(limb.plantPos)
          limb.plantState = 'planted'
          limb.swingT = 0
        } else {
          const t = limb.swingT
          const lift = config.liftHeight * 4 * t * (1 - t)
          limb.currentTarget.set(
            limb.swingFrom.x * (1 - t) + limb.swingTo.x * t,
            groundY + lift,
            limb.swingFrom.z * (1 - t) + limb.swingTo.z * t,
          )
        }
      }
    }

    if (frontIdx === undefined || backIdx === undefined) return

    let newFrontX = 0, newFrontZ = 0, nFront = 0
    let newBackX = 0, newBackZ = 0, nBack = 0
    for (let i = 0; i < this.limbs.length; i++) {
      const ln = config.limbNodes[i]
      if (!ln) continue
      if (ln.index === frontIdx) {
        newFrontX += this.limbs[i].currentTarget.x
        newFrontZ += this.limbs[i].currentTarget.z
        nFront++
      } else if (ln.index === backIdx) {
        newBackX += this.limbs[i].currentTarget.x
        newBackZ += this.limbs[i].currentTarget.z
        nBack++
      }
    }
    if (nFront > 0) { newFrontX /= nFront; newFrontZ /= nFront }
    else { newFrontX = this.chain.joints[frontIdx].x; newFrontZ = this.chain.joints[frontIdx].z }
    if (nBack > 0) { newBackX /= nBack; newBackZ /= nBack }
    else { newBackX = this.chain.joints[backIdx].x; newBackZ = this.chain.joints[backIdx].z }

    const oldFrontX = this.chain.joints[frontIdx].x
    const oldFrontZ = this.chain.joints[frontIdx].z
    const oldBackX = this.chain.joints[backIdx].x
    const oldBackZ = this.chain.joints[backIdx].z
    const dxFront = newFrontX - oldFrontX
    const dzFront = newFrontZ - oldFrontZ
    const dxBack = newBackX - oldBackX
    const dzBack = newBackZ - oldBackZ
    const avgDx = (dxFront + dxBack) / 2
    const avgDz = (dzFront + dzBack) / 2

    for (let i = 0; i < this.chain.joints.length; i++) {
      if (i === frontIdx || i === backIdx) continue
      this.chain.joints[i].x += avgDx
      this.chain.joints[i].z += avgDz
    }

    this.chain.joints[frontIdx].set(newFrontX, hipY, newFrontZ)
    this.chain.joints[backIdx].set(newBackX, hipY, newBackZ)

    for (let i = 0; i < this.limbs.length; i++) {
      const ln = config.limbNodes[i]
      if (!ln) continue
      const limb = this.limbs[i]
      if (ln.index === frontIdx) {
        limb.anchor.x += dxFront
        limb.anchor.z += dzFront
      } else if (ln.index === backIdx) {
        limb.anchor.x += dxBack
        limb.anchor.z += dzBack
      } else {
        limb.anchor.x += avgDx
        limb.anchor.z += avgDz
      }
    }
  }
}
