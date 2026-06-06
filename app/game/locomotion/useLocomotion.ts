'use client'

import { RefObject, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { BodyGroup, SegmentData } from '@/app/admin/_lib/types'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { buildSkeletonTree, effectiveAngleCaps, flattenSkeleton } from './chain'
import { axialLengths, buildBody3D, Body3D, jointAngle, jointRate, worldAxis } from './body3d'
import { applyEnvironment3D } from './environment'
import {
  buildCaptureSpec3D,
  buildSample3D,
  CaptureSample,
  buildCpgCaptureSpec,
  buildCpgSample,
  CpgCaptureSample,
  serializeCpgCapture,
  subsampleCpgSamples,
  subsampleSamples,
  serializeCoupledCapture,
} from './diagnostics'
import { buildCpgSpec, CpgSpec, CpgState, initCpgState, oscillatorOutput, stepCpg } from './cpg'
import { createDelayBuffer, ekebergTorque, MuscleDelayBuffer, pushAndReadDelayed } from './muscles'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const TIMESTEP = 1 / 120
const MAX_FRAME = 0.05
const CPG_TO_MUSCLE_GAIN = 1
const JOINT_DAMPING_3D = 2
const DIAGNOSTICS_INTERVAL = 0.1
const RECORD_INTERVAL = 0.05
const MAX_OUTPUT_SAMPLES = 160
const CPG_MAX_OUTPUT_SAMPLES = 200

interface JointCapEntry {
  groupId: string
  yawForward: number
  yawBackward: number
}

interface CoupledHandle {
  groups: BodyGroup[]
  world: RAPIER.World
  body: Body3D
  cpgSpec: CpgSpec
  cpgState: CpgState
  delayBuffers: MuscleDelayBuffer[]
  acc: number
  baseCom: { x: number; y: number; z: number }
  diagAccum: number
  recordTime: number
  recordAccum: number
  recordBaseCom: { x: number; y: number; z: number }
  recordBodySamples: CaptureSample[]
  recordCpgSamples: CpgCaptureSample[]
  recordDrive: number
  recordExcitability: number
}

interface CpgHandle {
  spec: CpgSpec
  segLengths: number[]
  state: CpgState
  recordTime: number
  recordSamples: CpgCaptureSample[]
  recordDrive: number
  recordExcitability: number
}

function comOf(body: Body3D): { x: number; y: number; z: number } {
  let m = 0, x = 0, y = 0, z = 0
  for (const b of body.bodies) {
    const p = b.translation()
    const bm = b.mass()
    m += bm; x += bm * p.x; y += bm * p.y; z += bm * p.z
  }
  if (m <= 0) m = 1
  return { x: x / m, y: y / m, z: z / m }
}

function postCapture(markdown: string): void {
  fetch('/api/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Capture upload failed: ${res.status} ${await res.text()}`)
      return res.json()
    })
    .then((data) => useAnimateStore.getState().setLastCapturePath(data.path))
    .catch((err) => {
      console.error(err)
      useAnimateStore.getState().setLastCapturePath('failed — see console')
    })
}

