import RAPIER from '@dimforge/rapier3d-compat'
import { BodyGroup } from '@/app/admin/_lib/types'
import { axialChain, buildBody3D } from '@/app/game/locomotion/body3d'
import {
  buildCpgSpec,
  initCpgState,
  stepCpg,
  oscillatorOutput,
  LIMB_LF,
  LIMB_LH,
} from '@/app/game/locomotion/cpg'
import { createDelayBuffer, pushAndReadDelayed, ALPHA, BETA, GAMMA, DELTA } from '@/app/game/locomotion/muscles'
import { applyEnvironment3D } from '@/app/game/locomotion/environment'

const RIG_LEN = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
const CAP_DEG = [60, 21, 23, 37, 39, 28, 28, 22, 30, 30, 45]
const FORE_HIP_IDX = 2
const HIND_HIP_IDX = 8
const TIMESTEP = 1 / 120
const GAIN = 12
const DRIVE = 3.0
const EXC = 0.15

const TWO_PI = Math.PI * 2

function buildSwimRig(): BodyGroup[] {
  const groups: BodyGroup[] = []
  const pts: { x: number; y: number; z: number }[] = []
  let x = 0
  pts.push({ x: 0, y: 0, z: 0 })
  for (let i = 0; i < RIG_LEN.length; i++) {
    x += RIG_LEN[i]
    pts.push({ x, y: 0, z: 0 })
  }
  for (let i = 0; i < RIG_LEN.length; i++) {
    const type: BodyGroup['type'] = i === 0 ? 'head' : i === RIG_LEN.length - 1 ? 'tail' : 'spine'
    const g: BodyGroup = {
      id: `g${i}`, name: `g${i}`, segmentIds: [], color: '#fff', type,
      nodeBack: pts[i + 1],
      angleCaps: { yaw: (CAP_DEG[i] * Math.PI) / 180, pitchUp: 1, pitchDown: 1 },
    }
    if (i === 0) g.nodeFront = pts[0]
    groups.push(g)
  }
  return groups
}

function buildWalkRig(): BodyGroup[] {
  const groups = buildSwimRig()
  for (const i of [FORE_HIP_IDX, HIND_HIP_IDX]) {
    const g = groups[i]
    const px = ((g.nodeFront?.x ?? 0) + (g.nodeBack?.x ?? 0)) / 2
    g.nodeHipLeft = { x: px, y: 0, z: -1 }
    g.nodeHipRight = { x: px, y: 0, z: 1 }
  }
  for (const side of ['leg-left', 'leg-right'] as const) {
    for (const hipIdx of [FORE_HIP_IDX, HIND_HIP_IDX]) {
      const sp = groups[hipIdx]
      const hipNode = side === 'leg-left' ? sp.nodeHipLeft! : sp.nodeHipRight!
      groups.push({
        id: `leg-${hipIdx}-${side}`,
        name: `leg-${hipIdx}-${side}`,
        segmentIds: [],
        color: '#fff',
        type: side,
        attachedToSpineId: sp.id,
        nodeFront: hipNode,
        nodeBack: { x: hipNode.x, y: -2, z: hipNode.z },
      })
    }
  }
  return groups
}

function comXZ(bodies: RAPIER.RigidBody[]): { x: number; z: number } {
  let sx = 0, sz = 0
  for (const b of bodies) { const t = b.translation(); sx += t.x; sz += t.z }
  return { x: sx / bodies.length, z: sz / bodies.length }
}

function runTurnCase(turnBias: number, seconds = 8): { lateral: number; forward: number; blew: boolean } {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  world.timestep = TIMESTEP
  const body = buildBody3D(world, buildSwimRig(), { buildLegs: false, buildGround: false })
  if (!body) throw new Error('body build failed')

  const cpgSpec = buildCpgSpec(body.segLength)
  const cpgState = initCpgState(cpgSpec)
  const delay = body.joints.map(() => createDelayBuffer(TIMESTEP))
  const com0 = comXZ(body.bodies)

  let blew = false
  const steps = Math.round(seconds / TIMESTEP)
  for (let s = 0; s < steps; s++) {
    stepCpg(cpgState, cpgSpec, DRIVE, EXC, TIMESTEP, undefined, undefined, turnBias)
    for (let j = 0; j < body.joints.length; j++) {
      const jt = body.joints[j]
      const k = body.jointToCpgSegment[j]
      const mL = oscillatorOutput(cpgState, k) * GAIN
      const mR = oscillatorOutput(cpgState, k + cpgSpec.n) * GAIN
      const d = pushAndReadDelayed(delay[j], mL, mR)
      const kStiff = BETA * (d.mL + d.mR + GAMMA)
      const phiEq = kStiff > 1e-9 ? (ALPHA * (d.mL - d.mR)) / kStiff : 0
      ;(jt.joint as RAPIER.RevoluteImpulseJoint).configureMotorModel(RAPIER.MotorModel.ForceBased)
      ;(jt.joint as RAPIER.RevoluteImpulseJoint).configureMotorPosition(phiEq, kStiff, DELTA)
    }
    for (const b of body.bodies) b.wakeUp()
    world.step()
    applyEnvironment3D(body, TIMESTEP)
    if (!Number.isFinite(comXZ(body.bodies).x)) { blew = true; break }
  }

  const comNow = comXZ(body.bodies)
  // Rig has head at x=0 with nodeBack at +x, so the snout points -x; head-first swim moves COM in -x.
  // "Left" with forward = -x and up = +y is -z (right-hand rule), so leftward drift makes z decrease.
  const forward = -(comNow.x - com0.x)
  const lateral = -(comNow.z - com0.z)

  world.free()
  return { lateral, forward, blew }
}

