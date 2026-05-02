import * as THREE from 'three'
import { CreatureConfig } from '../../page.types'
import { Chain3D, constrainAngle } from '../chain3d'
import { fabrikResolve } from '../fabrik3d'
import { LIZARD_BASE_Y_RATIO, SPEED_DECAY_DIST } from '../useCreature.constants'
import { DragonDrive } from './types'

export interface LimbState {
  joints: THREE.Vector3[]
  anchor: THREE.Vector3
  currentTarget: THREE.Vector3
  desiredTarget: THREE.Vector3
  stepStart: THREE.Vector3
  stepEnd: THREE.Vector3
  stepT: number
}

function makeLimb(): LimbState {
  return {
    joints: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    anchor: new THREE.Vector3(),
    currentTarget: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
    stepStart: new THREE.Vector3(),
    stepEnd: new THREE.Vector3(),
    stepT: 1,
  }
}

export class Solver {
  config: CreatureConfig
  chain: Chain3D
  limbs: LimbState[]
  heading: number
  baseY: number

  constructor(config: CreatureConfig) {
    this.config = config
    const baseY = config.limbSegmentLength * LIZARD_BASE_Y_RATIO
    this.baseY = baseY
    const ox = config.chainOrigin?.x ?? 0
    const oz = config.chainOrigin?.z ?? 0
    const origin = new THREE.Vector3(ox, baseY, oz)
    const segmentLengths =
      config.segmentLengths ?? Array(config.segmentCount - 1).fill(config.segmentLength)
    this.chain = new Chain3D(origin, config.segmentCount, segmentLengths, config.angleConstraint)

    if (config.initialJoints && config.initialJoints.length > 0) {
      for (let i = 0; i < this.chain.joints.length; i++) {
        const ij = config.initialJoints[Math.min(i, config.initialJoints.length - 1)]
        this.chain.joints[i].set(ij.x, baseY, ij.z)
      }
      const j0 = this.chain.joints[0]
      const j1 = this.chain.joints[Math.min(1, this.chain.joints.length - 1)]
      this.heading = Math.atan2(j0.z - j1.z, j0.x - j1.x)
      for (let i = 0; i < this.chain.angles.length; i++) this.chain.angles[i] = this.heading
    } else {
      this.heading = 0
    }

    this.limbs = config.limbNodes.map(() => makeLimb())
  }

  apply(drive: DragonDrive, dt: number): void {
    const chain = this.chain
    const config = this.config
    const head = chain.joints[0]
    chain.bankAngle = drive.bankAngle

    const dx = drive.headTarget.x - head.x
    const dz = drive.headTarget.z - head.z
    const dist = Math.hypot(dx, dz)
    const rawAngle = dist > 0.001 ? Math.atan2(dz, dx) : this.heading
    const turnedAngle = constrainAngle(rawAngle, this.heading, chain.angleConstraint)
    this.heading = turnedAngle
    const excess = Math.max(0, dist - config.followDistance)
    const step = config.maxSpeed * (1 - Math.exp(-excess / SPEED_DECAY_DIST)) * dt
    const headTarget = new THREE.Vector3(
      head.x + Math.cos(turnedAngle) * step,
      this.baseY + drive.headTarget.y,
      head.z + Math.sin(turnedAngle) * step,
    )
    chain.resolve(headTarget, turnedAngle)

    if (drive.rootYOffset !== 0) {
      for (let i = 0; i < chain.joints.length; i++) {
        chain.joints[i].y += drive.rootYOffset
      }
    }

    if (drive.bodyRoll.amp !== 0) {
      const t = performance.now() * 0.001
      for (let i = 0; i < chain.joints.length; i++) {
        chain.joints[i].y +=
          drive.bodyRoll.amp * Math.sin(t * drive.bodyRoll.freq + i * drive.bodyRoll.phase)
      }
    }

    this.limbs.forEach((limb, idx) => {
      const limbNode = config.limbNodes[idx]
      if (!limbNode || limbNode.index >= chain.joints.length) return
      const spineJoint = chain.joints[limbNode.index]
      const spineAngle = chain.angles[limbNode.index]
      const nextJoint = chain.joints[Math.min(limbNode.index + 1, chain.joints.length - 1)]
      const boneAngle = Math.atan2(nextJoint.z - spineJoint.z, nextJoint.x - spineJoint.x)

      const side = limbNode.side
      const halfWidth = limbNode.bodyHalfWidth ?? config.bodyHalfWidth
      const reach = limbNode.limbReach ?? config.limbReach
      const limbSegLen = limbNode.limbSegmentLength ?? config.limbSegmentLength

      if (limbNode.hipOffset && limbNode.parentRestAngle !== undefined) {
        const parentRot = limbNode.parentRestAngle + Math.PI - boneAngle
        const cos = Math.cos(parentRot)
        const sin = Math.sin(parentRot)
        limb.anchor.set(
          spineJoint.x + limbNode.hipOffset.x * cos + limbNode.hipOffset.z * sin,
          spineJoint.y,
          spineJoint.z - limbNode.hipOffset.x * sin + limbNode.hipOffset.z * cos,
        )
      } else {
        const sideAngle = spineAngle + (Math.PI / 2) * side
        limb.anchor.set(
          spineJoint.x + Math.cos(sideAngle) * halfWidth,
          spineJoint.y,
          spineJoint.z + Math.sin(sideAngle) * halfWidth,
        )
      }

      const footAngle = spineAngle + config.limbAngleOffset * side
      const desired = new THREE.Vector3(
        spineJoint.x + Math.cos(footAngle) * reach,
        0,
        spineJoint.z + Math.sin(footAngle) * reach,
      )

      if (desired.distanceTo(limb.desiredTarget) > config.stepThreshold) {
        limb.desiredTarget.copy(desired)
        limb.stepStart.copy(limb.currentTarget)
        limb.stepEnd.copy(desired)
        limb.stepT = 0
      }

      const cadence = drive.legCadence
      if (cadence > 0 && limb.stepT < 1) {
        limb.stepT = Math.min(1, limb.stepT + config.stepSmoothing * cadence)
        const t = limb.stepT
        const baseX = limb.stepStart.x + (limb.stepEnd.x - limb.stepStart.x) * t
        const baseZ = limb.stepStart.z + (limb.stepEnd.z - limb.stepStart.z) * t
        const arc = 4 * drive.legLiftAmplitude * t * (1 - t)
        const baseY = limb.stepStart.y + (limb.stepEnd.y - limb.stepStart.y) * t
        limb.currentTarget.set(baseX, baseY + arc, baseZ)
      }

      fabrikResolve(limb.joints, limb.currentTarget, limb.anchor, limbSegLen)
    })
  }
}
