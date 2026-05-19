'use client'

import { RefObject, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BodyGroup } from '@/app/studio/page.types'
import { useStudioStore } from '@/app/studio/page.stores'
import { computeDesiredHeadYaw, DEFAULT_HEAD_CAP } from './headGaze'
import { buildCascadeChain } from './chain'
import { computeCascadeRotations, DEFAULT_SPINE_CAP } from './cascade'
import { findFrontHip, findLegsForHip } from './legs'
import {
  FootState,
  FootPhase,
  DEFAULT_HIP_CAP,
  STEP_DURATION,
  LIFT_HEIGHT,
  STRAIN_THRESHOLD,
  makeFootState,
  footTargetAt,
  computeStrain,
  easeInOut,
} from './foot'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const STORE_THROTTLE_MS = 100

function capFor(g: BodyGroup): number {
  if (typeof g.angleCap === 'number') return g.angleCap
  if (g.type === 'head') return DEFAULT_HEAD_CAP
  if (g.nodeHipLeft || g.nodeHipRight) return DEFAULT_HIP_CAP
  return DEFAULT_SPINE_CAP
}

interface HipState {
  plantedYaw: number
  targetYaw: number
}

export interface FootMarkerRefs {
  left: RefObject<THREE.Group | null>
  right: RefObject<THREE.Group | null>
}

