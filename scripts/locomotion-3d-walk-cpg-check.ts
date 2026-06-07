import { BodyGroup } from '@/app/admin/_lib/types'
import { axialChain } from '@/app/game/locomotion/body3d'
import {
  buildCpgSpec,
  initCpgState,
  stepCpg,
  oscillatorOutput,
  limbOutput,
  limbPhase,
  LIMB_LF,
  LIMB_RF,
  LIMB_LH,
  LIMB_RH,
} from '@/app/game/locomotion/cpg'

const RIG_LEN = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
const CAP_DEG = [60, 21, 23, 37, 39, 28, 28, 22, 30, 30, 45]
const FORE_HIP_IDX = 2
const HIND_HIP_IDX = 8
const TIMESTEP = 1 / 120
const EXC = 1
const SETTLE_SECONDS = 12
const MEASURE_SECONDS = 4

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
      angleCaps: { yaw: (CAP_DEG[i] * Math.PI) / 180, pitchUp: 1, pitchDown: 1 },
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

function wrapPi(d: number): number {
  return ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
}

function settleAndSample(drive: number): {
  drive: number
  limbPhases: number[]
  limbAmps: number[]
  axialAmps: number[]
  axialLagHeadToTail: number
} {
  const groups = buildWalkingRig()
  const { lengths, groupIds } = axialChain(groups)
  const spec = buildCpgSpec(lengths, groups, groupIds)
  const state = initCpgState(spec)
  const settleSteps = Math.round(SETTLE_SECONDS / TIMESTEP)
  const measureSteps = Math.round(MEASURE_SECONDS / TIMESTEP)
  for (let s = 0; s < settleSteps; s++) stepCpg(state, spec, drive, EXC, TIMESTEP)

  let limbAmpSum = [0, 0, 0, 0]
  let axialAmpSum = new Array(spec.n).fill(0)
  let axialPhaseDiffSum = 0
  const limbPhaseSamples: number[][] = [[], [], [], []]
  for (let s = 0; s < measureSteps; s++) {
    stepCpg(state, spec, drive, EXC, TIMESTEP)
    for (let i = 0; i < 4; i++) {
      limbAmpSum[i] += Math.abs(limbOutput(state, spec, i))
      limbPhaseSamples[i].push(limbPhase(state, spec, i))
    }
    for (let k = 0; k < spec.n; k++) {
      axialAmpSum[k] += Math.abs(oscillatorOutput(state, k))
    }
    axialPhaseDiffSum += wrapPi(state.phases[spec.n - 1] - state.phases[0])
  }
  const limbAmps = limbAmpSum.map((v) => v / measureSteps)
  const axialAmps = axialAmpSum.map((v) => v / measureSteps)
  const axialLagHeadToTail = axialPhaseDiffSum / measureSteps

  const meanPhase = (arr: number[]): number => {
    let sx = 0, sy = 0
    for (const p of arr) { sx += Math.cos(p); sy += Math.sin(p) }
    return Math.atan2(sy, sx)
  }
  const limbPhases = limbPhaseSamples.map(meanPhase)

  return { drive, limbPhases, limbAmps, axialAmps, axialLagHeadToTail }
}

