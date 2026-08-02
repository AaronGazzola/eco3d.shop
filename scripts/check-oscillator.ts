import type { BodyGroup } from '../app/admin/_lib/types'
import { buildNetwork, networkToPose } from '../app/game/locomotion/network'
import {
  PAPER_PHASE_BIAS_PER_SEGMENT,
  PAPER_SEGMENT_COUNT,
  axialLeftIndex,
  axialRightIndex,
  jointBends,
  scaledPhaseBias,
  setAxialDrive,
  stepNetwork,
  targetAmplitude,
  SATURATION_THRESHOLD_AXIAL,
} from '../app/game/locomotion/oscillator'
import {
  advanceRoot,
  forwardAxis,
  chainSegments,
  segmentVelocities,
  swimSpeed,
} from '../app/game/locomotion/swim'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++
    console.error(`FAIL ${name} ${detail}`)
  } else {
    console.error(`ok   ${name} ${detail}`)
  }
}

function buildRig(jointCount: number): BodyGroup[] {
  const groups: BodyGroup[] = []
  const spacing = 2
  for (let j = 0; j < jointCount; j++) {
    const type = j === 0 ? 'head' : j === jointCount - 1 ? 'tail' : 'spine'
    groups.push({
      id: `g${j}`,
      name: `g${j}`,
      segmentIds: [],
      color: '#fff',
      type,
      nodeFront: { x: j * spacing, y: 0, z: 0 },
      nodeBack: { x: (j + 1) * spacing, y: 0, z: 0 },
    })
  }
  return groups
}

function settle(jointCount: number, drive: number, seconds = 12) {
  const groups = buildRig(jointCount)
  const network = buildNetwork(groups, drive)
  const dt = 0.01
  for (let t = 0; t < seconds; t += dt) stepNetwork(network, dt)
  return { groups, network }
}

function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

const { network: settled } = settle(10, 1)

let worstAntiphase = 0
for (let j = 0; j < settled.jointCount; j++) {
  const left = settled.oscillators[axialLeftIndex(j)].phase
  const right = settled.oscillators[axialRightIndex(j)].phase
  const offset = Math.abs(Math.abs(angleDiff(left, right)) - Math.PI)
  worstAntiphase = Math.max(worstAntiphase, offset)
}
check('left and right settle in antiphase', worstAntiphase < 0.05, `worst ${worstAntiphase.toFixed(4)} rad`)

const lags: number[] = []
for (let j = 1; j < settled.jointCount; j++) {
  const prev = settled.oscillators[axialLeftIndex(j - 1)].phase
  const here = settled.oscillators[axialLeftIndex(j)].phase
  lags.push(angleDiff(prev, here))
}
check(
  'phase lag increases head to tail',
  lags.every((l) => l > 0),
  `per-joint lags ${lags.map((l) => l.toFixed(3)).join(', ')}`,
)

const paperTotal = PAPER_PHASE_BIAS_PER_SEGMENT * (PAPER_SEGMENT_COUNT - 1)
for (const n of [6, 10, 24]) {
  const constructed = scaledPhaseBias(n) * (n - 1)
  check(
    `constructed total lag matches the paper at ${n} joints`,
    Math.abs(constructed - paperTotal) < 1e-9,
    `${constructed.toFixed(4)} vs ${paperTotal.toFixed(4)} rad`,
  )
}

const settledTotals = [6, 10, 24].map((n) => {
  const { network } = settle(n, 1)
  let total = 0
  for (let j = 1; j < network.jointCount; j++) {
    total += angleDiff(
      network.oscillators[axialLeftIndex(j - 1)].phase,
      network.oscillators[axialLeftIndex(j)].phase,
    )
  }
  return total
})
const spread = Math.max(...settledTotals) - Math.min(...settledTotals)
check(
  'settled total lag is consistent across rig sizes',
  spread < 0.02,
  `totals ${settledTotals.map((t) => t.toFixed(4)).join(', ')} rad, spread ${spread.toFixed(4)}`,
)

function measureFrequency(jointCount: number, drive: number): number {
  const groups = buildRig(jointCount)
  const network = buildNetwork(groups, drive)
  const dt = 0.005
  for (let t = 0; t < 12; t += dt) stepNetwork(network, dt)
  const before = network.oscillators[axialLeftIndex(0)].phase
  let crossings = 0
  let prev = before
  const window = 4
  for (let t = 0; t < window; t += dt) {
    stepNetwork(network, dt)
    const now = network.oscillators[axialLeftIndex(0)].phase
    if (now < prev) crossings++
    prev = now
  }
  return crossings / window
}

const slow = measureFrequency(10, 0.5)
const fast = measureFrequency(10, 1.5)
check('higher drive runs faster', fast > slow, `${slow.toFixed(2)} Hz then ${fast.toFixed(2)} Hz`)

check(
  'amplitude collapses past the saturation threshold',
  targetAmplitude(SATURATION_THRESHOLD_AXIAL + 0.1, SATURATION_THRESHOLD_AXIAL) < 1e-6,
  `target ${targetAmplitude(SATURATION_THRESHOLD_AXIAL + 0.1, SATURATION_THRESHOLD_AXIAL).toExponential(2)}`,
)
check(
  'amplitude tracks drive below the threshold',
  Math.abs(targetAmplitude(1, SATURATION_THRESHOLD_AXIAL) - 1) < 1e-6,
)

function runSwim(drive: number, gain: number, seconds = 6) {
  const groups = buildRig(10)
  const network = buildNetwork(groups, drive)
  setAxialDrive(network, drive)
  const dt = 1 / 120
  const forward = forwardAxis(groups)
  for (let t = 0; t < 6; t += dt) stepNetwork(network, dt)

  let previous = chainSegments(groups, networkToPose(groups, jointBends(network, gain).bends))
  const pose = networkToPose(groups, jointBends(network, gain).bends)
  let distance = 0
  let peakBend = 0

  for (let t = 0; t < seconds; t += dt) {
    stepNetwork(network, dt)
    const bends = jointBends(network, gain).bends
    for (const b of bends) peakBend = Math.max(peakBend, Math.abs(b))
    const next = networkToPose(groups, bends)
    const segments = chainSegments(groups, next)
    const velocities = segmentVelocities(previous, segments, dt)
    const speed = swimSpeed(segments, velocities, forward, { thrustGain: 1, drag: 20 })
    advanceRoot(pose, speed, dt, forward)
    distance += speed * dt
    previous = segments
  }

  return { distance, peakBend, rootX: pose.root.x }
}

const still = (() => {
  const groups = buildRig(10)
  const pose = networkToPose(groups, new Array(10).fill(0))
  const segments = chainSegments(groups, pose)
  const velocities = segmentVelocities(segments, segments, 1 / 120)
  return swimSpeed(segments, velocities, forwardAxis(groups), { thrustGain: 1, drag: 20 })
})()
check('a still straight body does not advance', Math.abs(still) < 1e-9, `speed ${still}`)

const small = runSwim(1, 0.05)
const large = runSwim(1, 0.15)
check(
  'a deeper wave swims further',
  large.distance > small.distance,
  `${small.distance.toFixed(4)} then ${large.distance.toFixed(4)} over 6 s`,
)

const slower = runSwim(0.6, 0.1)
const quicker = runSwim(1.4, 0.1)
check(
  'a faster wave swims further',
  quicker.distance > slower.distance,
  `${slower.distance.toFixed(4)} then ${quicker.distance.toFixed(4)} over 6 s`,
)

check('swimming advances forward, not backward', small.distance > 0, `${small.distance.toFixed(4)}`)

console.error(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
