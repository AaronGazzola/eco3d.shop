'use client'

import { RefObject, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { BodyGroup, SegmentData } from '@/app/admin/_lib/types'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { buildSkeletonTree, effectiveAngleCaps, flattenSkeleton } from './chain'
import { axialChain, buildBody3D, Body3D, jointAngle } from './body3d'
import { applyEnvironment3D } from './environment'
import {
  buildCaptureSpec3D,
  buildSample3D,
  CaptureSample,
  buildCpgCaptureSpec,
  buildCpgSample,
  CpgCaptureSample,
  subsampleCpgSamples,
  subsampleSamples,
  serializeCoupledCapture,
} from './diagnostics'
import { buildCpgSpec, CpgSpec, CpgState, initCpgState, limbPhase, oscillatorOutput, signedActivation, stepCpg } from './cpg'
import { createDelayBuffer, GAMMA, MuscleDelayBuffer, pushAndReadDelayed } from './muscles'

interface GripCaptureSample {
  t: number
  phases: number[]
  fores: number[]
  // commanded sweep target per leg (rad). Same formula as the controller; lets the writer compare
  // Δsweep_target vs Δfore over each grip ON-window — splits "controller asks wrong way" from
  // "controller asks correctly but the foot moves the other way" (axis-sign bug).
  sweeps: number[]
  // whether the controller classified each leg as "stance" (rel < stepDuty) this frame; lets the
  // writer cross-check whether the grip ON window aligns with the stance half-cycle.
  stance: boolean[]
  // foot world Y per leg — lets the writer detect lift during the swing window (foot rises above
  // its grip-OFF height = clearance, stays flat = scrape).
  footYs: number[]
  axialFront: number
  limbOrder: number[]
}
interface GripCaptureState {
  active: boolean
  buffer: GripCaptureSample[]
  startWallTime: number
  maxSamples: number
}
interface NodeCaptureSample {
  t: number
  nodes: { x: number; y: number; z: number }[]
  // Per-axial-segment CPG ACTIVITY (signed muscle activation = left osc out − right osc out). This is
  // the NEURAL signal the paper's Fig 6 standing/traveling-wave classification is based on — distinct
  // from the mechanical body curvature (node positions), which lags it by the EMG-to-curvature delay.
  cpg?: number[]
}
// A primitive-window boundary crossing, detected at render rate from the CPG phase alone (so it is
// observed WITHOUT the grip/step switches being on — the behaviour never interferes). Optionally
// carries the full node snapshot at the boundary instant.
interface NodeCaptureEvent {
  t: number
  leg: string
  primitive: 'grip' | 'sweep' | 'lift'
  edge: 'start' | 'end'
  rel: number
  phase: number
  nodes?: { x: number; y: number; z: number }[]
}
interface NodeCaptureState {
  active: boolean
  hz: number
  buffer: NodeCaptureSample[]
  startWallTime: number
  lastSampleTime: number
  maxSamples: number
  // Window-timing tracking (passive): record grip/sweep/lift start/end edges from the CPG phase.
  events: boolean
  // Also attach a node-position snapshot to each recorded edge.
  eventSnapshots: boolean
  eventBuffer: NodeCaptureEvent[]
  prevWindows?: { grip: boolean; sweep: boolean; lift: boolean }[]
  // Per-leg foot-reach phase accumulator (only when events on). Each frame we project the foot's
  // fore-aft reach (driven by the body wave through the locked leg) onto cos/sin of that leg's limb
  // phase. The first-harmonic phase atan2(S,C) is the limb phase at MAX-FORWARD reach (φ_fwd); max
  // backward is half a cycle later. This is how grip/sweep timing is locked to the undulation cycle —
  // measured with grip AND step OFF so the behaviour never perturbs the wave it is being timed against.
  // c/s project foot reach onto the LIMB oscillator phase; cAx/sAx onto the girdle's AXIAL oscillator
  // phase. The axial reference is the one that should be drive-invariant (commanded girdle yaw peaks at
  // a fixed axial phase), so it is the correct clock to lock grip/sweep timing to.
  reachAccum?: { c: number; s: number; n: number; cAx: number; sAx: number; minFore: number; maxFore: number; phiAtMin: number; phiAtMax: number }[]
  reachLegs?: string[]
}
interface NodeCaptureSpec {
  count: number
  groupIds: string[]
  segLength: number[]
}
// Read-only observation snapshot published every frame for the overlay layer (Increment B). Holds, per
// girdle/leg: the measured undulation phase, the stance/swing flag, and the max-forward-reach world
// position (the girdle-derived foot-rest point the grip timing is locked to). Arrays are preallocated
// and mutated in place — no per-frame allocation.
interface LocObs {
  legs: string[]
  phase: number[]
  stance: boolean[]
  gripped: boolean[]
  reach: { x: number; y: number; z: number }[]
  foot: { x: number; y: number; z: number }[]
  hip: { x: number; y: number; z: number }[]
  trunk: { x: number; y: number; z: number }[]
}
declare global {
  interface Window {
    __gripCapture?: GripCaptureState
    __nodeCapture?: NodeCaptureState
    __nodeCaptureSpec?: NodeCaptureSpec
    __locObs?: LocObs
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
// limbIdx (LF=0, RF=1, LH=2, RH=3) → grip-foot key used by the per-foot grip toggles.
const GRIP_FOOT_BY_LIMB = ['FL', 'FR', 'BL', 'BR'] as const

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
  buildLegs: boolean
  buildGround: boolean
  buildLimbs: boolean
  // per-hip foot plant: while a foot grips, it is pinned to the ground spot it grabbed by a temporary
  // spherical joint to a fixed anchor body (so the body is levered over the planted foot — real
  // traction that does not depend on contact normal force). null = that foot is currently free.
  gripPlantJoint: (RAPIER.ImpulseJoint | null)[]
  gripPlantBody: (RAPIER.RigidBody | null)[]
  // Per-hip MECHANICAL-PHASE tracker: the foot's body-wave-driven fore-aft reach is turned into a phase
  // (0 = max-forward reach, 0.5 = max-backward) by RMS-normalised quadrature, so it is frequency-free
  // and invariant to drive/muscle. Grip + sweep are timed off this measured phase, not the CPG clock.
  mechPhase: { mean: number; prevR: number; msR: number; msRdot: number; phase: number; primed: boolean }[]
  baseCom: { x: number; y: number; z: number }
  diagAccum: number
  recordTime: number
  recordAccum: number
  recordBaseCom: { x: number; y: number; z: number }
  recordBodySamples: CaptureSample[]
  recordCpgSamples: CpgCaptureSample[]
  recordDrive: number
  recordExcitability: number
  trunkIdx: number[]
  obs: LocObs
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

// Turn a measured fore-aft reach signal into a cycle phase (0..1, 0 = max-forward reach) WITHOUT
// knowing the frequency. Track a slow DC mean (removes net translation), then the AC value r and its
// rate ṙ, each RMS-normalised; for a sinusoid −ṙ/rms(ṙ) and r/rms(r) are sin and cos of the cycle, so
// atan2 recovers the phase regardless of amplitude or frequency. Drift/muscle-invariant by construction.
function updateMechPhase(
  st: { mean: number; prevR: number; msR: number; msRdot: number; phase: number; primed: boolean },
  reach: number,
  dt: number
): number {
  const tau = 0.6
  const a = Math.min(1, Math.max(dt, 1e-4) / tau)
  if (!st.primed) {
    st.mean = reach; st.prevR = 0; st.msR = 1e-6; st.msRdot = 1e-6; st.primed = true; st.phase = 0
    return 0
  }
  st.mean += a * (reach - st.mean)
  const r = reach - st.mean
  const rdot = (r - st.prevR) / Math.max(dt, 1e-4)
  st.prevR = r
  st.msR += a * (r * r - st.msR)
  st.msRdot += a * (rdot * rdot - st.msRdot)
  const rn = r / Math.sqrt(st.msR + 1e-9)
  const rdn = rdot / Math.sqrt(st.msRdot + 1e-9)
  const ph = Math.atan2(-rdn, rn) / (2 * Math.PI)
  st.phase = ((ph % 1) + 1) % 1
  return st.phase
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

  function freeCoupled() {
    if (coupledRef.current) {
      coupledRef.current.world.free()
      coupledRef.current = null
    }
  }
  useEffect(() => () => freeCoupled(), [])

  function buildCoupled(): CoupledHandle | null {
    if (!rapierReady.current) return null
    const st = useAnimateStore.getState()
    const gravityOn = st.gravityEnabled
    // Every rig part is an independent toggle. With legs, ground, limbs and gravity all off the rig
    // reduces to a bare axial swimmer; each switch rebuilds one piece back on.
    const legsOn = st.landLegsEnabled
    const groundOn = st.landGroundEnabled
    const limbsOn = st.limbCpgEnabled
    const world = new RAPIER.World({ x: 0, y: gravityOn ? -9.81 : 0, z: 0 })
    world.timestep = TIMESTEP
    const body = buildBody3D(world, groups, { buildLegs: legsOn, buildGround: groundOn })
    if (!body) { world.free(); return null }
    // Build the CPG from the AXIAL chain only (body.segLength has the 4 legs appended when legs are
    // built, which would corrupt the oscillator count). The four limb oscillators are added
    // independently of the leg bodies (own toggle); otherwise stay axial-only.
    const axial = axialChain(groups)
    const spec = limbsOn
      ? buildCpgSpec(axial.lengths, groups, axial.groupIds)
      : buildCpgSpec(axial.lengths)
    // The CPG now runs at a fine resolution decoupled from the body's joints (paper Fig 2A). Remap each
    // body joint from its body-segment index to the fine-CPG oscillator it samples, so the muscle reads
    // the correct point of the fine chain (left = oscOfSegment[i], right = +spec.n).
    for (const jt of body.joints) jt.cpgSegment = spec.oscOfSegment[jt.cpgSegment] ?? jt.cpgSegment
    const baseCom = comOf(body)
    const trunkIdx: number[] = []
    for (let i = 0; i < body.groupIds.length; i++) if (!legIdSet.has(body.groupIds[i])) trunkIdx.push(i)
    return {
      groups, world, body, cpgSpec: spec, cpgState: initCpgState(spec),
      delayBuffers: body.joints.map(() => createDelayBuffer(TIMESTEP)),
      acc: 0, simTime: 0, buildLegs: legsOn, buildGround: groundOn, buildLimbs: limbsOn,
      gripPlantJoint: body.hipJoints.map(() => null),
      gripPlantBody: body.hipJoints.map(() => null),
      mechPhase: body.hipJoints.map(() => ({ mean: 0, prevR: 0, msR: 1e-6, msRdot: 1e-6, phase: 0, primed: false })),
      baseCom, diagAccum: 0,
      recordTime: 0, recordAccum: RECORD_INTERVAL, recordBaseCom: baseCom,
      recordBodySamples: [], recordCpgSamples: [],
      recordDrive: 0, recordExcitability: 0,
      trunkIdx,
      obs: {
        legs: body.hipJoints.map((hip) => GRIP_FOOT_BY_LIMB[hip.limbIdx] ?? `L${hip.limbIdx}`),
        phase: body.hipJoints.map(() => 0),
        stance: body.hipJoints.map(() => false),
        gripped: body.hipJoints.map(() => false),
        reach: body.hipJoints.map(() => ({ x: 0, y: 0, z: 0 })),
        foot: body.hipJoints.map(() => ({ x: 0, y: 0, z: 0 })),
        hip: body.hipJoints.map(() => ({ x: 0, y: 0, z: 0 })),
        trunk: trunkIdx.map(() => ({ x: 0, y: 0, z: 0 })),
      },
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
      // Legs/ground/limbs are structural (baked at build), so toggling one forces a rebuild; gravity
      // and friction are applied live each frame and do not.
      const wantLegs = store.landLegsEnabled
      const wantGround = store.landGroundEnabled
      const wantLimbs = store.limbCpgEnabled
      if (
        !coupledRef.current ||
        coupledRef.current.groups !== groups ||
        coupledRef.current.buildLegs !== wantLegs ||
        coupledRef.current.buildGround !== wantGround ||
        coupledRef.current.buildLimbs !== wantLimbs
      ) {
        freeCoupled()
        coupledRef.current = buildCoupled()
      }
      const c = coupledRef.current
      if (c) {
        const drive = store.cpgDrive
        const exc = store.cpgExcitability
        const frontDrive = store.frontDrive
        const frontSegments = store.frontSegments
        const turnBias = store.turnBias
        const limbDrive = store.limbDrive
        const feedbackIpsi = store.feedbackIpsi
        const feedbackContra = store.feedbackContra
        const alpha = store.muscleAlpha
        const beta = store.muscleBeta
        const jointDamping = store.muscleDamping
        const gripEnabled = store.gripEnabled
        const legsLockedConst = store.legsLocked
        const stepEnabled = store.stepEnabled
        const sweepAmount = store.sweepAmount
        const sweepSpeed = store.sweepSpeed
        const liftAmount = store.liftAmount
        const legStiffness = store.legStiffness
        const legDamping = store.legDamping
        const stepShift = store.gripShift
        const stepDuty = Math.min(0.95, Math.max(0.05, store.gripDuration))

        // Playback control (Increment A): `frozen` stops sim advance while the render keeps drawing the
        // held frame (freeze-frame); `playSpeed` scales how fast wall-time feeds the fixed-step
        // accumulator (slow-motion); a pending `stepRequest` injects N exact ticks. The per-tick math in
        // the while-loop below is untouched, so 1x-speed unfrozen is byte-identical to before.
        const frozen = store.frozen
        const speed = Math.max(0.1, Math.min(1, store.playSpeed))
        const stepTicks = Math.max(0, store.consumeStepRequest())
        const intake = (frozen ? 0 : Math.min(dt, MAX_FRAME) * speed) + stepTicks * TIMESTEP
        const advancing = intake > 0

        // Live per-collider friction: trunk slides (low) so the axial wave isn't pinned to the
        // floor; feet grip (high) for traction. Ground is friction 1.0 with a MULTIPLY combine rule,
        // so the effective surface friction equals each collider's own coefficient. Only when advancing,
        // so a frozen frame doesn't drift the measured phase or re-plant feet.
        if (advancing) {
          const bodyFriction = store.bodyFriction
          // Feet default to the low release friction so they SLIDE — the body undulates freely and
          // grip-off truly means "don't grip". The grip primitive (below) overrides per-foot when on.
          const restLegFriction = store.releaseFriction
          for (let i = 0; i < c.body.colliders.length; i++) {
            c.body.colliders[i].setFriction(legIdSet.has(c.body.groupIds[i]) ? restLegFriction : bodyFriction)
          }
          for (const gc of c.body.groundContacts) gc.setFriction(bodyFriction)
          // Live gravity toggle: lets us see the land rig (legs + floor + friction) with no downward
          // pull, isolating how much the legs/feet anchor the body independent of gravity.
          c.world.gravity.y = store.gravityEnabled ? -9.81 : 0

          // GRIP primitive: the window phase is the MEASURED undulation phase at this foot — the foot's
          // body-wave-driven reach (reconstructed from the girdle, so planting a foot can't corrupt it)
          // turned into a 0..1 cycle by updateMechPhase, with 0 = max-forward reach. This makes the grip
          // start at max-forward and (with gripDuration 0.5) release at max-backward for ANY drive/muscle.
          // The timing window + glow run regardless of the grip switch, so the window can be tuned and
          // watched with grip off; only the physical plant + friction switch is gated by gripEnabled.
          const glowOn = store.gripGlowEnabled
          const glows = footGlowRef?.current
          if (c.body.hipJoints.length > 0) {
            const hips = c.body.hipJoints
            const gripShift = store.gripShift
            const gripDuration = store.gripDuration
            const releaseFriction = store.releaseFriction
            const gripFriction = store.legFriction
            const gripFeet = store.gripFeet
            const com = comOf(c.body)
            for (let h = 0; h < hips.length; h++) {
              const hip = hips[h]
              const selected = gripFeet[GRIP_FOOT_BY_LIMB[hip.limbIdx]]
              const leg = c.body.bodies[hip.legBodyIndex]
              const lp = leg.translation(); const lq = leg.rotation()
              s.v2.set(hip.footLocal.x, hip.footLocal.y, hip.footLocal.z)
                .applyQuaternion(s.q.set(lq.x, lq.y, lq.z, lq.w))
              const footX = lp.x + s.v2.x, footY = lp.y + s.v2.y, footZ = lp.z + s.v2.z
              // Body-wave reach proxy: where this foot would sit at rest leg angle, from the GIRDLE only
              // (excludes the leg's own sweep), projected forward (head = −X) relative to the COM so net
              // translation drops out. Its measured phase drives the grip/sweep window.
              const par = c.body.bodies[hip.parentIndex]
              const pp = par.translation(); const pq = par.rotation()
              s.v1.set(hip.footRestLocal.x, hip.footRestLocal.y, hip.footRestLocal.z)
                .applyQuaternion(s.q.set(pq.x, pq.y, pq.z, pq.w))
              const reach = com.x - (pp.x + s.v1.x)
              const phase = updateMechPhase(c.mechPhase[h], reach, dt)
              const rel = ((phase - gripShift) % 1 + 1) % 1
              // Timing window drives the glow for ALL feet (so a foot toggled off still shows when it
              // *would* grip); actual gripping additionally requires the grip switch + that foot selected.
              const inWindow = rel < gripDuration
              const gripping = gripEnabled && selected && inWindow
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
          } else if (glows) {
            for (const m of glows.values()) m.visible = false
          }
        }
        let acc = c.acc + intake
        while (acc >= TIMESTEP) {
          // Axial proprioceptive feedback reads each axial joint's ACTUAL angle (body curvature) and
          // feeds it back into the CPG (paper Fig 6C). Only built when a feedback weight is set, so the
          // no-feedback path skips the per-joint quaternion math entirely.
          let jointAngles: number[] | undefined
          if (feedbackIpsi !== 0 || feedbackContra !== 0) {
            jointAngles = new Array(c.cpgSpec.n).fill(0)
            for (const jt of c.body.joints) jointAngles[jt.cpgSegment] = jointAngle(jt, c.body.bodies)
          }
          stepCpg(c.cpgState, c.cpgSpec, drive, exc, TIMESTEP, frontDrive, frontSegments, turnBias, limbDrive, jointAngles, feedbackIpsi, feedbackContra)
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
          // Drive each hip's 2 DOF from the MEASURED undulation phase (same clock as the grip window),
          // so the sweep tracks the body wave: STANCE (rel<duty) sweeps the leg BACKWARD from its
          // forward reach as the body wave carries the girdle back; SWING (rest) sweeps quickly FORWARD
          // and LIFTs to clear. With the phase = the foot's body-wave reach, the sweep's forward extreme
          // lands on the body's max-forward and its rear extreme on max-backward, for any drive/muscle.
          // Step off → hold at rest (stiff if Lock legs, else free/passive).
          if (c.body.hipJoints.length > 0) {
            for (let hi = 0; hi < c.body.hipJoints.length; hi++) {
              const hip = c.body.hipJoints[hi]
              if (stepEnabled) {
                const ph = c.mechPhase[hi].phase
                const rel = ((ph - stepShift) % 1 + 1) % 1
                // Map the sweep into the leg's own caps: +capStance forward, −capSwing back, scaled by
                // the 0–1 sweep amount, so it can never exceed the calibrated angle limits.
                const amt = Math.min(1, Math.max(0, sweepAmount))
                const fwd = hip.capStance
                const back = hip.capSwing
                let sweep: number
                let lift = 0
                if (rel < stepDuty) {
                  const t = rel / stepDuty
                  sweep = fwd - t * (fwd + back) // +forward → −back over stance (power stroke)
                } else {
                  const t = (rel - stepDuty) / (1 - stepDuty)
                  sweep = -back + t * (fwd + back) // −back → +forward over swing (recovery)
                  lift = liftAmount * Math.sin(Math.PI * t) // raise then set the foot back down
                }
                hip.sweepJoint.configureMotorPosition(sweep * amt, sweepSpeed, legDamping)
                hip.liftJoint?.configureMotorPosition(hip.liftSign * lift, legStiffness, legDamping)
              } else {
                const stiff = legsLockedConst ? legStiffness : 0
                hip.sweepJoint.configureMotorPosition(0, stiff, legDamping)
                hip.liftJoint?.configureMotorPosition(0, stiff, legDamping)
              }
            }
          }
          for (const b of c.body.bodies) b.wakeUp() // motor doesn't auto-wake; keep the chain awake
          for (const cb of c.body.carriers) cb.wakeUp() // the 2-DOF hip's middle links too
          c.world.step()
          if (store.environmentEnabled) applyEnvironment3D(c.body, TIMESTEP)
          acc -= TIMESTEP
          c.simTime += TIMESTEP
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

        // Publish the read-only observation snapshot for the overlay layer (Increment B reads
        // window.__locObs). Recomputed every frame (cheap) into preallocated arrays; runs even when
        // frozen so a held frame still exposes the current phase/stance/reach.
        if (c.body.hipJoints.length > 0) {
          for (let h = 0; h < c.body.hipJoints.length; h++) {
            const hip = c.body.hipJoints[h]
            const clk = c.mechPhase[h].phase
            const rel = ((clk - stepShift) % 1 + 1) % 1
            c.obs.phase[h] = clk
            c.obs.stance[h] = rel < stepDuty
            c.obs.gripped[h] = c.gripPlantJoint[h] != null
            const par = c.body.bodies[hip.parentIndex]
            const pp = par.translation(); const pq = par.rotation()
            s.v1.set(hip.footRestLocal.x, hip.footRestLocal.y, hip.footRestLocal.z)
              .applyQuaternion(s.q.set(pq.x, pq.y, pq.z, pq.w))
            const r = c.obs.reach[h]
            r.x = pp.x + s.v1.x; r.y = pp.y + s.v1.y; r.z = pp.z + s.v1.z
            const legB = c.body.bodies[hip.legBodyIndex]
            const lp = legB.translation(); const lq = legB.rotation()
            s.v2.set(hip.footLocal.x, hip.footLocal.y, hip.footLocal.z)
              .applyQuaternion(s.q.set(lq.x, lq.y, lq.z, lq.w))
            const fo = c.obs.foot[h]
            fo.x = lp.x + s.v2.x; fo.y = lp.y + s.v2.y; fo.z = lp.z + s.v2.z
            s.v2.set(hip.hipLocal.x, hip.hipLocal.y, hip.hipLocal.z)
              .applyQuaternion(s.q.set(pq.x, pq.y, pq.z, pq.w))
            const ho = c.obs.hip[h]
            ho.x = pp.x + s.v2.x; ho.y = pp.y + s.v2.y; ho.z = pp.z + s.v2.z
          }
        }
        // Trunk skeleton publishes regardless of legs (spine monitors work on legless configs too).
        for (let ti = 0; ti < c.trunkIdx.length; ti++) {
          const p = c.body.bodies[c.trunkIdx[ti]].translation()
          const tp = c.obs.trunk[ti]
          tp.x = p.x; tp.y = p.y; tp.z = p.z
        }
        if (typeof window !== 'undefined') window.__locObs = c.obs

        c.diagAccum += dt
        if (c.diagAccum >= DIAGNOSTICS_INTERVAL) {
          c.diagAccum -= DIAGNOSTICS_INTERVAL
          store.setSimTime(c.simTime)
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

        // Node-position capture: sample every body's world (x,y,z) at the requested rate. Default
        // observation mode — lets the harness reconstruct the top-down node skeleton over time
        // without any screenshots. Wall-time gated so frame rate (~60Hz) is decoupled from sample Hz.
        const ncap = typeof window !== 'undefined' ? window.__nodeCapture : undefined
        if (ncap?.active) {
          const tNow = (performance.now() - ncap.startWallTime) / 1000
          if (!window.__nodeCaptureSpec) {
            window.__nodeCaptureSpec = {
              count: c.body.bodies.length,
              groupIds: c.body.groupIds.slice(),
              segLength: c.body.segLength.slice(),
            }
          }
          const snapshot = () => c.body.bodies.map((b) => {
            const p = b.translation()
            return { x: p.x, y: p.y, z: p.z }
          })
          // periodic node sample (hz-gated)
          const interval = ncap.hz > 0 ? 1 / ncap.hz : 0
          if (ncap.buffer.length < ncap.maxSamples && tNow - ncap.lastSampleTime >= interval - 1e-4) {
            ncap.lastSampleTime = tNow
            const cpg: number[] = []
            for (let k = 0; k < c.cpgSpec.n; k++) cpg.push(signedActivation(c.cpgState, c.cpgSpec, k))
            ncap.buffer.push({ t: tNow, nodes: snapshot(), cpg })
          }
          // primitive-window edge detection (every frame). Windows come from the MEASURED undulation
          // phase (the same clock the live grip/sweep controller uses) + the timing params ONLY — not
          // gripEnabled/stepEnabled — so the timing is observed without the behaviour being active.
          // grip = rel<gripDuration; sweep(power-stroke)=rel<stepDuty; lift = swing half (rel>=stepDuty).
          if (ncap.events && c.body.hipJoints.length > 0) {
            const hips = c.body.hipJoints
            const gripShift = store.gripShift
            const gripDuration = store.gripDuration
            const stepDuty = Math.min(0.95, Math.max(0.05, store.gripDuration))
            if (!ncap.prevWindows) ncap.prevWindows = hips.map(() => ({ grip: false, sweep: false, lift: false }))
            if (!ncap.reachAccum) {
              ncap.reachAccum = hips.map(() => ({ c: 0, s: 0, n: 0, cAx: 0, sAx: 0, minFore: Infinity, maxFore: -Infinity, phiAtMin: 0, phiAtMax: 0 }))
              ncap.reachLegs = hips.map((hip) => GRIP_FOOT_BY_LIMB[hip.limbIdx] ?? `L${hip.limbIdx}`)
            }
            for (let h = 0; h < hips.length; h++) {
              const hip = hips[h]
              const phase = c.mechPhase[h].phase
              const phaseRad = phase * 2 * Math.PI
              const rel = ((phase - gripShift) % 1 + 1) % 1
              const win = { grip: rel < gripDuration, sweep: rel < stepDuty, lift: rel >= stepDuty }
              const prev = ncap.prevWindows[h]
              const leg = GRIP_FOOT_BY_LIMB[hip.limbIdx] ?? `L${hip.limbIdx}`
              for (const prim of ['grip', 'sweep', 'lift'] as const) {
                if (win[prim] !== prev[prim]) {
                  const ev: NodeCaptureEvent = {
                    t: tNow, leg, primitive: prim, edge: win[prim] ? 'start' : 'end', rel, phase,
                  }
                  if (ncap.eventSnapshots) ev.nodes = snapshot()
                  ncap.eventBuffer.push(ev)
                }
              }
              ncap.prevWindows[h] = win

              // Validation: project the ACTUAL foot fore-aft reach (foot−hip on world-X, head positive)
              // onto the MEASURED phase. If the estimator is right, max-forward reach lands at phase ≈ 0,
              // so φ_fwd≈0 ⇒ a grip window at gripShift=0 opens exactly at max-forward reach.
              const parB = c.body.bodies[hip.parentIndex]
              const pp = parB.translation(); const pq = parB.rotation()
              s.v2.set(hip.hipLocal.x, hip.hipLocal.y, hip.hipLocal.z).applyQuaternion(s.q.set(pq.x, pq.y, pq.z, pq.w))
              const hipX = pp.x + s.v2.x
              const legB = c.body.bodies[hip.legBodyIndex]
              const lp = legB.translation(); const lq = legB.rotation()
              s.v2.set(hip.footLocal.x, hip.footLocal.y, hip.footLocal.z).applyQuaternion(s.q.set(lq.x, lq.y, lq.z, lq.w))
              const footX = lp.x + s.v2.x
              const fore = hipX - footX
              const ra = ncap.reachAccum[h]
              ra.c += fore * Math.cos(phaseRad)
              ra.s += fore * Math.sin(phaseRad)
              ra.n += 1
              if (fore < ra.minFore) { ra.minFore = fore; ra.phiAtMin = phase }
              if (fore > ra.maxFore) { ra.maxFore = fore; ra.phiAtMax = phase }
            }
          }
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
          const sweeps: number[] = []
          const stance: boolean[] = []
          const footYs: number[] = []
          // Recompute the step shift + duty + sweep amount here so the capture matches the controller
          // exactly (no risk of drift if either is read elsewhere). Mirrors useLocomotion lines ~258-265.
          const capStepShift = store.gripShift
          const capStepDuty = Math.min(0.95, Math.max(0.05, store.gripDuration))
          const capSweepAmt = Math.min(1, Math.max(0, store.sweepAmount))
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
            const ph = limbPhase(c.cpgState, c.cpgSpec, hip.limbIdx) / (2 * Math.PI)
            const rel = ((ph - capStepShift) % 1 + 1) % 1
            const isStance = rel < capStepDuty
            // Mirror the controller's sweep formula (useLocomotion ~388-405) so the capture sees the
            // exact target the motor is asked for. Scaled by sweepAmount to match the post-motor value.
            const fwd = hip.capStance
            const back = hip.capSwing
            let sweepTarget: number
            if (isStance) {
              const tt = rel / capStepDuty
              sweepTarget = fwd - tt * (fwd + back)
            } else {
              const tt = (rel - capStepDuty) / (1 - capStepDuty)
              sweepTarget = -back + tt * (fwd + back)
            }
            phases.push(ph)
            fores.push(fore)
            sweeps.push(sweepTarget * capSweepAmt)
            stance.push(isStance)
            footYs.push(footY)
          }
          const kFore = c.cpgSpec.limbWiring?.kFore ?? 0
          const axialFront = (c.cpgState.phases[kFore] ?? 0) / (2 * Math.PI)
          const t = (performance.now() - cap.startWallTime) / 1000
          cap.buffer.push({ t, phases, fores, sweeps, stance, footYs, axialFront, limbOrder: hips.map((h) => h.limbIdx) })
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
