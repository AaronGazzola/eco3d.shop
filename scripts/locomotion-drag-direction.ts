import {
  computeEnvironmentTau,
  DRAG_NORMAL,
  DRAG_TANGENT,
  DRAG_ANGULAR,
} from '@/app/game/locomotion/environment'
import { BodySpec, PlanarSegment, PlanarJoint } from '@/app/game/locomotion/body'
import {
  initSolverState,
  stepSolver,
  centerOfMass,
  nodePositions,
  FIXED_SUBSTEP_SECONDS,
} from '@/app/game/locomotion/solver'
import { buildCpgSpec, initCpgState, stepCpg, oscillatorOutput } from '@/app/game/locomotion/cpg'
import { ekebergTorque, createDelayBuffer, pushAndReadDelayed } from '@/app/game/locomotion/muscles'

const CPG_TO_MUSCLE_GAIN = 12

// Synthetic straight body: head at x=0, tail at +x. Snout (forward / head-first) faces -x.
// So: net thrust Fx < 0  => head-first (correct).   Fx > 0 => tail-first (backward / bug).
const N = 11
const L = 1.5
const MASS = 1.5
const INERTIA = (MASS * (L * L + 0.5 * 0.5)) / 12

function buildStraightSpec(): BodySpec {
  const segments: PlanarSegment[] = []
  for (let i = 0; i < N; i++) {
    segments.push({
      groupId: `seg-${i}`,
      length: L,
      mass: MASS,
      inertiaAboutComY: INERTIA,
      restNodeX: i * L,
      restNodeZ: 0,
      restComX: i * L + L / 2,
      restComZ: 0,
    })
  }
  const joints: PlanarJoint[] = []
  for (let j = 0; j < N - 1; j++) {
    joints.push({
      segmentIndex: j + 1,
      coordIndex: 3 + j,
      yawForwardLimit: 10,
      yawBackwardLimit: 10,
    })
  }
  return { segments, joints, density: 1, restRootX: 0, restRootZ: 0 }
}

// Clean head->tail traveling wave on the joints.
const BODY_WAVES = 1.58
const FREQ = 1.1
const OMEGA = 2 * Math.PI * FREQ
const AMP = 0.2 // rad, ~11 deg — small, clean, no clamping
const DPHI = (2 * Math.PI * BODY_WAVES) / (N - 1) // phase lag per joint, head->tail

function jointAngle(k: number, t: number): number {
  return AMP * Math.sin(OMEGA * t - k * DPHI)
}
function jointRate(k: number, t: number): number {
  return AMP * OMEGA * Math.cos(OMEGA * t - k * DPHI)
}

function buildSpecFromLengths(
  lengths: number[],
  comAxialFrac = 0.5,
  comLateral: number[] | null = null
): BodySpec {
  const n = lengths.length
  const segments: PlanarSegment[] = []
  let x = 0
  for (let i = 0; i < n; i++) {
    const len = lengths[i]
    const inertia = (MASS * (len * len + 0.5 * 0.5)) / 12
    segments.push({
      groupId: `seg-${i}`,
      length: len,
      mass: MASS,
      inertiaAboutComY: inertia,
      restNodeX: x,
      restNodeZ: 0,
      restComX: x + len * comAxialFrac,
      restComZ: comLateral ? comLateral[i] : 0,
    })
    x += len
  }
  const joints: PlanarJoint[] = []
  for (let j = 0; j < n - 1; j++) {
    joints.push({ segmentIndex: j + 1, coordIndex: 3 + j, yawForwardLimit: 10, yawBackwardLimit: 10 })
  }
  return { segments, joints, density: 1, restRootX: 0, restRootZ: 0 }
}

