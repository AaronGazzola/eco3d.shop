'use client'

import { RefObject, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BodyGroup, SegmentData } from '@/app/admin/_lib/types'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { buildSkeletonTree, effectiveAngleCaps, flattenSkeleton } from './chain'
import { buildBodySpec, BodySpec } from './body'
import {
  centerOfMass,
  diagnostics,
  initSolverState,
  perturbJointRates,
  seedRootVelocity,
  stepSolver,
} from './solver'
import { SolverState } from './types'
import {
  buildCaptureSpec,
  buildSample,
  serializeCapture,
  subsampleSamples,
  CaptureSample,
} from './diagnostics'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const KICK_ROOT_VELOCITY = 0.5
const PERTURB_MAGNITUDE = 1.5
const DIAGNOSTICS_INTERVAL = 0.1
const RECORD_INTERVAL = 0.05
const MAX_OUTPUT_SAMPLES = 160

interface JointCapEntry {
  groupId: string
  yawForward: number
  yawBackward: number
}

interface SolverHandle {
  spec: BodySpec
  state: SolverState
  startCom: { x: number; z: number }
  diagAccum: number
  recordBaseCom: { x: number; z: number }
  recordTime: number
  recordAccum: number
  recordSamples: CaptureSample[]
}

function postCapture(markdown: string): void {
  fetch('/api/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Capture upload failed: ${res.status} ${text}`)
      }
      return res.json()
    })
    .then((data) => {
      useAnimateStore.getState().setLastCapturePath(data.path)
    })
    .catch((err) => {
      console.error(err)
      useAnimateStore.getState().setLastCapturePath('failed — see console')
    })
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
  })

  const skeletonGroups = useMemo(
    () => flattenSkeleton(buildSkeletonTree(groups)),
    [groups]
  )
  const allLegs = useMemo(
    () => groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right'),
    [groups]
  )
  const headId = skeletonGroups[0]?.id ?? null
  const chainJointCaps = useMemo<JointCapEntry[]>(() => {
    const out: JointCapEntry[] = []
    for (let i = 1; i < skeletonGroups.length; i++) {
      const g = skeletonGroups[i]
      const caps = effectiveAngleCaps(g)
      out.push({
        groupId: g.id,
        yawForward: caps.yaw,
        yawBackward: caps.yawBack ?? caps.yaw,
      })
    }
    return out
  }, [skeletonGroups])

  const bodySpec = useMemo(() => buildBodySpec(groups, segments), [groups, segments])

  const handleRef = useRef<SolverHandle | null>(null)
  const wasRunningRef = useRef(false)
  const wasRecordingRef = useRef(false)
  const lastResetRef = useRef(0)
  const lastKickRef = useRef(0)
  const lastPerturbRef = useRef(0)

  function seedFromManualPose(spec: BodySpec): SolverState {
    const state = initSolverState(spec)
    const manualPose = useAnimateStore.getState().manualPose
    state.rootX = manualPose.rootX
    state.rootZ = manualPose.rootZ
    state.rootHeadingY = manualPose.rootYawRad
    for (let i = 0; i < spec.joints.length; i++) {
      const groupId = spec.segments[spec.joints[i].segmentIndex].groupId
      state.jointAngles[i] = manualPose.jointAnglesRad[groupId] ?? 0
    }
    return state
  }

  useFrame((_, dt) => {
    const pivots = pivotsRef.current
    if (!pivots) return

    const store = useAnimateStore.getState()
    const calibrating = store.animateTab === 'calibrate'
    const calibratingGroupId = store.calibratingGroupId
    const calibratingYaw = store.calibratingYaw
    const calibratingPitch = store.calibratingPitch
    const s = scratch.current

    const running = !calibrating && store.simRunning && !!bodySpec

    if (running && bodySpec) {
      if (!wasRunningRef.current || !handleRef.current || handleRef.current.spec !== bodySpec) {
        const state = seedFromManualPose(bodySpec)
        const startCom = centerOfMass(state, bodySpec)
        handleRef.current = {
          spec: bodySpec,
          state,
          startCom,
          diagAccum: 0,
          recordBaseCom: startCom,
          recordTime: 0,
          recordAccum: RECORD_INTERVAL,
          recordSamples: [],
        }
        lastResetRef.current = store.simResetSignal
        lastKickRef.current = store.simKickSignal
        lastPerturbRef.current = store.simPerturbSignal
      }
      const handle = handleRef.current

      if (store.simResetSignal !== lastResetRef.current) {
        lastResetRef.current = store.simResetSignal
        handle.state = seedFromManualPose(handle.spec)
        handle.startCom = centerOfMass(handle.state, handle.spec)
        handle.diagAccum = 0
      }
      if (store.simKickSignal !== lastKickRef.current) {
        lastKickRef.current = store.simKickSignal
        seedRootVelocity(handle.state, KICK_ROOT_VELOCITY, 0)
      }
      if (store.simPerturbSignal !== lastPerturbRef.current) {
        lastPerturbRef.current = store.simPerturbSignal
        perturbJointRates(handle.state, handle.spec, PERTURB_MAGNITUDE)
      }

      stepSolver(handle.state, handle.spec, dt)

      if (headId) {
        const headPivot = pivots.get(headId)
        if (headPivot) headPivot.quaternion.identity()
      }
      for (let i = 0; i < handle.spec.joints.length; i++) {
        const groupId = handle.spec.segments[handle.spec.joints[i].segmentIndex].groupId
        const pivot = pivots.get(groupId)
        if (!pivot) continue
        pivot.quaternion.setFromAxisAngle(Y_AXIS, handle.state.jointAngles[i])
      }

      const root = rootRef?.current
      if (root) {
        root.position.set(handle.state.rootX, 0, handle.state.rootZ)
        root.quaternion.setFromAxisAngle(Y_AXIS, handle.state.rootHeadingY)
      }

      handle.diagAccum += dt
      if (handle.diagAccum >= DIAGNOSTICS_INTERVAL) {
        handle.diagAccum -= DIAGNOSTICS_INTERVAL
        const d = diagnostics(handle.state, handle.spec, handle.startCom)
        store.setSimDiagnostics(d)
      }

      if (store.simRecording && !wasRecordingRef.current) {
        handle.recordSamples = []
        handle.recordTime = 0
        handle.recordAccum = RECORD_INTERVAL
        handle.recordBaseCom = centerOfMass(handle.state, handle.spec)
      }
      if (store.simRecording) {
        handle.recordTime += dt
        handle.recordAccum += dt
        if (handle.recordAccum >= RECORD_INTERVAL) {
          handle.recordAccum = 0
          handle.recordSamples.push(
            buildSample(handle.recordTime, handle.state, handle.spec, handle.recordBaseCom)
          )
        }
      }
    } else if (calibrating) {
      const alpha = 1 - Math.exp(-SLERP_RATE * dt)
      for (const sg of skeletonGroups) {
        const pivot = pivots.get(sg.id)
        if (!pivot) continue
        if (sg.id === calibratingGroupId) {
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
        root.position.set(0, 0, 0)
        root.quaternion.identity()
      }
    } else {
      const manualPose = store.manualPose
      if (headId) {
        const headPivot = pivots.get(headId)
        if (headPivot) headPivot.quaternion.identity()
      }
      for (const cap of chainJointCaps) {
        const pivot = pivots.get(cap.groupId)
        if (!pivot) continue
        const raw = manualPose.jointAnglesRad[cap.groupId] ?? 0
        const clamped = Math.max(-cap.yawBackward, Math.min(cap.yawForward, raw))
        pivot.quaternion.setFromAxisAngle(Y_AXIS, clamped)
      }

      const root = rootRef?.current
      if (root) {
        root.position.set(manualPose.rootX, 0, manualPose.rootZ)
        root.quaternion.setFromAxisAngle(Y_AXIS, manualPose.rootYawRad)
      }
    }

    if (wasRecordingRef.current && !store.simRecording) {
      const handle = handleRef.current
      if (handle && handle.recordSamples.length > 0) {
        const markdown = serializeCapture(
          buildCaptureSpec(handle.spec),
          subsampleSamples(handle.recordSamples, MAX_OUTPUT_SAMPLES)
        )
        postCapture(markdown)
      } else {
        store.setLastCapturePath('no samples captured')
      }
    }

    wasRunningRef.current = running
    wasRecordingRef.current = store.simRecording

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
          s.qYaw.setFromAxisAngle(Y_AXIS, calibratingYaw)
          s.qPitch.setFromAxisAngle(Z_AXIS, calibratingPitch)
          s.qLeg.copy(s.qYaw).multiply(s.qPitch)
          legMesh.quaternion.copy(s.qLeg)
          s.v2.copy(s.v1).applyQuaternion(s.qLeg)
          legMesh.position.copy(s.v1).sub(s.v2)
        }
      }
    }
  })
}