export function useLocomotion(
  pivotsRef: RefObject<Map<string, THREE.Group>>,
  groups: BodyGroup[],
  modelRotation: [number, number, number],
  footMarkers?: FootMarkerRefs
) {
  const targetQuat = useRef(new THREE.Quaternion())
  const hipStateRef = useRef<HipState>({ plantedYaw: 0, targetYaw: 0 })
  const feetRef = useRef<{ left: FootState | null; right: FootState | null }>({ left: null, right: null })
  const initIdRef = useRef<string | null>(null)
  const lastStoreWriteRef = useRef(0)
  const lastStorePayloadRef = useRef({
    leftFront: 0,
    rightFront: 0,
    leftPhase: 'planted' as FootPhase,
    rightPhase: 'planted' as FootPhase,
  })

  useFrame((_, dt) => {
    const pivots = pivotsRef.current
    if (!pivots) return

    const chain = buildCascadeChain(groups)
    if (chain.length === 0) return

    const head = chain[0]
    const attractor = useStudioStore.getState().attractor

    let desired = 0
    if (attractor) {
      const d = computeDesiredHeadYaw(head, attractor, modelRotation)
      if (d !== null) desired = d
    }

    const caps = chain.map(capFor)
    const cascadeOut = computeCascadeRotations(caps, desired)

    const frontHip = findFrontHip(groups)
    const hipIdx = chain.length - 1
    const hipInChain = !!(frontHip && chain[hipIdx].id === frontHip.id)

    let appliedHipYaw = 0
    let leftStrain = 0
    let rightStrain = 0
    let leftPhase: FootPhase = 'planted'
    let rightPhase: FootPhase = 'planted'
    let leftFoot: FootState | null = null
    let rightFoot: FootState | null = null

    if (hipInChain && frontHip && frontHip.nodeBack) {
      const hipBackX = frontHip.nodeBack.x
      const hipBackZ = frontHip.nodeBack.z
      const { left: leftLeg, right: rightLeg } = findLegsForHip(groups, frontHip.id)

      if (initIdRef.current !== frontHip.id) {
        if (leftLeg?.nodeFoot && rightLeg?.nodeFoot) {
          feetRef.current.left = makeFootState(
            leftLeg.nodeFoot.x,
            leftLeg.nodeFoot.y ?? 0,
            leftLeg.nodeFoot.z,
            hipBackX,
            hipBackZ
          )
          feetRef.current.right = makeFootState(
            rightLeg.nodeFoot.x,
            rightLeg.nodeFoot.y ?? 0,
            rightLeg.nodeFoot.z,
            hipBackX,
            hipBackZ
          )
          hipStateRef.current.plantedYaw = 0
          hipStateRef.current.targetYaw = 0
          initIdRef.current = frontHip.id
        }
      }

      leftFoot = feetRef.current.left
      rightFoot = feetRef.current.right

      if (leftFoot && rightFoot) {
        const wantedHipYaw = cascadeOut[hipIdx]

        if (leftFoot.phase === 'stepping') {
          leftFoot.swingT = Math.min(1, leftFoot.swingT + dt / STEP_DURATION)
          if (leftFoot.swingT >= 1) {
            leftFoot.plantedX = leftFoot.swingTargetX
            leftFoot.plantedZ = leftFoot.swingTargetZ
            leftFoot.phase = 'planted'
            hipStateRef.current.plantedYaw = hipStateRef.current.targetYaw
          }
        }
        if (rightFoot.phase === 'stepping') {
          rightFoot.swingT = Math.min(1, rightFoot.swingT + dt / STEP_DURATION)
          if (rightFoot.swingT >= 1) {
            rightFoot.plantedX = rightFoot.swingTargetX
            rightFoot.plantedZ = rightFoot.swingTargetZ
            rightFoot.phase = 'planted'
            hipStateRef.current.plantedYaw = hipStateRef.current.targetYaw
          }
        }

        const stepping =
          leftFoot.phase === 'stepping' ? leftFoot : rightFoot.phase === 'stepping' ? rightFoot : null

        if (stepping) {
          appliedHipYaw =
            hipStateRef.current.plantedYaw +
            (hipStateRef.current.targetYaw - hipStateRef.current.plantedYaw) *
              easeInOut(stepping.swingT)
        } else {
          appliedHipYaw = hipStateRef.current.plantedYaw

          leftStrain = computeStrain(leftFoot, hipBackX, hipBackZ, wantedHipYaw)
          rightStrain = computeStrain(rightFoot, hipBackX, hipBackZ, wantedHipYaw)

          const leftStrained = leftStrain > STRAIN_THRESHOLD
          const rightStrained = rightStrain > STRAIN_THRESHOLD
          const yawDelta = wantedHipYaw - hipStateRef.current.plantedYaw

          let stepFoot: FootState | null = null
          if (leftStrained && rightStrained) {
            stepFoot = yawDelta > 0 ? leftFoot : rightFoot
          } else if (leftStrained) {
            stepFoot = leftFoot
          } else if (rightStrained) {
            stepFoot = rightFoot
          }

          if (stepFoot) {
            const target = footTargetAt(stepFoot, hipBackX, hipBackZ, wantedHipYaw)
            stepFoot.swingStartX = stepFoot.plantedX
            stepFoot.swingStartZ = stepFoot.plantedZ
            stepFoot.swingTargetX = target.x
            stepFoot.swingTargetZ = target.z
            stepFoot.swingT = 0
            stepFoot.phase = 'stepping'
            hipStateRef.current.targetYaw = wantedHipYaw
          }
        }

        if (stepping) {
          leftStrain = computeStrain(leftFoot, hipBackX, hipBackZ, wantedHipYaw)
          rightStrain = computeStrain(rightFoot, hipBackX, hipBackZ, wantedHipYaw)
        }

        leftPhase = leftFoot.phase
        rightPhase = rightFoot.phase
      }
    }

    const alpha = 1 - Math.exp(-SLERP_RATE * dt)
    for (let i = 0; i < chain.length; i++) {
      const pivot = pivots.get(chain[i].id)
      if (!pivot) continue
      const r = i === hipIdx && hipInChain ? appliedHipYaw : cascadeOut[i]
      targetQuat.current.setFromAxisAngle(Y_AXIS, r)
      pivot.quaternion.slerp(targetQuat.current, alpha)
    }

    if (footMarkers && leftFoot && rightFoot) {
      const leftMarker = footMarkers.left.current
      if (leftMarker) {
        if (leftFoot.phase === 'planted') {
          leftMarker.position.set(leftFoot.plantedX, leftFoot.restY, leftFoot.plantedZ)
        } else {
          const t = easeInOut(leftFoot.swingT)
          const x = leftFoot.swingStartX + (leftFoot.swingTargetX - leftFoot.swingStartX) * t
          const z = leftFoot.swingStartZ + (leftFoot.swingTargetZ - leftFoot.swingStartZ) * t
          const lift = Math.sin(leftFoot.swingT * Math.PI) * LIFT_HEIGHT
          leftMarker.position.set(x, leftFoot.restY + lift, z)
        }
      }
      const rightMarker = footMarkers.right.current
      if (rightMarker) {
        if (rightFoot.phase === 'planted') {
          rightMarker.position.set(rightFoot.plantedX, rightFoot.restY, rightFoot.plantedZ)
        } else {
          const t = easeInOut(rightFoot.swingT)
          const x = rightFoot.swingStartX + (rightFoot.swingTargetX - rightFoot.swingStartX) * t
          const z = rightFoot.swingStartZ + (rightFoot.swingTargetZ - rightFoot.swingStartZ) * t
          const lift = Math.sin(rightFoot.swingT * Math.PI) * LIFT_HEIGHT
          rightMarker.position.set(x, rightFoot.restY + lift, z)
        }
      }
    }

    const now = performance.now()
    if (now - lastStoreWriteRef.current >= STORE_THROTTLE_MS) {
      const prev = lastStorePayloadRef.current
      const phaseChanged = prev.leftPhase !== leftPhase || prev.rightPhase !== rightPhase
      const strainChanged =
        Math.abs(prev.leftFront - leftStrain) > 1e-4 || Math.abs(prev.rightFront - rightStrain) > 1e-4
      if (phaseChanged || strainChanged) {
        lastStorePayloadRef.current = {
          leftFront: leftStrain,
          rightFront: rightStrain,
          leftPhase,
          rightPhase,
        }
        useStudioStore.getState().setStrains({ leftFront: leftStrain, rightFront: rightStrain })
        useStudioStore.getState().setFootPhases({ leftFront: leftPhase, rightFront: rightPhase })
      }
      lastStoreWriteRef.current = now
    }
  })
}
