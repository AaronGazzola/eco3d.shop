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
  buildCpgCaptureSpec,
  buildCpgSample,
  CpgCaptureSample,
  serializeCpgCapture,
  subsampleCpgSamples,
  serializeCoupledCapture,
} from './diagnostics'
import {
  buildCpgSpec,
  CpgSpec,
  CpgState,
  initCpgState,
  oscillatorOutput,
  stepCpg,
} from './cpg'
import {
  createDelayBuffer,
  ekebergTorque,
  MuscleDelayBuffer,
  pushAndReadDelayed,
  testActivation,
} from './muscles'
import { FIXED_SUBSTEP_SECONDS } from './solver'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const KICK_ROOT_VELOCITY = 0.5
const PERTURB_MAGNITUDE = 1.5
const DIAGNOSTICS_INTERVAL = 0.1
const RECORD_INTERVAL = 0.05
const MAX_OUTPUT_SAMPLES = 160
const CPG_MAX_OUTPUT_SAMPLES = 200
const CPG_TO_MUSCLE_GAIN = 60

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

interface CpgHandle {
  spec: CpgSpec
  bodySpec: BodySpec
  state: CpgState
  recordTime: number
  recordAccum: number
  recordSamples: CpgCaptureSample[]
  recordDrive: number
  recordExcitability: number
}

interface MuscleHandle {
  spec: BodySpec
  state: SolverState
  startCom: { x: number; z: number }
  diagAccum: number
  recordBaseCom: { x: number; z: number }
  recordTime: number
  recordAccum: number
  recordSamples: CaptureSample[]
  delayBuffers: MuscleDelayBuffer[]
  testTime: number
}

interface CoupledHandle {
  spec: BodySpec
  cpgSpec: CpgSpec
  bodyState: SolverState
  cpgState: CpgState
  startCom: { x: number; z: number }
  diagAccum: number
  recordBaseCom: { x: number; z: number }
  recordTime: number
  recordAccum: number
  recordBodySamples: CaptureSample[]
  recordCpgSamples: CpgCaptureSample[]
  delayBuffers: MuscleDelayBuffer[]
  jointToCpgSegment: number[]
  recordDrive: number
  recordExcitability: number
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
  const cpgSpec = useMemo(() => (bodySpec ? buildCpgSpec(bodySpec) : null), [bodySpec])

  const handleRef = useRef<SolverHandle | null>(null)
  const wasRunningRef = useRef(false)
  const wasRecordingRef = useRef(false)
  const lastResetRef = useRef(0)
  const lastKickRef = useRef(0)
  const lastPerturbRef = useRef(0)

  const cpgRef = useRef<CpgHandle | null>(null)
  const wasCpgRunningRef = useRef(false)
  const wasCpgRecordingRef = useRef(false)

  const muscleRef = useRef<MuscleHandle | null>(null)
  const wasMuscleRunningRef = useRef(false)
  const wasMuscleRecordingRef = useRef(false)
  const muscleReleasingRef = useRef(false)

  const coupledRef = useRef<CoupledHandle | null>(null)
  const wasCoupledRunningRef = useRef(false)
  const wasCoupledRecordingRef = useRef(false)