// Drive the REAL solver (free body: x, z, yaw all evolve + Coriolis + drag) with prescribed
// head->tail sinusoidal joint torques. Report which way the COM drifts relative to the snout.
function runRealSolver(spec: BodySpec, label: string) {
  const state = initSolverState(spec)
  const dt = 1 / 240
  const totalT = 8
  const steps = Math.round(totalT / dt)
  const T0 = 4 // torque amplitude
  const startCom = centerOfMass(state, spec)
  let maxJoint = 0
  for (let s = 0; s < steps; s++) {
    const t = s * dt
    const torques = spec.joints.map((_, k) => T0 * Math.sin(OMEGA * t - k * DPHI))
    stepSolver(state, spec, dt, torques, 0.1, true)
    for (const a of state.jointAngles) maxJoint = Math.max(maxJoint, Math.abs(a))
  }
  const endCom = centerOfMass(state, spec)
  const nodes = nodePositions(state, spec)
  // snout direction = from first joint node toward the head node (head-first / forward)
  const sx = nodes[0].x - nodes[1].x
  const sz = nodes[0].z - nodes[1].z
  const slen = Math.hypot(sx, sz) || 1
  const snoutX = sx / slen
  const snoutZ = sz / slen
  const dispX = endCom.x - startCom.x
  const dispZ = endCom.z - startCom.z
  const alongSnout = dispX * snoutX + dispZ * snoutZ
  console.log(`--- ${label} (real solver, free yaw) ---`)
  console.log(`  max joint angle: ${(maxJoint * 180 / Math.PI).toFixed(1)} deg`)
  console.log(`  COM displacement: (${dispX.toFixed(3)}, ${dispZ.toFixed(3)}), |d|=${Math.hypot(dispX, dispZ).toFixed(3)}`)
  console.log(`  along snout (forward) axis: ${alongSnout.toFixed(3)}  (>0 = HEAD-FIRST, <0 = TAIL-FIRST)`)
  console.log(`  VERDICT: ${alongSnout > 0 ? 'HEAD-FIRST (correct)' : 'TAIL-FIRST (reversed)'}\n`)
}

// Replicate the REAL useLocomotion coupled pipeline: CPG -> Ekeberg muscles -> solver.
function runRealPipeline(
  spec: BodySpec,
  label: string,
  dragOn: boolean,
  dt = 1 / 240,
  reverseMapping = false
) {
  const cpgSpec = buildCpgSpec(spec)
  const cpgState = initCpgState(cpgSpec)
  const bodyState = initSolverState(spec)
  const delayBuffers = spec.joints.map(() => createDelayBuffer(FIXED_SUBSTEP_SECONDS))
  const n = spec.segments.length
  const jointToCpgSegment = spec.joints.map((j) =>
    reverseMapping ? n - 1 - j.segmentIndex : j.segmentIndex
  )
  const totalT = 10
  const steps = Math.round(totalT / dt)
  const startCom = centerOfMass(bodyState, spec)
  const startHead = nodePositions(bodyState, spec)[0]
  let maxJoint = 0
  for (let s = 0; s < steps; s++) {
    const t = s * dt
    stepCpg(cpgState, cpgSpec, 1.0, 1.0, dt)
    const torques = spec.joints.map((_, i) => {
      const k = jointToCpgSegment[i]
      const mL = oscillatorOutput(cpgState, k) * CPG_TO_MUSCLE_GAIN
      const mR = oscillatorOutput(cpgState, k + cpgSpec.n) * CPG_TO_MUSCLE_GAIN
      const d = pushAndReadDelayed(delayBuffers[i], mL, mR)
      return ekebergTorque(d.mL, d.mR, bodyState.jointAngles[i], bodyState.jointRates[i])
    })
    stepSolver(bodyState, spec, dt, torques, 0.1, dragOn)
    if (t > totalT - 1) {
      for (let i = 0; i < spec.joints.length; i++) {
        maxJoint = Math.max(maxJoint, Math.abs(bodyState.jointAngles[i]))
      }
    }
  }
  const endCom = centerOfMass(bodyState, spec)
  const endHead = nodePositions(bodyState, spec)[0]
  const comDX = endCom.x - startCom.x
  const headDX = endHead.x - startHead.x
  console.log(`--- ${label} (drag ${dragOn ? 'ON' : 'OFF'}, dt=1/${Math.round(1 / dt)}) ---`)
  console.log(`  max joint angle: ${(maxJoint * 180 / Math.PI).toFixed(1)} deg`)
  console.log(`  COM  x-displacement: ${comDX.toFixed(3)}  (snout is -x, so <0 = HEAD-FIRST)`)
  console.log(`  HEAD x-displacement: ${headDX.toFixed(3)}  (what the browser renders as 'rootX')`)
  console.log(`  COM swims ${comDX < 0 ? 'HEAD-FIRST (correct)' : 'TAIL-FIRST'}; head renders ${headDX < 0 ? '-x' : '+x'}`)
  console.log(`  >>> head and COM move ${Math.sign(headDX) !== Math.sign(comDX) ? 'OPPOSITE — render-frame illusion!' : 'same way'}\n`)
}