export function useLocomotion(
  pivotsRef: RefObject<Map<string, THREE.Group>>,
  groups: BodyGroup[],
  _segments: SegmentData[] = [],
  rootRef?: RefObject<THREE.Group | null>
) {
  const targetQuat = useRef(new THREE.Quaternion())
  const scratch = useRef({
    qYaw: new THREE.Quaternion(),
    qPitch: new THREE.Quaternion(),
    qLeg: new THREE.Quaternion(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    q: new THREE.Quaternion(),
  })

  const skeletonGroups = useMemo(() => flattenSkeleton(buildSkeletonTree(groups)), [groups])
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
      out.push({ groupId: g.id, yawForward: caps.yaw, yawBackward: caps.yawBack ?? caps.yaw })
    }
    return out
  }, [skeletonGroups])

  const segLengths = useMemo(() => axialLengths(groups), [groups])
  const cpgSpec = useMemo(() => (segLengths.length > 0 ? buildCpgSpec(segLengths) : null), [segLengths])

  const rapierReady = useRef(false)
  useEffect(() => {
    let live = true
    RAPIER.init().then(() => { if (live) rapierReady.current = true })
    return () => { live = false }
  }, [])

  const coupledRef = useRef<CoupledHandle | null>(null)
  const wasCoupledRunningRef = useRef(false)
  const wasCoupledRecordingRef = useRef(false)

  const cpgRef = useRef<CpgHandle | null>(null)
  const wasCpgRunningRef = useRef(false)
  const wasCpgRecordingRef = useRef(false)

  function freeCoupled() {
    if (coupledRef.current) {
      coupledRef.current.world.free()
      coupledRef.current = null
    }
  }
  useEffect(() => () => freeCoupled(), [])

  function buildCoupled(): CoupledHandle | null {
    if (!rapierReady.current) return null
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
    world.timestep = TIMESTEP
    const body = buildBody3D(world, groups)
    if (!body) { world.free(); return null }
    const spec = buildCpgSpec(body.segLength)
    const baseCom = comOf(body)
    return {
      groups, world, body, cpgSpec: spec, cpgState: initCpgState(spec),
      delayBuffers: body.joints.map(() => createDelayBuffer(TIMESTEP)),
      acc: 0, baseCom, diagAccum: 0,
      recordTime: 0, recordAccum: RECORD_INTERVAL, recordBaseCom: baseCom,
      recordBodySamples: [], recordCpgSamples: [],
      recordDrive: 0, recordExcitability: 0,
    }
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

    const coupledRunning = !calibrating && store.coupledRunning && !!cpgSpec && rapierReady.current

    if (coupledRunning) {
      if (!coupledRef.current || coupledRef.current.groups !== groups) {
        freeCoupled()
        coupledRef.current = buildCoupled()
      }
      const c = coupledRef.current
      if (c) {
        const drive = store.cpgDrive
        const exc = store.cpgExcitability
        let acc = c.acc + Math.min(dt, MAX_FRAME)
        while (acc >= TIMESTEP) {
          stepCpg(c.cpgState, c.cpgSpec, drive, exc, TIMESTEP)
          for (let i = 0; i < c.body.joints.length; i++) {
            const jt = c.body.joints[i]
            const k = jt.cpgSegment
            const mL = oscillatorOutput(c.cpgState, k) * CPG_TO_MUSCLE_GAIN
            const mR = oscillatorOutput(c.cpgState, k + c.cpgSpec.n) * CPG_TO_MUSCLE_GAIN
            const d = pushAndReadDelayed(c.delayBuffers[i], mL, mR)
            const phi = jointAngle(jt, c.body.bodies)
            const phiDot = jointRate(jt, c.body.bodies)
            const tau = ekebergTorque(d.mL, d.mR, phi, phiDot) - JOINT_DAMPING_3D * phiDot
            const ax = worldAxis(jt, c.body.bodies)
            c.body.bodies[jt.childIndex].addTorque({ x: ax.x * tau, y: ax.y * tau, z: ax.z * tau }, true)
            c.body.bodies[jt.parentIndex].addTorque({ x: -ax.x * tau, y: -ax.y * tau, z: -ax.z * tau }, true)
          }
          c.world.step()
          if (store.environmentEnabled) applyEnvironment3D(c.body, TIMESTEP)
          acc -= TIMESTEP
        }
        c.acc = acc

        // render from engine: root = head node pose, pivots = joint yaws
        if (headId) {
          const headPivot = pivots.get(headId)
          if (headPivot) headPivot.quaternion.identity()
        }
        for (let i = 0; i < c.body.joints.length; i++) {
          const jt = c.body.joints[i]
          const groupId = c.body.groupIds[jt.childIndex]
          const pivot = pivots.get(groupId)
          if (!pivot) continue
          pivot.quaternion.setFromAxisAngle(Y_AXIS, jointAngle(jt, c.body.bodies))
        }
        const root = rootRef?.current
        if (root) {
          const head = c.body.bodies[0]
          const hp = head.translation()
          const hq = head.rotation()
          s.q.set(hq.x, hq.y, hq.z, hq.w)
          s.fwd.set(1, 0, 0).applyQuaternion(s.q).multiplyScalar(c.body.segLength[0] / 2)
          root.position.set(hp.x - s.fwd.x, hp.y - s.fwd.y, hp.z - s.fwd.z)
          root.quaternion.copy(s.q)
        }

        c.diagAccum += dt
        if (c.diagAccum >= DIAGNOSTICS_INTERVAL) {
          c.diagAccum -= DIAGNOSTICS_INTERVAL
          const samp = buildSample3D(0, c.body, c.baseCom)
          store.setSimDiagnostics({
            kineticEnergy: samp.kineticEnergy,
            comX: samp.comX,
            comZ: samp.comZ,
            comDriftFromStart: samp.comDrift,
            maxJointFracOfCap: samp.maxJointFracOfCap,
          })
        }

        if (store.simRecording && !wasCoupledRecordingRef.current) {
          c.recordBodySamples = []
          c.recordCpgSamples = []
          c.recordTime = 0
          c.recordAccum = RECORD_INTERVAL
          c.recordBaseCom = comOf(c.body)
          c.recordDrive = drive
          c.recordExcitability = exc
        }
        if (store.simRecording) {
          c.recordTime += dt
          c.recordAccum += dt
          if (c.recordAccum >= RECORD_INTERVAL) {
            c.recordAccum = 0
            c.recordBodySamples.push(buildSample3D(c.recordTime, c.body, c.recordBaseCom))
            c.recordCpgSamples.push(buildCpgSample(c.recordTime, c.cpgState, c.cpgSpec))
          }
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

    if (!coupledRunning) freeCoupled()

    const coupledRecording = coupledRunning && store.simRecording
    if (wasCoupledRecordingRef.current && !coupledRecording) {
      const c = coupledRef.current
      if (c && c.recordBodySamples.length > 0) {
        const markdown = serializeCoupledCapture(
          buildCaptureSpec3D(c.body),
          subsampleSamples(c.recordBodySamples, MAX_OUTPUT_SAMPLES),
          buildCpgCaptureSpec(c.cpgSpec, c.body.segLength),
          subsampleCpgSamples(c.recordCpgSamples, CPG_MAX_OUTPUT_SAMPLES),
          c.recordDrive,
          c.recordExcitability
        )
        postCapture(markdown)
      } else {
        store.setLastCapturePath('no coupled samples captured')
      }
    }
    wasCoupledRunningRef.current = coupledRunning
    wasCoupledRecordingRef.current = coupledRecording

    // CPG preview (signal only, no body)
    const cpgRunning = store.cpgRunning && !calibrating && !coupledRunning && !!cpgSpec
    if (cpgRunning && cpgSpec) {
      if (!wasCpgRunningRef.current || !cpgRef.current || cpgRef.current.spec !== cpgSpec) {
        cpgRef.current = {
          spec: cpgSpec,
          segLengths,
          state: initCpgState(cpgSpec),
          recordTime: 0,
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
          buildCpgCaptureSpec(cpg.spec, cpg.segLengths),
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

    // legs are render-only passengers (Phase D will simulate them)
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
          calibratingLeg.type === 'leg-left' ? parentSpine?.nodeHipLeft : parentSpine?.nodeHipRight
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
