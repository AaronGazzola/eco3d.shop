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
  DEFAULT_HIP_CAP,
  STEP_DURATION,
  LIFT_HEIGHT,
  STRAIN_THRESHOLD,
  makeFootState,
  footTargetAt,
  computeStrain,
  easeInOut,
} from './foot'
import { recordFrame, FootSnapshot, PivotSnapshot, FrameSnapshot } from './diagnostics'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)

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
  leftLeg?: RefObject<THREE.Group | null>
  rightLeg?: RefObject<THREE.Group | null>
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
      }
    }

    const alpha = 1 - Math.exp(-SLERP_RATE * dt)
    const pivotSnapshots: PivotSnapshot[] = []
    for (let i = 0; i < chain.length; i++) {
      const pivot = pivots.get(chain[i].id)
      if (!pivot) continue
      const r = i === hipIdx && hipInChain ? appliedHipYaw : cascadeOut[i]
      targetQuat.current.setFromAxisAngle(Y_AXIS, r)
      pivot.quaternion.slerp(targetQuat.current, alpha)
      const q = pivot.quaternion
      const sinY = 2 * (q.w * q.y - q.z * q.x)
      const cosY = 1 - 2 * (q.y * q.y + q.x * q.x)
      const eulerY = Math.atan2(sinY, cosY)
      const wp = new THREE.Vector3()
      pivot.getWorldPosition(wp)
      pivotSnapshots.push({
        id: chain[i].id,
        name: chain[i].name,
        type: chain[i].type,
        requestedYaw: r,
        appliedQuat: [q.x, q.y, q.z, q.w],
        appliedEulerY: eulerY,
        worldPos: [wp.x, wp.y, wp.z],
      })
    }

    const footWorldPos = (foot: FootState): { x: number; y: number; z: number } => {
      if (foot.phase === 'planted') {
        return { x: foot.plantedX, y: foot.restY, z: foot.plantedZ }
      }
      const t = easeInOut(foot.swingT)
      const x = foot.swingStartX + (foot.swingTargetX - foot.swingStartX) * t
      const z = foot.swingStartZ + (foot.swingTargetZ - foot.swingStartZ) * t
      const lift = Math.sin(foot.swingT * Math.PI) * LIFT_HEIGHT
      return { x, y: foot.restY + lift, z }
    }

    if (footMarkers && leftFoot && rightFoot) {
      const leftMarker = footMarkers.left.current
      if (leftMarker) {
        const p = footWorldPos(leftFoot)
        leftMarker.position.set(p.x, p.y, p.z)
      }
      const rightMarker = footMarkers.right.current
      if (rightMarker) {
        const p = footWorldPos(rightFoot)
        rightMarker.position.set(p.x, p.y, p.z)
      }

      if (hipInChain && frontHip && frontHip.nodeBack) {
        const hipPivot = pivots.get(frontHip.id)
        const { left: leftLegGroup, right: rightLegGroup } = findLegsForHip(groups, frontHip.id)
        if (hipPivot) {
          const hipBackVec = new THREE.Vector3(
            frontHip.nodeBack.x,
            frontHip.nodeBack.y ?? 0,
            frontHip.nodeBack.z
          )

          const applyLegBone = (
            mesh: THREE.Group | null,
            leg: { nodeFoot?: { x: number; y?: number; z: number } } | null,
            hipNode: { x: number; y?: number; z: number } | undefined,
            foot: FootState
          ) => {
            if (!mesh || !leg?.nodeFoot || !hipNode) return
            const hRest = new THREE.Vector3(hipNode.x, hipNode.y ?? 0, hipNode.z)
            const fRest = new THREE.Vector3(leg.nodeFoot.x, leg.nodeFoot.y ?? 0, leg.nodeFoot.z)
            const hNow = hRest.clone().sub(hipBackVec).applyQuaternion(hipPivot.quaternion).add(hipBackVec)
            const p = footWorldPos(foot)
            const fNow = new THREE.Vector3(p.x, p.y, p.z)
            const dRest = new THREE.Vector3().subVectors(fRest, hRest)
            const dNow = new THREE.Vector3().subVectors(fNow, hNow)
            if (dRest.lengthSq() < 1e-10 || dNow.lengthSq() < 1e-10) return
            dRest.normalize()
            dNow.normalize()
            const qLeg = new THREE.Quaternion().setFromUnitVectors(dRest, dNow)
            mesh.quaternion.copy(qLeg)
            mesh.position.copy(hNow).sub(hRest.clone().applyQuaternion(qLeg))
          }

          applyLegBone(
            footMarkers.leftLeg?.current ?? null,
            leftLegGroup,
            frontHip.nodeHipLeft,
            leftFoot
          )
          applyLegBone(
            footMarkers.rightLeg?.current ?? null,
            rightLegGroup,
            frontHip.nodeHipRight,
            rightFoot
          )
        }
      }
    }

    const footSnap = (f: FootState | null, strain: number): FootSnapshot | null =>
      f
        ? {
            phase: f.phase,
            plantedX: f.plantedX,
            plantedZ: f.plantedZ,
            swingStartX: f.swingStartX,
            swingStartZ: f.swingStartZ,
            swingTargetX: f.swingTargetX,
            swingTargetZ: f.swingTargetZ,
            swingT: f.swingT,
            restOffsetX: f.restOffsetX,
            restOffsetZ: f.restOffsetZ,
            restY: f.restY,
            strain,
          }
        : null

    const wantedHipYaw = hipInChain ? cascadeOut[hipIdx] : 0
    const hipBackSnap =
      hipInChain && frontHip && frontHip.nodeBack
        ? { x: frontHip.nodeBack.x, z: frontHip.nodeBack.z }
        : null

    const snapshot: FrameSnapshot = {
      t: performance.now(),
      attractor: attractor ? { x: attractor.x, y: attractor.y, z: attractor.z } : null,
      modelRotation: [modelRotation[0], modelRotation[1], modelRotation[2]],
      desiredHeadYaw: desired,
      chain: chain.map((g) => ({ id: g.id, name: g.name, type: g.type })),
      caps,
      cascadeOut,
      hipInChain,
      frontHipId: frontHip?.id ?? null,
      hipBack: hipBackSnap,
      wantedHipYaw,
      appliedHipYaw,
      hipState: {
        plantedYaw: hipStateRef.current.plantedYaw,
        targetYaw: hipStateRef.current.targetYaw,
      },
      leftFoot: footSnap(leftFoot, leftStrain),
      rightFoot: footSnap(rightFoot, rightStrain),
      pivots: pivotSnapshots,
    }
    recordFrame(snapshot)
  })
}
