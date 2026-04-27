'use client'

import { MutableRefObject, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { Chain3D, constrainAngle } from './chain3d'
import { fabrikResolve } from './fabrik3d'
import {
  LIZARD_BASE_Y_RATIO,
  SPEED_DECAY_DIST,
} from './useCreature.constants'

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

export function useCreature(
  config: CreatureConfig,
  targetRef: MutableRefObject<THREE.Vector3>
) {
  const chainRef = useRef<Chain3D | null>(null)
  const limbStatesRef = useRef<LimbState[]>([])
  const headingRef = useRef(0)

  useEffect(() => {
    const baseY = config.limbSegmentLength * LIZARD_BASE_Y_RATIO
    const ox = config.chainOrigin?.x ?? 0
    const oz = config.chainOrigin?.z ?? 0
    const origin = new THREE.Vector3(ox, baseY, oz)
    const segmentLengths = config.segmentLengths ?? Array(config.segmentCount - 1).fill(config.segmentLength)
    const chain = new Chain3D(origin, config.segmentCount, segmentLengths, config.angleConstraint)
    if (config.initialJoints && config.initialJoints.length > 0) {
      for (let i = 0; i < chain.joints.length; i++) {
        const ij = config.initialJoints[Math.min(i, config.initialJoints.length - 1)]
        chain.joints[i].set(ij.x, baseY, ij.z)
      }
      const j0 = chain.joints[0]
      const j1 = chain.joints[Math.min(1, chain.joints.length - 1)]
      headingRef.current = Math.atan2(j0.z - j1.z, j0.x - j1.x)
      for (let i = 0; i < chain.angles.length; i++) chain.angles[i] = headingRef.current
    } else {
      headingRef.current = 0
    }
    chainRef.current = chain

    limbStatesRef.current = config.limbNodes.map(() => makeLimb())
  }, [config.segmentCount, config.segmentLength, config.segmentLengths, config.angleConstraint, config.limbNodes.length, config.limbSegmentLength, config.chainOrigin?.x, config.chainOrigin?.z, config.initialJoints])

  useFrame((_, delta) => {
    const chain = chainRef.current
    if (!chain) return

    const head = chain.joints[0]
    const dir = targetRef.current.clone().sub(head)
    const dist = dir.length()
    const rawAngle = dist > 0.001 ? Math.atan2(dir.z, dir.x) : headingRef.current
    const turnedAngle = constrainAngle(rawAngle, headingRef.current, chain.angleConstraint)
    headingRef.current = turnedAngle
    const excess = Math.max(0, dist - config.followDistance)
    const step = config.maxSpeed * (1 - Math.exp(-excess / SPEED_DECAY_DIST)) * delta
    const headTarget = new THREE.Vector3(
      head.x + Math.cos(turnedAngle) * step,
      head.y,
      head.z + Math.sin(turnedAngle) * step,
    )
    chain.resolve(headTarget, turnedAngle)

    const limbs = limbStatesRef.current
    limbs.forEach((limb, idx) => {
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
          spineJoint.z - limbNode.hipOffset.x * sin + limbNode.hipOffset.z * cos
        )
      } else {
        const sideAngle = spineAngle + (Math.PI / 2) * side
        limb.anchor.set(
          spineJoint.x + Math.cos(sideAngle) * halfWidth,
          spineJoint.y,
          spineJoint.z + Math.sin(sideAngle) * halfWidth
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
      }

      limb.currentTarget.lerp(limb.desiredTarget, config.stepSmoothing)

      fabrikResolve(limb.joints, limb.currentTarget, limb.anchor, limbSegLen)
    })
  })

  return { chainRef, limbStatesRef }
}
