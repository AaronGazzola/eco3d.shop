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

interface LimbState {
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
    const origin = new THREE.Vector3(0, baseY, 0)
    chainRef.current = new Chain3D(origin, config.segmentCount, config.segmentLength, config.angleConstraint)
    headingRef.current = 0

    limbStatesRef.current = config.limbNodes.map(() => makeLimb())
  }, [config.segmentCount, config.segmentLength, config.angleConstraint, config.limbNodes.length, config.limbSegmentLength])

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

      const side = limbNode.side
      const sideAngle = spineAngle + (Math.PI / 2) * side
      limb.anchor.set(
        spineJoint.x + Math.cos(sideAngle) * config.bodyHalfWidth,
        spineJoint.y,
        spineJoint.z + Math.sin(sideAngle) * config.bodyHalfWidth
      )

      const footAngle = spineAngle + config.limbAngleOffset * side
      const desired = new THREE.Vector3(
        spineJoint.x + Math.cos(footAngle) * config.limbReach,
        0,
        spineJoint.z + Math.sin(footAngle) * config.limbReach,
      )

      if (desired.distanceTo(limb.desiredTarget) > config.stepThreshold) {
        limb.desiredTarget.copy(desired)
      }

      limb.currentTarget.lerp(limb.desiredTarget, config.stepSmoothing)

      fabrikResolve(limb.joints, limb.currentTarget, limb.anchor, config.limbSegmentLength)
    })
  })

  return { chainRef, limbStatesRef }
}