  const jointToCpgSegment = useMemo(() => {
    if (!bodySpec) return [] as number[]
    return bodySpec.joints.map((j) => j.segmentIndex)
  }, [bodySpec])

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
    const coupledRunning =
      !calibrating && !running && store.coupledRunning && !!bodySpec && !!cpgSpec
    if (wasMuscleRunningRef.current && !store.muscleTestRunning && !calibrating && !running && !coupledRunning) {
      muscleReleasingRef.current = true
    }
    if (store.muscleTestRunning || running || calibrating || coupledRunning) {
      muscleReleasingRef.current = false
    }
    const muscleRunning =
      !calibrating && !running && !coupledRunning && (store.muscleTestRunning || muscleReleasingRef.current) && !!bodySpec

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
    } else if (coupledRunning && bodySpec && cpgSpec) {
      if (
        !wasCoupledRunningRef.current ||
        !coupledRef.current ||
        coupledRef.current.spec !== bodySpec ||
        coupledRef.current.cpgSpec !== cpgSpec
      ) {
        const bodyState = seedFromManualPose(bodySpec)
        const startCom = centerOfMass(bodyState, bodySpec)
        const delayBuffers: MuscleDelayBuffer[] = []
        for (let i = 0; i < bodySpec.joints.length; i++) {
          delayBuffers.push(createDelayBuffer(FIXED_SUBSTEP_SECONDS))
        }
        coupledRef.current = {
          spec: bodySpec,
          cpgSpec,
          bodyState,
          cpgState: initCpgState(cpgSpec),
          startCom,
          diagAccum: 0,
          recordBaseCom: startCom,
          recordTime: 0,
          recordAccum: RECORD_INTERVAL,
          recordBodySamples: [],
          recordCpgSamples: [],
          delayBuffers,
          jointToCpgSegment,
          recordDrive: store.cpgDrive,
          recordExcitability: store.cpgExcitability,
        }
      }
      const coupled = coupledRef.current

      stepCpg(coupled.cpgState, coupled.cpgSpec, store.cpgDrive, store.cpgExcitability, dt)

      const torques: number[] = new Array(coupled.spec.joints.length)
      for (let i = 0; i < coupled.spec.joints.length; i++) {
        const k = coupled.jointToCpgSegment[i]
        const mL = oscillatorOutput(coupled.cpgState, k) * CPG_TO_MUSCLE_GAIN
        const mR = oscillatorOutput(coupled.cpgState, k + coupled.cpgSpec.n) * CPG_TO_MUSCLE_GAIN
        const delayed = pushAndReadDelayed(coupled.delayBuffers[i], mL, mR)
        torques[i] = ekebergTorque(
          delayed.mL,
          delayed.mR,
          coupled.bodyState.jointAngles[i],
          coupled.bodyState.jointRates[i]
        )
      }

      stepSolver(coupled.bodyState, coupled.spec, dt, torques, 0.1)

      if (headId) {
        const headPivot = pivots.get(headId)
        if (headPivot) headPivot.quaternion.identity()
      }
      for (let i = 0; i < coupled.spec.joints.length; i++) {
        const groupId = coupled.spec.segments[coupled.spec.joints[i].segmentIndex].groupId
        const pivot = pivots.get(groupId)
        if (!pivot) continue
        pivot.quaternion.setFromAxisAngle(Y_AXIS, coupled.bodyState.jointAngles[i])
      }

      const root = rootRef?.current
      if (root) {
        root.position.set(coupled.bodyState.rootX, 0, coupled.bodyState.rootZ)
        root.quaternion.setFromAxisAngle(Y_AXIS, coupled.bodyState.rootHeadingY)
      }

      coupled.diagAccum += dt
      if (coupled.diagAccum >= DIAGNOSTICS_INTERVAL) {
        coupled.diagAccum -= DIAGNOSTICS_INTERVAL
        const d = diagnostics(coupled.bodyState, coupled.spec, coupled.startCom)
        store.setSimDiagnostics(d)
      }

      if (store.simRecording && !wasCoupledRecordingRef.current) {
        coupled.recordBodySamples = []
        coupled.recordCpgSamples = []
        coupled.recordTime = 0
        coupled.recordAccum = RECORD_INTERVAL
        coupled.recordBaseCom = centerOfMass(coupled.bodyState, coupled.spec)
        coupled.recordDrive = store.cpgDrive
        coupled.recordExcitability = store.cpgExcitability
      }
      if (store.simRecording) {
        coupled.recordTime += dt
        coupled.recordAccum += dt
        if (coupled.recordAccum >= RECORD_INTERVAL) {
          coupled.recordAccum = 0
          coupled.recordBodySamples.push(
            buildSample(coupled.recordTime, coupled.bodyState, coupled.spec, coupled.recordBaseCom)
          )
          coupled.recordCpgSamples.push(
            buildCpgSample(coupled.recordTime, coupled.cpgState, coupled.cpgSpec)
          )
        }
      }
    } else if (muscleRunning && bodySpec) {
      if (
        !wasMuscleRunningRef.current ||
        !muscleRef.current ||
        muscleRef.current.spec !== bodySpec
      ) {
        const state = seedFromManualPose(bodySpec)
        const startCom = centerOfMass(state, bodySpec)
        const delayBuffers: MuscleDelayBuffer[] = []
        for (let i = 0; i < bodySpec.joints.length; i++) {
          delayBuffers.push(createDelayBuffer(FIXED_SUBSTEP_SECONDS))
        }
        muscleRef.current = {
          spec: bodySpec,
          state,
          startCom,
          diagAccum: 0,
          recordBaseCom: startCom,
          recordTime: 0,
          recordAccum: RECORD_INTERVAL,
          recordSamples: [],
          delayBuffers,
          testTime: 0,
        }
      }
      const muscle = muscleRef.current
      muscle.testTime += dt

      const effectiveAmplitude = store.muscleTestRunning ? store.muscleTestAmplitude : 0

      const torques: number[] = new Array(muscle.spec.joints.length)
      for (let i = 0; i < muscle.spec.joints.length; i++) {
        const joint = muscle.spec.joints[i]
        const segmentIndex = joint.segmentIndex
        const raw = testActivation(
          muscle.testTime,
          segmentIndex,
          store.muscleTestFreq,
          effectiveAmplitude,
          store.muscleTestPhasePerSeg
        )
        const delayed = pushAndReadDelayed(muscle.delayBuffers[i], raw.mL, raw.mR)
        torques[i] = ekebergTorque(
          delayed.mL,
          delayed.mR,
          muscle.state.jointAngles[i],
          muscle.state.jointRates[i]
        )
      }

      if (muscleReleasingRef.current) {
        let maxAbsAngle = 0
        let maxAbsRate = 0
        for (let i = 0; i < muscle.state.jointAngles.length; i++) {
          const a = Math.abs(muscle.state.jointAngles[i])
          const r = Math.abs(muscle.state.jointRates[i])
          if (a > maxAbsAngle) maxAbsAngle = a
          if (r > maxAbsRate) maxAbsRate = r
        }
        if (maxAbsAngle < 0.01 && maxAbsRate < 0.01) {
          muscleReleasingRef.current = false
        }
      }

      stepSolver(muscle.state, muscle.spec, dt, torques, 0.1)

      if (headId) {
        const headPivot = pivots.get(headId)
        if (headPivot) headPivot.quaternion.identity()
      }
      for (let i = 0; i < muscle.spec.joints.length; i++) {
        const groupId = muscle.spec.segments[muscle.spec.joints[i].segmentIndex].groupId
        const pivot = pivots.get(groupId)
        if (!pivot) continue
        pivot.quaternion.setFromAxisAngle(Y_AXIS, muscle.state.jointAngles[i])
      }

      const root = rootRef?.current
      if (root) {
        root.position.set(muscle.state.rootX, 0, muscle.state.rootZ)
        root.quaternion.setFromAxisAngle(Y_AXIS, muscle.state.rootHeadingY)
      }

      muscle.diagAccum += dt
      if (muscle.diagAccum >= DIAGNOSTICS_INTERVAL) {
        muscle.diagAccum -= DIAGNOSTICS_INTERVAL
        const d = diagnostics(muscle.state, muscle.spec, muscle.startCom)
        store.setSimDiagnostics(d)
      }

      if (store.simRecording && !wasMuscleRecordingRef.current) {
        muscle.recordSamples = []
        muscle.recordTime = 0
        muscle.recordAccum = RECORD_INTERVAL
        muscle.recordBaseCom = centerOfMass(muscle.state, muscle.spec)
      }
      if (store.simRecording) {
        muscle.recordTime += dt
        muscle.recordAccum += dt
        if (muscle.recordAccum >= RECORD_INTERVAL) {
          muscle.recordAccum = 0
          muscle.recordSamples.push(
            buildSample(muscle.recordTime, muscle.state, muscle.spec, muscle.recordBaseCom)
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

    const aphaseRecording = running && store.simRecording
    const muscleRecording = muscleRunning && store.simRecording
    const coupledRecording = coupledRunning && store.simRecording

    if (wasRecordingRef.current && !aphaseRecording) {
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

    if (wasMuscleRecordingRef.current && !muscleRecording) {
      const muscle = muscleRef.current
      if (muscle && muscle.recordSamples.length > 0) {
        const markdown = serializeCapture(
          buildCaptureSpec(muscle.spec),
          subsampleSamples(muscle.recordSamples, MAX_OUTPUT_SAMPLES)
        )
        postCapture(markdown)
      } else {
        store.setLastCapturePath('no muscle samples captured')
      }
    }

    if (wasCoupledRecordingRef.current && !coupledRecording) {
      const coupled = coupledRef.current
      if (coupled && coupled.recordBodySamples.length > 0) {
        const markdown = serializeCoupledCapture(
          buildCaptureSpec(coupled.spec),
          subsampleSamples(coupled.recordBodySamples, MAX_OUTPUT_SAMPLES),
          buildCpgCaptureSpec(coupled.cpgSpec, coupled.spec),
          subsampleCpgSamples(coupled.recordCpgSamples, CPG_MAX_OUTPUT_SAMPLES),
          coupled.recordDrive,
          coupled.recordExcitability
        )
        postCapture(markdown)
      } else {
        store.setLastCapturePath('no coupled samples captured')
      }
    }

    wasRunningRef.current = running
    wasRecordingRef.current = aphaseRecording
    wasMuscleRunningRef.current = muscleRunning
    wasMuscleRecordingRef.current = muscleRecording
    wasCoupledRunningRef.current = coupledRunning
    wasCoupledRecordingRef.current = coupledRecording

    const cpgRunning =
      store.cpgRunning && !calibrating && !coupledRunning && !!bodySpec && !!cpgSpec
    if (cpgRunning && bodySpec && cpgSpec) {
      if (!wasCpgRunningRef.current || !cpgRef.current || cpgRef.current.spec !== cpgSpec) {
        cpgRef.current = {
          spec: cpgSpec,
          bodySpec,
          state: initCpgState(cpgSpec),
          recordTime: 0,
          recordAccum: RECORD_INTERVAL,
          recordSamples: [],
          recordDrive: store.cpgDrive,
          recordExcitability: store.cpgExcitability,
        }
      }
      const cpg = cpgRef.current
      stepCpg(cpg.state, cpg.spec, store.cpgDrive, store.cpgExcitability, dt)

      if (store.cpgRecording && !wasCpgRecordingRef.current) {
        cpg.recordSamples = []
        cpg.recordTime = 0
        cpg.recordAccum = 0
        cpg.recordDrive = store.cpgDrive
        cpg.recordExcitability = store.cpgExcitability
        cpg.recordSamples.push(buildCpgSample(0, cpg.state, cpg.spec))
      }
      if (store.cpgRecording) {
        cpg.recordTime += dt
        cpg.recordSamples.push(buildCpgSample(cpg.recordTime, cpg.state, cpg.spec))
      }
    }

    if (wasCpgRecordingRef.current && !store.cpgRecording) {
      const cpg = cpgRef.current
      if (cpg && cpg.recordSamples.length > 0) {
        const markdown = serializeCpgCapture(
          buildCpgCaptureSpec(cpg.spec, cpg.bodySpec),
          subsampleCpgSamples(cpg.recordSamples, CPG_MAX_OUTPUT_SAMPLES),
          cpg.recordDrive,
          cpg.recordExcitability
        )
        postCapture(markdown)
      } else {
        store.setLastCapturePath('no CPG samples captured')
      }
    }

    wasCpgRunningRef.current = cpgRunning
    wasCpgRecordingRef.current = store.cpgRecording

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
