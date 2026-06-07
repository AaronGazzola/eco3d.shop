import RAPIER from '@dimforge/rapier3d-compat'
import { BodyGroup } from '@/app/admin/_lib/types'
import { axialChain } from '@/app/game/locomotion/body3d'
import {
  buildCpgSpec,
  initCpgState,
  stepCpg,
  limbPhase,
  LIMB_LF,
} from '@/app/game/locomotion/cpg'
import {
  buildSingleHipWorld,
  DUTY_STANCE,
  phaseToTarget,
  singleHipAngle,
} from '@/app/game/locomotion/limbActuation'

const RIG_LEN = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
const FORE_HIP_IDX = 2
const HIND_HIP_IDX = 8
const CAP_STANCE = (35 * Math.PI) / 180
const CAP_SWING = (35 * Math.PI) / 180
const TIMESTEP = 1 / 240
const DRIVE = 1.0
const EXC = 1
const K_STIFF = 300
const DELTA = 12
const TWO_PI = Math.PI * 2

function buildWalkingRig(): BodyGroup[] {
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
      id: `g${i}`,
      name: `g${i}`,
      segmentIds: [],
      color: '#fff',
      type,
      nodeBack: pts[i + 1],
      angleCaps: { yaw: 0.4, pitchUp: 1, pitchDown: 1 },
    }
    if (i === 0) g.nodeFront = pts[0]
    if (i === FORE_HIP_IDX || i === HIND_HIP_IDX) {
      const px = (pts[i].x + pts[i + 1].x) / 2
      g.nodeHipLeft = { x: px, y: 0, z: -1 }
      g.nodeHipRight = { x: px, y: 0, z: 1 }
    }
    groups.push(g)
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

function approxEq(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) < tol
}

function transferFunctionUnitChecks(): boolean {
  const checks: Array<{ phi: number; expected: number; label: string }> = [
    { phi: 0, expected: CAP_STANCE, label: 'phi=0 → +capStance' },
    { phi: TWO_PI * 0.385, expected: 0, label: 'phi=2π·0.385 (mid-stance) → 0' },
    { phi: TWO_PI * DUTY_STANCE, expected: -CAP_SWING, label: 'phi=2π·0.77 → -capSwing (kink)' },
    { phi: TWO_PI * (DUTY_STANCE + (1 - DUTY_STANCE) / 2), expected: 0, label: 'mid-swing → 0' },
    { phi: TWO_PI - 1e-9, expected: CAP_STANCE, label: 'phi→2π → +capStance (wrap)' },
  ]
  let ok = true
  console.log('## transfer-function unit checks (cap S/W = ±35°)')
  for (const c of checks) {
    const got = phaseToTarget(c.phi, CAP_STANCE, CAP_SWING)
    const pass = approxEq(got, c.expected, 1e-4)
    if (!pass) ok = false
    console.log(
      `  ${pass ? 'OK ' : 'XX '} ${c.label.padEnd(40)} got ${(got * 180 / Math.PI).toFixed(2)}°  expected ${(c.expected * 180 / Math.PI).toFixed(2)}°`
    )
  }
  let withinCaps = true
  for (let i = 0; i < 1000; i++) {
    const phi = TWO_PI * (i / 1000)
    const t = phaseToTarget(phi, CAP_STANCE, CAP_SWING)
    if (t > CAP_STANCE + 1e-9 || t < -CAP_SWING - 1e-9) {
      withinCaps = false
      break
    }
  }
  console.log(`  ${withinCaps ? 'OK ' : 'XX '} output within [-capSwing, +capStance] for 1000 samples`)
  return ok && withinCaps
}

function asciiTransferShape(): void {
  console.log('\n## transfer-function shape (ASCII, 24 phases)')
  console.log(`  duty stance = ${DUTY_STANCE} (slow ramp 0..2π·D), swing = ${(1 - DUTY_STANCE).toFixed(2)} (fast ramp)`)
  const W = 48
  for (let i = 0; i < 24; i++) {
    const phi = (TWO_PI * i) / 24
    const t = phaseToTarget(phi, CAP_STANCE, CAP_SWING)
    const norm = (t + CAP_SWING) / (CAP_STANCE + CAP_SWING)
    const col = Math.round(norm * (W - 1))
    const bar = ' '.repeat(col) + '*'
    console.log(
      `  φ=${(phi / TWO_PI).toFixed(3)} (${(phi).toFixed(2)} rad)  target=${(t * 180 / Math.PI).toFixed(1).padStart(6)}°  |${bar}`
    )
  }
}

interface Sample {
  t: number
  phi: number
  target: number
  angle: number
  capFrac: number
}

