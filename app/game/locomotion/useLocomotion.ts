'use client'

import { RefObject, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BodyGroup, SegmentData } from '@/app/admin/_lib/types'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { buildSkeletonTree, flattenSkeleton } from './chain'
import { buildBodySpec } from './body'
import {
  centerOfMass,
  diagnostics,
  initSolverState,
  perturb,
  stepSolver,
} from './solver'
import { BodySpec, SolverState } from './types'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const PERTURB_MAGNITUDE = 2
const DIAGNOSTICS_INTERVAL = 0.1

interface SolverHandle {
  spec: BodySpec
  state: SolverState
  startCom: { x: number; z: number }
}

export function useLocomotion(
  pivotsRef: RefObject<Map<string, THREE.Group>>,
  groups: BodyGroup[],
  segments: SegmentData[] = [],
  rootRef?: RefObject<THREE.Group | null>
) {
  const targetQuat = useRef(new THREE.Quaternion())
  const scratch = useRef({
    qYaw: new THREE.Quaternion(),
    qPitch: new THREE.Quaternion(),
    qLeg: new THREE.Quaternion(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    rootNode: new THREE.Vector3(),
    rotatedRootNode: new THREE.Vector3(),
  })

  const skeletonGroups = useMemo(
    () => flattenSkeleton(buildSkeletonTree(groups)),
    [groups]
  )
  const allLegs = useMemo(
    () => groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right'),
    [groups]
  )

  const bodySpec = useMemo(() => buildBodySpec(groups, segments), [groups, segments])

  const solverRef = useRef<SolverHandle | null>(null)
  const lastResetRef = useRef(0)
  const lastPerturbRef = useRef(0)
  const diagAccumRef = useRef(0)

  useFrame((_, dt) => {
    const pivots = pivotsRef.current
    if (!pivots) return

    const store = useAnimateStore.getState()
    const s = scratch.current

    if (bodySpec) {
      if (!solverRef.current || solverRef.current.spec !== bodySpec) {
        const state = initSolverState(bodySpec)
        solverRef.current = { spec: bodySpec, state, startCom: centerOfMass(state, bodySpec) }
      }
    } else {
      solverRef.current = null
    }

    const handle = solverRef.current
    if (handle) {
      if (store.simResetSignal !== lastResetRef.current) {
        lastResetRef.current = store.simResetSignal
        handle.state = initSolverState(handle.spec)
        handle.startCom = centerOfMass(handle.state, handle.spec)
      }
      if (store.simPerturbSignal !== lastPerturbRef.current) {
        lastPerturbRef.current = store.simPerturbSignal
        perturb(handle.state, handle.spec, PERTURB_MAGNITUDE)
        handle.startCom = centerOfMass(handle.state, handle.spec)
      }
    }

    const simulating = store.animateTab === 'simulate' && store.simRunning && !!handle

    if (simulating && handle) {
      stepSolver(handle.state, handle.spec, dt)

      const headPivot = pivots.get(handle.spec.segments[0].groupId)
      if (headPivot) headPivot.quaternion.identity()

      for (let i = 0; i < handle.spec.joints.length; i++) {
        const joint = handle.spec.joints[i]
        const group = handle.spec.segments[joint.segmentIndex]
        const pivot = pivots.get(group.groupId)
        if (!pivot) continue
        const raw = handle.state.jointAngles[i]
        const clamped = Math.max(-joint.yawBackwardLimit, Math.min(joint.yawForwardLimit, raw))
        pivot.quaternion.setFromAxisAngle(Y_AXIS, clamped)
      }

      const root = rootRef?.current
      if (root) {
        const psi = handle.state.rootHeadingY
        s.qYaw.setFromAxisAngle(Y_AXIS, psi)
        s.rootNode.set(handle.spec.restRootX, 0, handle.spec.restRootZ)
        s.rotatedRootNode.copy(s.rootNode).applyQuaternion(s.qYaw)
        root.quaternion.copy(s.qYaw)
        root.position.set(
          s.rootNode.x - s.rotatedRootNode.x + handle.state.rootX,
          0,
          s.rootNode.z - s.rotatedRootNode.z + handle.state.rootZ
        )
      }

      diagAccumRef.current += dt
      if (diagAccumRef.current >= DIAGNOSTICS_INTERVAL) {
        diagAccumRef.current = 0
        const d = diagnostics(handle.state, handle.spec, handle.startCom)
        store.setSimDiagnostics({
          kineticEnergy: d.kineticEnergy,
          comDrift: d.comDriftFromStart,
          maxJointFractionOfCap: d.maxJointAngleFractionOfCap,
        })
      }
    } else {
      const calibrating = store.animateTab === 'calibrate'
      const calibratingGroupId = store.calibratingGroupId
      const calibratingYaw = store.calibratingYaw
      const calibratingPitch = store.calibratingPitch
      const alpha = 1 - Math.exp(-SLERP_RATE * dt)

      for (const sg of skeletonGroups) {
        const pivot = pivots.get(sg.id)
        if (!pivot) continue
        if (calibrating && sg.id === calibratingGroupId) {
          s.qYaw.setFromAxisAngle(Y_AXIS, calibratingYaw)
          s.qPitch.setFromAxisAngle(Z_AXIS, calibratingPitch)
          targetQuat.current.copy(s.qYaw).multiply(s.qPitch)
        } else {
          targetQuat.current.identity()
        }
        pivot.quaternion.slerp(targetQuat.current, alpha)
      }

      const root = rootRef?.current
      if (root) {
        root.quaternion.identity()
        root.position.set(0, 0, 0)
      }
    }

    const calibrating = store.animateTab === 'calibrate'
    const calibratingGroupId = store.calibratingGroupId

    for (const leg of allLegs) {
      const mesh = pivots.get(leg.id)
      if (!mesh) continue
      if (calibrating && leg.id === calibratingGroupId) continue
      mesh.quaternion.identity()
      mesh.position.set(0, 0, 0)
    }

    if (calibrating && calibratingGroupId) {
      const calibratingLeg = allLegs.find((g) => g.id === calibratingGroupId)
      if (calibratingLeg) {
        const parentSpine = calibratingLeg.attachedToSpineId
          ? groups.find((g) => g.id === calibratingLeg.attachedToSpineId)
          : null
        const hipNode =
          calibratingLeg.type === 'leg-left'
            ? parentSpine?.nodeHipLeft
            : parentSpine?.nodeHipRight
        const legMesh = pivots.get(calibratingLeg.id)
        if (legMesh && hipNode) {
          s.v1.set(hipNode.x, hipNode.y ?? 0, hipNode.z)
          s.qYaw.setFromAxisAngle(Y_AXIS, store.calibratingYaw)
          s.qPitch.setFromAxisAngle(Z_AXIS, store.calibratingPitch)
          s.qLeg.copy(s.qYaw).multiply(s.qPitch)
          legMesh.quaternion.copy(s.qLeg)
          s.v2.copy(s.v1).applyQuaternion(s.qLeg)
          legMesh.position.copy(s.v1).sub(s.v2)
        }
      }
    }
  })
}