function expectedDriveArr(
  size: number,
  n: number,
  base: number,
  drive: number,
  fd: number,
  fc: number,
  tb: number
): number[] {
  const leftFactor = 1 - Math.max(0, -tb)
  const rightFactor = 1 - Math.max(0, tb)
  const out: number[] = new Array(size)
  for (let i = 0; i < size; i++) {
    let d: number
    if (fc > 0 && i < n) d = i < fc ? fd : drive
    else if (fc > 0 && i < base) d = i - n < fc ? fd : drive
    else d = drive
    let side: number
    if (i < n) side = leftFactor
    else if (i < base) side = rightFactor
    else {
      const li = i - base
      side = li === LIMB_LF || li === LIMB_LH ? leftFactor : rightFactor
    }
    out[i] = d * side
  }
  return out
}

function measureDriveArrViaPhaseDot(turnBias: number): { actual: number[]; expected: number[]; n: number; limbs: number } {
  const groups = buildWalkRig()
  const { lengths, groupIds } = axialChain(groups)
  const spec = buildCpgSpec(lengths, groups, groupIds)
  const state = initCpgState(spec)
  const size = 2 * spec.n + spec.limbs
  // Zero phases AND amplitudes: with amplitudes=0 the coupling-sum term vanishes, so after one
  // substep phaseDot[i] = 2π · driveArr[i] · exc · spec.e[i]. Recover driveArr from the phase diff.
  for (let i = 0; i < size; i++) { state.phases[i] = 0; state.amplitudes[i] = 0 }
  const h = 0.002
  const before = state.phases.slice()
  stepCpg(state, spec, DRIVE, EXC, h, undefined, undefined, turnBias)
  const actual: number[] = new Array(size)
  for (let i = 0; i < size; i++) {
    let diff = state.phases[i] - before[i]
    if (diff < -Math.PI) diff += TWO_PI
    if (diff > Math.PI) diff -= TWO_PI
    actual[i] = diff / (TWO_PI * EXC * spec.e[i] * h)
  }
  const expected = expectedDriveArr(size, spec.n, 2 * spec.n, DRIVE, DRIVE, 0, turnBias)
  return { actual, expected, n: spec.n, limbs: spec.limbs }
}

function reportTurn(label: string, target: '+' | '0' | '-', r: { lateral: number; forward: number; blew: boolean }): boolean {
  // COM lateral is the gate. The head's instantaneous yaw oscillates through the full swim cycle
  // (the snout sweeps ±90° as part of normal undulation), so a single-frame yaw sample is noise.
  // Lateral is reported in body-lengths-equivalent (raw world units); 0.05 is a robust threshold
  // given forward distances of ~3 units in 8 s.
  const LAT_MIN = 0.05
  let pass: boolean
  if (target === '+') pass = !r.blew && r.lateral > LAT_MIN
  else if (target === '-') pass = !r.blew && r.lateral < -LAT_MIN
  else pass = !r.blew && Math.abs(r.lateral) < LAT_MIN
  console.log(
    `${label.padEnd(20)} forward=${r.forward.toFixed(3).padStart(7)}  lateral=${r.lateral.toFixed(3).padStart(7)}  ${pass ? 'PASS' : 'FAIL'}${r.blew ? ' DIVERGED' : ''}`
  )
  return pass
}

function reportDriveArr(label: string, m: ReturnType<typeof measureDriveArrViaPhaseDot>): boolean {
  const tol = 1e-6
  let ok = true
  for (let i = 0; i < m.actual.length; i++) {
    if (Math.abs(m.actual[i] - m.expected[i]) > tol) {
      ok = false
      console.log(`  index ${i}: actual=${m.actual[i].toFixed(6)} expected=${m.expected[i].toFixed(6)}`)
    }
  }
  console.log(`${label.padEnd(20)} n=${m.n} limbs=${m.limbs}  ${ok ? 'PASS' : 'FAIL'}`)
  return ok
}

async function main() {
  await RAPIER.init()
  const T = 8
  console.log(`Turn-direction gate (DRIVE=${DRIVE}, EXC=${EXC}, GAIN=${GAIN}, drag ON, ${T}s/case)\n`)

  let allPass = true

  console.log('--- Behavioral: COM trajectory under turn bias ---')
  if (!reportTurn('turnBias=+0.3', '+', runTurnCase(+0.3, T))) allPass = false
  if (!reportTurn('turnBias= 0.0', '0', runTurnCase(0.0, T))) allPass = false
  if (!reportTurn('turnBias=-0.3', '-', runTurnCase(-0.3, T))) allPass = false

  console.log('\n--- Algebra: driveArr recovered via phaseDot ---')
  if (!reportDriveArr('turnBias=0.0', measureDriveArrViaPhaseDot(0))) allPass = false
  if (!reportDriveArr('turnBias=+0.3', measureDriveArrViaPhaseDot(+0.3))) allPass = false

  if (!allPass) {
    console.log('\nFAIL: some assertions did not hold.')
    process.exit(1)
  }
  console.log('\nAll PASS.')
}

main().catch((e) => { console.error('ERROR', e); process.exit(1) })
