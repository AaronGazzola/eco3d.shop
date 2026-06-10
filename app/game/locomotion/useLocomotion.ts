'use client'

import { RefObject, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { BodyGroup, SegmentData } from '@/app/admin/_lib/types'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { buildSkeletonTree, effectiveAngleCaps, flattenSkeleton } from './chain'
import { axialChain, buildBody3D, Body3D, CoupledMode } from './body3d'
import { applyEnvironment3D } from './environment'
import { phaseToTarget } from './limbActuation'
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
import { buildCpgSpec, CpgSpec, CpgState, initCpgState, limbPhase, oscillatorOutput, stepCpg } from './cpg'
import { createDelayBuffer, GAMMA, MuscleDelayBuffer, pushAndReadDelayed } from './muscles'

interface GripCaptureSample {
  t: number
  phases: number[]
  fores: number[]
  axialFront: number
  limbOrder: number[]
}
interface GripCaptureState {
  active: boolean
  buffer: GripCaptureSample[]
  startWallTime: number
  maxSamples: number
}
declare global {
  interface Window {
    __gripCapture?: GripCaptureState
  }
}

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const TIMESTEP = 1 / 120
const MAX_FRAME = 0.05
const CPG_TO_MUSCLE_GAIN = 1
const DIAGNOSTICS_INTERVAL = 0.1
const RECORD_INTERVAL = 0.05
const MAX_OUTPUT_SAMPLES = 160
const CPG_MAX_OUTPUT_SAMPLES = 200
// Motorized-hip drive (matches the D2 single-hip bench tuning)
const HIP_K_STIFF = 300
const HIP_DELTA = 12

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
  simTime: number
  mode: CoupledMode
  buildLegs: boolean
  buildGround: boolean
  buildLimbs: boolean
  // per-hip foot plant: while a foot grips, it is pinned to the ground spot it grabbed by a temporary
  // spherical joint to a fixed anchor body (so the body is levered over the planted foot — real
  // traction that does not depend on contact normal force). null = that foot is currently free.
  gripPlantJoint: (RAPIER.ImpulseJoint | null)[]
  gripPlantBody: (RAPIER.RigidBody | null)[]
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
  bodyRefs: RefObject<Map<string, THREE.Group>>,
  groups: BodyGroup[],
  _segments: SegmentData[] = [],
  rootRef?: RefObject<THREE.Group | null>,
  footGlowRef?: RefObject<Map<string, THREE.Mesh>>
) {
  const targetQuat = useRef(new THREE.Quaternion())
  const scratch = useRef({
    qYaw: new THREE.Quaternion(),
    qPitch: new THREE.Quaternion(),
    qLeg: new THREE.Quaternion(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    mat: new THREE.Matrix4(),
    matT: new THREE.Matrix4(),
    one: new THREE.Vector3(1, 1, 1),
  })

  const skeletonGroups = useMemo(() => flattenSkeleton(buildSkeletonTree(groups)), [groups])
  const allLegs = useMemo(
    () => groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right'),
    [groups]
  )
  const legIdSet = useMemo(() => new Set(allLegs.map((g) => g.id)), [allLegs])
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

  const axial = useMemo(() => axialChain(groups), [groups])
  const segLengths = axial.lengths
  const chainGroupIds = axial.groupIds
  // Signal preview includes the four limb oscillators (D1) when the rig has both girdles + four legs.
  const cpgSpec = useMemo(
    () => (segLengths.length > 0 ? buildCpgSpec(segLengths, groups, chainGroupIds) : null),
    [segLengths, groups, chainGroupIds]
  )

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

  function buildCoupled(mode: CoupledMode): CoupledHandle | null {
    if (!rapierReady.current) return null
    const st = useAnimateStore.getState()
    const gravityOn = st.gravityEnabled
    // Land-rig parts are independently strippable so the rig can be reduced to exactly swim (no
    // legs, no floor, axial-only CPG) and then rebuilt one piece at a time.
    const legsOn = mode === 'land' && st.landLegsEnabled
    const groundOn = mode === 'land' && st.landGroundEnabled
    const limbsOn = mode === 'land' && st.limbCpgEnabled
    const world = new RAPIER.World({ x: 0, y: mode === 'land' && gravityOn ? -9.81 : 0, z: 0 })
    world.timestep = TIMESTEP
    const body = buildBody3D(world, groups, mode, { buildLegs: legsOn, buildGround: groundOn })
    if (!body) { world.free(); return null }
    // Build the CPG from the AXIAL chain only (body.segLength has the 4 legs appended in land mode,
    // which would corrupt the oscillator count). The four limb oscillators are added independently
    // of the leg bodies (own toggle); otherwise stay axial-only, exactly like swim.
    const axial = axialChain(groups)
    const spec = limbsOn
      ? buildCpgSpec(axial.lengths, groups, axial.groupIds)
      : buildCpgSpec(axial.lengths)
    const baseCom = comOf(body)
    return {
      groups, world, body, cpgSpec: spec, cpgState: initCpgState(spec),
      delayBuffers: body.joints.map(() => createDelayBuffer(TIMESTEP)),
      acc: 0, simTime: 0, mode, buildLegs: legsOn, buildGround: groundOn, buildLimbs: limbsOn,
      gripPlantJoint: body.hipJoints.map(() => null),
      gripPlantBody: body.hipJoints.map(() => null),
      baseCom, diagAccum: 0,
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
    const coupledMode = store.coupledMode

    if (coupledRunning) {
      // Legs/ground are structural (baked at build), so a toggle change forces a rebuild; gravity is
      // applied live each frame and does not.
      const wantLegs = coupledMode === 'land' && store.landLegsEnabled
      const wantGround = coupledMode === 'land' && store.landGroundEnabled
      const wantLimbs = coupledMode === 'land' && store.limbCpgEnabled
      if (
        !coupledRef.current ||
        coupledRef.current.groups !== groups ||
        coupledRef.current.mode !== coupledMode ||
        coupledRef.current.buildLegs !== wantLegs ||
        coupledRef.current.buildGround !== wantGround ||
        coupledRef.current.buildLimbs !== wantLimbs
      ) {
        freeCoupled()
        coupledRef.current = buildCoupled(coupledMode)
      }
      const c = coupledRef.current
      if (c) {
        const drive = store.cpgDrive
        const exc = store.cpgExcitability
        const alpha = store.muscleAlpha
        const beta = store.muscleBeta
        const jointDamping = store.muscleDamping
        const stepEnabled = store.stepEnabled
        const stepPhase = store.stepPhase
        const gripEnabled = store.gripEnabled && !stepEnabled
        const legsLockedConst = store.legsLocked
        // Live per-collider friction: trunk slides (low) so the axial wave isn't pinned to the
        // floor; feet grip (high) for traction. Ground is friction 1.0 with a MULTIPLY combine rule,
        // so the effective surface friction equals each collider's own coefficient.
        if (c.mode === 'land') {
          const bodyFriction = store.bodyFriction
          const legFriction = store.legFriction
          // Feet only carry full grip while actively walking (sweep). Otherwise they default to the
          // low release friction so they SLIDE — the body undulates freely and grip-off truly means
          // "don't grip". The grip primitive (below) then overrides per-foot when it's on.
          const restLegFriction = stepEnabled ? legFriction : store.releaseFriction
          for (let i = 0; i < c.body.colliders.length; i++) {
            c.body.colliders[i].setFriction(legIdSet.has(c.body.groupIds[i]) ? restLegFriction : bodyFriction)
          }
          for (const gc of c.body.groundContacts) gc.setFriction(bodyFriction)
          // Live gravity toggle: lets us see the land rig (legs + floor + friction) with no downward
          // pull, isolating how much the legs/feet anchor the body independent of gravity.
          c.world.gravity.y = store.gravityEnabled ? -9.81 : 0

          // GRIP primitive: phase comes straight from the limb CPG oscillator, so the grip window
          // is driven by the locomotor rhythm itself — not by the foot's measured reach (which gets
          // frozen the moment we plant the foot, creating a feedback loop that destroys the wave).
          // gripStrength=0 keeps timing/glow live but skips the plant + friction switch — lets the
          // user see when grip *would* fire without engaging the physics.
          const glowOn = store.gripGlowEnabled
          const glows = footGlowRef?.current
          if (gripEnabled && c.body.hipJoints.length > 0) {
            const hips = c.body.hipJoints
            const gripShift = store.gripShift
            const gripDuration = store.gripDuration
            const gripStrength = store.gripStrength
            const releaseFriction = store.releaseFriction
            const gripFriction = store.legFriction
            const gripLegs = store.gripLegs
            const physicalGrip = gripStrength > 0
            for (let h = 0; h < hips.length; h++) {
              const hip = hips[h]
              const isHind = hip.limbIdx >= 2
              const selected = gripLegs === 'both' || (gripLegs === 'front' ? !isHind : isHind)
              const leg = c.body.bodies[hip.legBodyIndex]
              const lp = leg.translation(); const lq = leg.rotation()
              s.v2.set(hip.footLocal.x, hip.footLocal.y, hip.footLocal.z)
                .applyQuaternion(s.q.set(lq.x, lq.y, lq.z, lq.w))
              const footX = lp.x + s.v2.x, footY = lp.y + s.v2.y, footZ = lp.z + s.v2.z
              const phase = limbPhase(c.cpgState, c.cpgSpec, hip.limbIdx) / (2 * Math.PI)
              const rel = ((phase - gripShift) % 1 + 1) % 1
              const inWindow = selected && rel < gripDuration
              const gripping = inWindow && physicalGrip
              c.body.colliders[hip.legBodyIndex].setFriction(gripping ? gripFriction : releaseFriction)

              // Plant/unplant: on the rising edge of gripping, pin this foot to the ground spot it
              // currently occupies (spherical joint to a fixed anchor) so the body is dragged over
              // the planted foot. On the falling edge, release it so it can swing forward freely.
              const planted = c.gripPlantJoint[h]
              if (gripping && !planted) {
                const abd = RAPIER.RigidBodyDesc.fixed().setTranslation(footX, footY, footZ)
                const anchor = c.world.createRigidBody(abd)
                const jd = RAPIER.JointData.spherical(
                  { x: hip.footLocal.x, y: hip.footLocal.y, z: hip.footLocal.z },
                  { x: 0, y: 0, z: 0 }
                )
                c.gripPlantJoint[h] = c.world.createImpulseJoint(jd, leg, anchor, true)
                c.gripPlantBody[h] = anchor
              } else if (!gripping && planted) {
                c.world.removeImpulseJoint(planted, true)
                if (c.gripPlantBody[h]) c.world.removeRigidBody(c.gripPlantBody[h]!)
                c.gripPlantJoint[h] = null
                c.gripPlantBody[h] = null
              }

              const glow = glows?.get(c.body.groupIds[hip.legBodyIndex])
              if (glow) {
                glow.position.set(footX, footY, footZ)
                glow.visible = glowOn && inWindow
                const mat = glow.material as THREE.MeshBasicMaterial
                mat.color.set('#00e5ff')
                mat.opacity = 1
              }
            }
          } else {
            // grip disabled: release any planted feet and hide all glows
            for (let h = 0; h < c.body.hipJoints.length; h++) {
              const planted = c.gripPlantJoint[h]
              if (planted) {
                c.world.removeImpulseJoint(planted, true)
                if (c.gripPlantBody[h]) c.world.removeRigidBody(c.gripPlantBody[h]!)
                c.gripPlantJoint[h] = null
                c.gripPlantBody[h] = null
              }
            }
            if (glows) for (const m of glows.values()) m.visible = false
          }
        }
        let acc = c.acc + Math.min(dt, MAX_FRAME)
        while (acc >= TIMESTEP) {
          stepCpg(c.cpgState, c.cpgSpec, drive, exc, TIMESTEP)
          for (let i = 0; i < c.body.joints.length; i++) {
            const jt = c.body.joints[i]
            const k = jt.cpgSegment
            const mL = oscillatorOutput(c.cpgState, k) * CPG_TO_MUSCLE_GAIN
            const mR = oscillatorOutput(c.cpgState, k + c.cpgSpec.n) * CPG_TO_MUSCLE_GAIN
            const d = pushAndReadDelayed(c.delayBuffers[i], mL, mR)
            // Ekeberg muscle as a spring-damper applied via Rapier's implicit ForceBased motor:
            // T = α(mL−mR) − β(mL+mR+γ)φ − δφ̇ = −kStiff(φ−φEq) − δφ̇. Implicit integration → no
            // numerical energy injection (an explicit external torque pumps energy and runs away).
            const kStiff = beta * (d.mL + d.mR + GAMMA)
            const phiEq = kStiff > 1e-9 ? (alpha * (d.mL - d.mR)) / kStiff : 0
            ;(jt.joint as RAPIER.RevoluteImpulseJoint).configureMotorPosition(phiEq, kStiff, jointDamping)
          }
          // D3: drive each hip from its LIMB CPG oscillator through the transfer function. The
          // diagonal trot emerges from the Table 2 couplings; the tilted hinge axis turns the sweep
          // into a step (foot lifts in swing, plants in stance). Walking off → hold rest so it stands.
          if (c.body.hipJoints.length > 0) {
            for (let hi = 0; hi < c.body.hipJoints.length; hi++) {
              const hip = c.body.hipJoints[hi]
              if (stepEnabled) {
                // stepPhase shifts WHEN in the body cycle the leg steps (live tuning knob): it
                // re-anchors the transfer function relative to the limb oscillator → slides the
                // footfall vs the wave.
                const phi = limbPhase(c.cpgState, c.cpgSpec, hip.limbIdx) + stepPhase
                const sweep = phaseToTarget(phi, hip.capStance, hip.capSwing)
                hip.joint.configureMotorPosition(sweep, HIP_K_STIFF, HIP_DELTA)
              } else if (gripEnabled && c.gripPlantJoint[hi] != null) {
                // A planted foot's hip goes FREE (zero stiffness) regardless of the Lock toggle, so
                // the spine wave can carry the girdle forward over the pinned foot — the leg trails
                // like stepping over your own foot.
                hip.joint.configureMotorPosition(0, 0, HIP_DELTA)
              } else {
                // Resting hip: LOCKED = stiff at rest (rigid strut; the body wave swings the foot
                // fore/aft and, for grip, reaches it forward to re-plant). UNLOCKED = free/passive
                // (legs dangle and are dragged by the body, like swim's passenger legs).
                hip.joint.configureMotorPosition(0, legsLockedConst ? HIP_K_STIFF : 0, HIP_DELTA)
              }
            }
          }
          for (const b of c.body.bodies) b.wakeUp() // motor doesn't auto-wake; keep the chain awake
          c.world.step()
          if (store.environmentEnabled) applyEnvironment3D(c.body, TIMESTEP)
          acc -= TIMESTEP
        }
        c.acc = acc

        // TRUTHFUL render: draw each chain segment at its actual Rapier body transform. The mesh
        // lives in model space, so its group matrix = Translate(t)·Rotate(q)·Translate(−restCenter).
        // What is drawn is exactly what the physics simulates — no kinematic-puppet reconstruction.
        const segGroups = bodyRefs.current
        if (segGroups) {
          for (let i = 0; i < c.body.bodies.length; i++) {
            const groupId = c.body.groupIds[i]
            const g = segGroups.get(groupId)
            if (!g) continue
            const b = c.body.bodies[i]
            const t = b.translation()
            const q = b.rotation()
            const rc = c.body.restCenters[i]
            s.q.set(q.x, q.y, q.z, q.w)
            s.v1.set(t.x, t.y, t.z)
            s.mat.compose(s.v1, s.q, s.one)
            s.matT.makeTranslation(-rc.x, -rc.y, -rc.z)
            s.mat.multiply(s.matT)
            g.matrix.copy(s.mat)
            g.matrixWorldNeedsUpdate = true
          }
        }
        const root = rootRef?.current
        if (root) {
          root.position.set(0, 0, 0)
          root.quaternion.identity()
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
            comYDrift: samp.comY - c.baseCom.y,
            maxTiltDeg: samp.maxTiltDeg,
          })
        }

        const cap = typeof window !== 'undefined' ? window.__gripCapture : undefined
        if (cap?.active && c.body.hipJoints.length > 0 && cap.buffer.length < cap.maxSamples) {
          const hips = c.body.hipJoints
          const trunkCount = c.body.bodies.length - hips.length
          const head = c.body.bodies[0].translation()
          const tail = c.body.bodies[Math.max(0, trunkCount - 1)].translation()
          s.v1.set(head.x - tail.x, 0, head.z - tail.z)
          if (s.v1.lengthSq() < 1e-9) s.v1.set(1, 0, 0)
          s.v1.normalize()
          const fwdX = s.v1.x, fwdY = s.v1.y, fwdZ = s.v1.z
          const phases: number[] = []
          const fores: number[] = []
          for (const hip of hips) {
            const g = c.body.bodies[hip.parentIndex]
            const leg = c.body.bodies[hip.legBodyIndex]
            const gp = g.translation(); const gq = g.rotation()
            const lp = leg.translation(); const lq = leg.rotation()
            s.v2.set(hip.hipLocal.x, hip.hipLocal.y, hip.hipLocal.z)
              .applyQuaternion(s.q.set(gq.x, gq.y, gq.z, gq.w))
            const hipX = gp.x + s.v2.x, hipY = gp.y + s.v2.y, hipZ = gp.z + s.v2.z
            s.v2.set(hip.footLocal.x, hip.footLocal.y, hip.footLocal.z)
              .applyQuaternion(s.q.set(lq.x, lq.y, lq.z, lq.w))
            const footX = lp.x + s.v2.x, footY = lp.y + s.v2.y, footZ = lp.z + s.v2.z
            const fore = (footX - hipX) * fwdX + (footY - hipY) * fwdY + (footZ - hipZ) * fwdZ
            phases.push(limbPhase(c.cpgState, c.cpgSpec, hip.limbIdx) / (2 * Math.PI))
            fores.push(fore)
          }
          const kFore = c.cpgSpec.limbWiring?.kFore ?? 0
          const axialFront = (c.cpgState.phases[kFore] ?? 0) / (2 * Math.PI)
          const t = (performance.now() - cap.startWallTime) / 1000
          cap.buffer.push({ t, phases, fores, axialFront, limbOrder: hips.map((h) => h.limbIdx) })
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