function summarize(label: string, r: ReturnType<typeof settleAndSample>): void {
  const [LF, RF, LH, RH] = r.limbPhases
  const dLF_RH = wrapPi(LF - RH)
  const dRF_LH = wrapPi(RF - LH)
  const dDiag = wrapPi(LF - RF)
  const dHL = wrapPi(LH - LF)
  const dHR = wrapPi(RH - RF)
  const maxLimbAmp = Math.max(...r.limbAmps)
  const maxAxialAmp = Math.max(...r.axialAmps)
  console.log(`\n--- ${label} (drive=${r.drive.toFixed(2)}) ---`)
  console.log(
    `  limb phases (rad): LF=${LF.toFixed(2)}  RF=${RF.toFixed(2)}  LH=${LH.toFixed(2)}  RH=${RH.toFixed(2)}`
  )
  console.log(`  diagonal-trot checks (wrapped, target):`)
  console.log(`    LF-RH ≈ 0:    ${dLF_RH.toFixed(3)}`)
  console.log(`    RF-LH ≈ 0:    ${dRF_LH.toFixed(3)}`)
  console.log(`    LF-RF ≈ ±π:   ${dDiag.toFixed(3)}`)
  console.log(`    LH-LF ≈ ±π (hind leads): ${dHL.toFixed(3)}`)
  console.log(`    RH-RF ≈ ±π (hind leads): ${dHR.toFixed(3)}`)
  console.log(
    `  amplitudes — limb avg-|out|: max=${maxLimbAmp.toExponential(2)}   axial: max=${maxAxialAmp.toExponential(2)}`
  )
  console.log(`  axial head→tail phase lag (rad): ${r.axialLagHeadToTail.toFixed(3)} (swim ≈ 2π·1.58 ≈ ${(2 * Math.PI * 1.58).toFixed(2)})`)

  const trotOK =
    Math.abs(dLF_RH) < 0.5 &&
    Math.abs(dRF_LH) < 0.5 &&
    Math.abs(Math.abs(dDiag) - Math.PI) < 0.5
  console.log(`  GATE 4.1 (diagonal trot): ${trotOK ? 'PASS' : 'FAIL'}`)
}

function reportSaturation(active: ReturnType<typeof settleAndSample>, high: ReturnType<typeof settleAndSample>): void {
  const lowMax = Math.max(...active.limbAmps)
  const highMax = Math.max(...high.limbAmps)
  const axialMaxHigh = Math.max(...high.axialAmps)
  const limbsFold = highMax < 0.2 * lowMax
  const axialAlive = axialMaxHigh > 0.5 * Math.max(...active.axialAmps)
  console.log(`\n--- GATE 4.3 (limbs saturate before axis) ---`)
  console.log(`  drive=${active.drive.toFixed(2)} limb max=${lowMax.toExponential(2)}`)
  console.log(`  drive=${high.drive.toFixed(2)} limb max=${highMax.toExponential(2)}  axial max=${axialMaxHigh.toExponential(2)}`)
  console.log(`  limbs fold (high < 20% of active): ${limbsFold ? 'YES' : 'NO'}`)
  console.log(`  axial still alive (> 50% of active): ${axialAlive ? 'YES' : 'NO'}`)
  console.log(`  GATE 4.3: ${limbsFold && axialAlive ? 'PASS' : 'FAIL'}`)
}

function reportStandingWave(noLimb: ReturnType<typeof settleAndSample>, withLimb: ReturnType<typeof settleAndSample>): void {
  const swimLag = noLimb.axialLagHeadToTail
  const walkLag = withLimb.axialLagHeadToTail
  const towardStanding = Math.abs(walkLag) < Math.abs(swimLag)
  console.log(`\n--- GATE 4.2 (axial wave shifts toward standing when limbs active) ---`)
  console.log(`  swim (limbs saturated)        head→tail lag: ${swimLag.toFixed(3)}`)
  console.log(`  walk (limbs active)            head→tail lag: ${walkLag.toFixed(3)}`)
  console.log(`  |walk| < |swim|: ${towardStanding ? 'YES' : 'NO'}`)
  console.log(`  GATE 4.2: ${towardStanding ? 'PASS' : 'FAIL'}`)
}

function main(): void {
  console.log('Phase D1 limb-CPG signal gate — no body, no joints.')
  const walk = settleAndSample(1.0)
  const swim = settleAndSample(2.0)
  summarize('walk regime (drive 1.0, limbs active)', walk)
  summarize('swim regime (drive 2.0, limbs saturated)', swim)
  reportStandingWave(swim, walk)
  reportSaturation(walk, swim)
}

main()