async function main(): Promise<void> {
  await RAPIER.init()

  const tfOk = transferFunctionUnitChecks()
  asciiTransferShape()
  if (!tfOk) {
    console.log('\nTransfer-function unit checks FAILED — aborting before Rapier.')
    process.exit(1)
  }

  const groups = buildWalkingRig()
  const { lengths, groupIds } = axialChain(groups)
  const spec = buildCpgSpec(lengths, groups, groupIds)
  const state = initCpgState(spec)

  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  world.timestep = TIMESTEP
  const hip = buildSingleHipWorld(world, CAP_STANCE, CAP_SWING)

  for (let s = 0; s < Math.round(4 / TIMESTEP); s++) {
    stepCpg(state, spec, DRIVE, EXC, TIMESTEP)
    const phi = limbPhase(state, spec, LIMB_LF)
    const target = phaseToTarget(phi, hip.capStance, hip.capSwing)
    hip.joint.configureMotorPosition(target, K_STIFF, DELTA)
    hip.thigh.wakeUp()
    world.step()
  }

  const samples: Sample[] = []
  const measureSeconds = 6
  for (let s = 0; s < Math.round(measureSeconds / TIMESTEP); s++) {
    stepCpg(state, spec, DRIVE, EXC, TIMESTEP)
    const phi = limbPhase(state, spec, LIMB_LF)
    const target = phaseToTarget(phi, hip.capStance, hip.capSwing)
    hip.joint.configureMotorPosition(target, K_STIFF, DELTA)
    hip.thigh.wakeUp()
    world.step()
    const angle = singleHipAngle(hip.thigh)
    const cap = angle >= 0 ? hip.capStance : hip.capSwing
    const capFrac = cap > 1e-9 ? Math.abs(angle) / cap : 0
    samples.push({ t: s * TIMESTEP, phi, target, angle, capFrac })
  }

  const allFinite = samples.every(
    (s) => Number.isFinite(s.phi) && Number.isFinite(s.target) && Number.isFinite(s.angle) && Number.isFinite(s.capFrac)
  )
  console.log(`\n## diagnostics (samples=${samples.length})  allFinite=${allFinite}`)

  console.log('\n## (t, φ, target°, angle°, capFrac) at 1% sub-sample')
  const step = Math.max(1, Math.floor(samples.length / 100))
  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i]
    console.log(
      `  t=${s.t.toFixed(3).padStart(7)}  φ=${s.phi.toFixed(2).padStart(5)}  tgt=${(s.target * 180 / Math.PI).toFixed(1).padStart(6)}°  ang=${(s.angle * 180 / Math.PI).toFixed(1).padStart(6)}°  cap=${(s.capFrac * 100).toFixed(0).padStart(3)}%`
    )
  }

  let sse = 0
  for (const s of samples) sse += (s.angle - s.target) ** 2
  const rms = Math.sqrt(sse / samples.length)
  console.log(`\n## GATE 4.2 (tracking RMS < 0.15 rad)`)
  console.log(`  RMS(angle − target) = ${rms.toFixed(4)} rad  (${(rms * 180 / Math.PI).toFixed(2)}°)`)
  console.log(`  GATE 4.2: ${rms < 0.15 ? 'PASS' : 'FAIL'}`)

  let maxAbs = 0
  let overshoot = false
  const SOLVER_TOL = (2 * Math.PI) / 180
  for (const s of samples) {
    const cap = s.angle >= 0 ? hip.capStance : hip.capSwing
    if (Math.abs(s.angle) > maxAbs) maxAbs = Math.abs(s.angle)
    if (Math.abs(s.angle) > cap + SOLVER_TOL) overshoot = true
  }
  console.log(`\n## GATE 4.3 (|angle| ≤ cap + 2° solver tolerance every step)`)
  console.log(`  max|angle| = ${(maxAbs * 180 / Math.PI).toFixed(2)}°   cap = ±${(CAP_STANCE * 180 / Math.PI).toFixed(2)}°   overshoot beyond tol: ${overshoot ? 'YES' : 'no'}`)
  console.log(`  GATE 4.3: ${overshoot ? 'FAIL' : 'PASS'}`)

  const speeds: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const dAng = samples[i].angle - samples[i - 1].angle
    speeds.push(Math.abs(dAng) / TIMESTEP)
  }
  const cycleSeconds = 1 / (DRIVE * EXC * 0.8)
  const cycleSteps = Math.max(1, Math.round(cycleSeconds / TIMESTEP))
  const peaks: number[] = []
  for (let i = 0; i + cycleSteps <= speeds.length; i += cycleSteps) {
    let peak = 0
    for (let j = 0; j < cycleSteps; j++) if (speeds[i + j] > peak) peak = speeds[i + j]
    peaks.push(peak)
  }
  peaks.sort((a, b) => a - b)
  const medianPeak = peaks.length > 0 ? peaks[Math.floor(peaks.length / 2)] : 0
  const threshold = medianPeak * 0.5
  let slow = 0
  for (const v of speeds) if (v < threshold) slow++
  const stanceFrac = speeds.length > 0 ? slow / speeds.length : 0
  console.log(`\n## GATE 4.4 (realised stance fraction in [0.72, 0.82], threshold = 0.5 · median per-cycle peak speed)`)
  console.log(`  cycleSeconds=${cycleSeconds.toFixed(3)}  medianPeakSpeed=${medianPeak.toFixed(2)} rad/s  threshold=${threshold.toFixed(2)} rad/s`)
  console.log(`  fraction with |speed| < threshold: ${stanceFrac.toFixed(3)}   (target ${DUTY_STANCE})`)
  console.log(`  GATE 4.4: ${stanceFrac >= 0.72 && stanceFrac <= 0.82 ? 'PASS' : 'FAIL'}`)

  world.free()
}

main().catch((e) => {
  console.error('ERROR', e)
  process.exit(1)
})