function run() {
  const spec = buildStraightSpec()
  const dof = 3 + spec.joints.length
  const totalMass = N * MASS

  console.log('=== Drag direction test ===')
  console.log(`drag: C_n=${DRAG_NORMAL} C_t=${DRAG_TANGENT} C_w=${DRAG_ANGULAR}`)
  console.log(`wave: ${BODY_WAVES} body-waves, ${FREQ}Hz, amp ${AMP}rad, head->tail`)
  console.log('geometry: head at x=0, tail at +x; head-first (correct) = -x\n')

  // --- Test 1: net thrust on a NON-translating undulating body ---
  const cycles = 20
  const T = cycles / FREQ
  const steps = 4000
  const h = T / steps
  let sumFx = 0
  let sumFz = 0
  let sumTorque = 0
  for (let s = 0; s < steps; s++) {
    const t = s * h
    const q = new Array(dof).fill(0)
    const qd = new Array(dof).fill(0)
    for (let j = 0; j < spec.joints.length; j++) {
      q[3 + j] = jointAngle(j, t)
      qd[3 + j] = jointRate(j, t)
    }
    const tau = computeEnvironmentTau(spec, q, qd)
    sumFx += tau[0]
    sumFz += tau[1]
    sumTorque += tau[2]
  }
  const avgFx = sumFx / steps
  const avgFz = sumFz / steps
  const avgTorque = sumTorque / steps
  console.log('--- Test 1: avg net force on a fixed (non-translating) undulating body ---')
  console.log(`avg Fx = ${avgFx.toExponential(3)}  (x<0 = head-first/correct, x>0 = tail-first/bug)`)
  console.log(`avg Fz = ${avgFz.toExponential(3)}  (should ~0; lateral cancels over cycles)`)
  console.log(`avg torque = ${avgTorque.toExponential(3)}`)
  console.log(`VERDICT: thrust points ${avgFx < 0 ? 'HEAD-FIRST (correct)' : 'TAIL-FIRST (reversed)'}\n`)

  // --- Test 2: free translational drift (root x/z evolve under drag; heading pinned) ---
  let rootX = 0
  let rootZ = 0
  let velX = 0
  let velZ = 0
  const driftSteps = 6000
  const driftT = 6 / FREQ
  const dh = driftT / driftSteps
  for (let s = 0; s < driftSteps; s++) {
    const t = s * dh
    const q = new Array(dof).fill(0)
    const qd = new Array(dof).fill(0)
    q[0] = rootX
    q[1] = rootZ
    qd[0] = velX
    qd[1] = velZ
    for (let j = 0; j < spec.joints.length; j++) {
      q[3 + j] = jointAngle(j, t)
      qd[3 + j] = jointRate(j, t)
    }
    const tau = computeEnvironmentTau(spec, q, qd)
    velX += dh * (tau[0] / totalMass)
    velZ += dh * (tau[1] / totalMass)
    rootX += dh * velX
    rootZ += dh * velZ
  }
  console.log('--- Test 2: free drift over 6 cycles (drag-only, heading pinned) ---')
  console.log(`final rootX = ${rootX.toFixed(4)}  (x<0 = head-first/correct, x>0 = tail-first/bug)`)
  console.log(`final rootZ = ${rootZ.toFixed(4)}`)
  console.log(`VERDICT: body drifts ${rootX < 0 ? 'HEAD-FIRST (correct)' : 'TAIL-FIRST (reversed)'}\n`)

  // --- Tests 3 & 4: full free body (yaw free) via the real solver ---
  console.log('Note: snout (forward) now points +x in the real-solver tests below.\n')
  const equalLengths = new Array(N).fill(L)
  runRealSolver(buildSpecFromLengths(equalLengths), 'Test 3: EQUAL segments')
  const rigLengths = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
  runRealSolver(buildSpecFromLengths(rigLengths), 'Test 4: RIG-LIKE segments (heavy head+tail)')

  console.log('=== Tests 5-6: CPG->joint mapping (the suspect: useLocomotion.ts:205) ===\n')
  const rig = () => buildSpecFromLengths(rigLengths)
  runRealPipeline(rig(), 'Test 5: natural mapping (segmentIndex)', true, 1 / 60, false)
  runRealPipeline(rig(), 'Test 6: BROWSER mapping (n-1-segmentIndex)', true, 1 / 60, true)
}

run()
