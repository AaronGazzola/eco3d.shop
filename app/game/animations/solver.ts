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
}

function makeLimb(): LimbState {
  return {
    joints: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    anchor: new THREE.Vector3(),
    currentTarget: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
  }
}

export class Solver {
  config: CreatureConfig
  chain: Chain3D
  limbs: LimbState[]
  heading: number
  baseY: number
  restY: number[]

  constructor(config: CreatureConfig) {
    this.config = config
    const baseY = config.limbSegmentLength * LIZARD_BASE_Y_RATIO
    this.baseY = baseY
    const ox = config.chainOrigin?.x ?? 0
    const oy = config.chainOrigin?.y ?? baseY
    const oz = config.chainOrigin?.z ?? 0
    const origin = new THREE.Vector3(ox, oy, oz)
    const segmentLengths =
      config.segmentLengths ?? Array(config.segmentCount - 1).fill(config.segmentLength)
    this.chain = new Chain3D(origin, config.segmentCount, segmentLengths, config.angleConstraint)

    this.restY = []
    if (config.initialJoints && config.initialJoints.length > 0) {
      for (let i = 0; i < this.chain.joints.length; i++) {
        const ij = config.initialJoints[Math.min(i, config.initialJoints.length - 1)]
        const y = ij.y ?? oy
        this.chain.joints[i].set(ij.x, y, ij.z)
        this.restY.push(y)
      }
      const j0 = this.chain.joints[0]
      const j1 = this.chain.joints[Math.min(1, this.chain.joints.length - 1)]
      this.heading = Math.atan2(j0.z - j1.z, j0.x - j1.x)
      for (let i = 0; i < this.chain.angles.length; i++) this.chain.angles[i] = this.heading
    } else {
      for (let i = 0; i < this.chain.joints.length; i++) this.restY.push(oy)
      this.heading = 0
    }

    this.limbs = config.limbNodes.map(() => makeLimb())
  }

  apply(drive: DragonDrive, dt: number): void {
    const chain = this.chain
    const config = this.config
    const head = chain.joints[0]

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
      this.restY[0],
      head.z + Math.sin(turnedAngle) * step,
    )
    chain.resolve(headTarget, turnedAngle)

    for (let i = 0; i < chain.joints.length; i++) {
      chain.joints[i].y = this.restY[i]
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
          spineJoint.y + limbNode.hipOffset.y,
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
      const footY = limbNode.footRestY ?? 0
      const desired = new THREE.Vector3(
        spineJoint.x + Math.cos(footAngle) * reach,
        footY,
        spineJoint.z + Math.sin(footAngle) * reach,
      )

      if (desired.distanceTo(limb.desiredTarget) > config.stepThreshold) {
        limb.desiredTarget.copy(desired)
      }

      if (drive.legCadence > 0) {
        limb.currentTarget.lerp(limb.desiredTarget, config.stepSmoothing * drive.legCadence)
      }

      fabrikResolve(limb.joints, limb.currentTarget, limb.anchor, limbSegLen)
    })
  }
}
