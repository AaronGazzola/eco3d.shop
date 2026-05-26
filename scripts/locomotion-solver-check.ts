import { BodySpec } from '../app/game/locomotion/types'
import {
  initSolverState,
  stepSolver,
  perturb,
  kineticEnergy,
  centerOfMass,
} from '../app/game/locomotion/solver'

function makeSpec(segmentCount: number, cap: number): BodySpec {
  const segments = []
  for (let i = 0; i < segmentCount; i++) {
    segments.push({
      groupId: `s${i}`,
      length: 1,
      mass: 1,
      inertiaAboutComY: 0.1,
      restNodeX: i,
      restNodeZ: 0,
      restComX: i + 0.5,
      restComZ: 0,
    })
  }
  const joints = []
  for (let i = 1; i < segmentCount; i++) {
    joints.push({
      segmentIndex: i,
      coordIndex: 3 + (i - 1),
      yawForwardLimit: cap,
      yawBackwardLimit: cap,
    })
  }
  return { segments, joints, density: 1, restRootX: 0, restRootZ: 0 }
}

let failures = 0
function check(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!ok) failures++
}

function runFor(spec: BodySpec, seconds: number, dt: number, kick: number) {
  const state = initSolverState(spec)
  perturb(state, spec, kick)
  const startCom = centerOfMass(state, spec)
  const startEnergy = kineticEnergy(state, spec)
  let maxDrift = 0
  let maxEnergy = startEnergy
  let prevEnergy = startEnergy
  let monotonic = true
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i++) {
    stepSolver(state, spec, dt)
    const com = centerOfMass(state, spec)
    const drift = Math.hypot(com.x - startCom.x, com.z - startCom.z)
    if (drift > maxDrift) maxDrift = drift
    const e = kineticEnergy(state, spec)
    if (e > maxEnergy) maxEnergy = e
    if (e > prevEnergy + 1e-6) monotonic = false
    prevEnergy = e
  }
  return { state, startCom, startEnergy, maxDrift, maxEnergy, finalEnergy: prevEnergy, monotonic }
}

const spec = makeSpec(6, 0.5)

const a = runFor(spec, 4, 1 / 60, 1.0)
check(
  'COM conserved under internal motion',
  a.maxDrift < 1e-2,
  `max COM drift = ${a.maxDrift.toExponential(2)} (tol 1e-2)`
)
check(
  'energy decays monotonically with damping',
  a.monotonic,
  `start ${a.startEnergy.toFixed(4)} -> final ${a.finalEnergy.toExponential(2)}`
)
check(
  'chain settles to rest',
  a.finalEnergy < a.startEnergy * 1e-2,
  `final energy ${a.finalEnergy.toExponential(2)} vs start ${a.startEnergy.toFixed(4)}`
)
check(
  'energy never grows above start',
  a.maxEnergy <= a.startEnergy + 1e-6,
  `max energy ${a.maxEnergy.toFixed(4)} vs start ${a.startEnergy.toFixed(4)}`
)

const capSpec = makeSpec(4, 0.4)
const capState = initSolverState(capSpec)
perturb(capState, capSpec, 6.0)
let maxAngle = 0
for (let i = 0; i < Math.round(3 / (1 / 60)); i++) {
  stepSolver(capState, capSpec, 1 / 60)
  for (const ang of capState.jointAngles) maxAngle = Math.max(maxAngle, Math.abs(ang))
}
check(
  'limit stops keep joints within cap',
  maxAngle <= 0.4 + 0.05,
  `max |angle| = ${maxAngle.toFixed(4)} (cap 0.4, tol 0.05)`
)

const slow = runFor(spec, 3, 1 / 30, 1.0)
const fast = runFor(spec, 3, 1 / 120, 1.0)
const comGap = Math.hypot(slow.startCom.x - fast.startCom.x, slow.startCom.z - fast.startCom.z)
let angleGap = 0
for (let j = 0; j < slow.state.jointAngles.length; j++) {
  angleGap = Math.max(angleGap, Math.abs(slow.state.jointAngles[j] - fast.state.jointAngles[j]))
}
check(
  'frame-rate independence (30 vs 120 fps)',
  comGap < 1e-3 && angleGap < 5e-2,
  `com gap ${comGap.toExponential(2)}, max joint-angle gap ${angleGap.toExponential(2)}`
)

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`)
  process.exit(1)
} else {
  console.log('\nAll solver checks passed.')
}
