import RAPIER from '@dimforge/rapier3d-compat'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildBody3D, jointAngle, jointRate, worldAxis } from '@/app/game/locomotion/body3d'
import { buildCpgSpec, initCpgState, stepCpg, oscillatorOutput } from '@/app/game/locomotion/cpg'
import { ekebergTorque, createDelayBuffer, pushAndReadDelayed, ALPHA, BETA, GAMMA, DELTA } from '@/app/game/locomotion/muscles'
import { applyEnvironment3D } from '@/app/game/locomotion/environment'

const RIG_LEN = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
const CAP_DEG = [60, 21, 23, 37, 39, 28, 28, 22, 30, 30, 45] // head cap unused
const GAIN = 12
const DRIVE = 3.0
const EXC = 0.15
const TIMESTEP = 1 / 120
const JOINT_DAMP = 2 // matches the planar coupled mode's effective joint damping

// curveZ/curveY add a curved 3D rest pose (the real rig is not a straight line).
function buildRigGroups(curveZ = 0, curveY = 0): BodyGroup[] {
  const groups: BodyGroup[] = []
  const pts: { x: number; y: number; z: number }[] = []
  let x = 0
  pts.push({ x: 0, y: 0, z: 0 })
  for (let i = 0; i < RIG_LEN.length; i++) {
    x += RIG_LEN[i]
    const t = x / 21
    pts.push({ x, y: curveY * Math.sin(t * Math.PI), z: curveZ * Math.sin(t * Math.PI * 2) })
  }
  for (let i = 0; i < RIG_LEN.length; i++) {
    const type = i === 0 ? 'head' : i === RIG_LEN.length - 1 ? 'tail' : 'spine'
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

function comX(bodies: RAPIER.RigidBody[]): number {
  let s = 0
  for (const b of bodies) s += b.translation().x
  return s / bodies.length
}

function kineticEnergy(bodies: RAPIER.RigidBody[]): number {
  let ke = 0
  for (const b of bodies) {
    const v = b.linvel()
    ke += 0.5 * b.mass() * (v.x * v.x + v.y * v.y + v.z * v.z)
  }
  return ke
}

function runCase(label: string, groups: BodyGroup[], dragOn = true, gain = GAIN) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  world.timestep = TIMESTEP
  const body = buildBody3D(world, groups)
  if (!body) { console.log(`${label}: build failed`); return }

  const cpgSpec = buildCpgSpec(body.segLength)
  const cpgState = initCpgState(cpgSpec)
  const delay = body.joints.map(() => createDelayBuffer(TIMESTEP))
  const startCom = comX(body.bodies)
  let maxJoint = 0, peakKE = 0, finalKE = 0, blew = false
  const steps = Math.round(10 / TIMESTEP)
  for (let s = 0; s < steps; s++) {
    stepCpg(cpgState, cpgSpec, DRIVE, EXC, TIMESTEP)
    for (let j = 0; j < body.joints.length; j++) {
      const jt = body.joints[j]
      const k = body.jointToCpgSegment[j]
      const mL = oscillatorOutput(cpgState, k) * gain
      const mR = oscillatorOutput(cpgState, k + cpgSpec.n) * gain
      const d = pushAndReadDelayed(delay[j], mL, mR)
      const phi = jointAngle(jt, body.bodies)
      const phiDot = jointRate(jt, body.bodies)
      const tau = ekebergTorque(d.mL, d.mR, phi, phiDot) - JOINT_DAMP * phiDot
      maxJoint = Math.max(maxJoint, Math.abs(phi))
      const ax = worldAxis(jt, body.bodies)
      body.bodies[jt.childIndex].addTorque({ x: ax.x * tau, y: ax.y * tau, z: ax.z * tau }, true)
      body.bodies[jt.parentIndex].addTorque({ x: -ax.x * tau, y: -ax.y * tau, z: -ax.z * tau }, true)
    }
    world.step()
    if (dragOn) applyEnvironment3D(body, TIMESTEP)
    const ke = kineticEnergy(body.bodies)
    peakKE = Math.max(peakKE, ke)
    finalKE = ke
    if (!Number.isFinite(comX(body.bodies))) { blew = true; break }
  }
  const endCom = comX(body.bodies)
  const dx = endCom - startCom
  console.log(`${label.padEnd(34)} gain=${String(gain).padStart(2)}  maxJ=${(maxJoint * 180 / Math.PI).toFixed(0).padStart(3)}°  peakKE=${peakKE.toExponential(1)}  finalKE=${finalKE.toExponential(1)}  Δx=${dx.toFixed(2).padStart(7)}  ${blew ? 'DIVERGED' : dx < 0 ? 'HEAD-FIRST' : 'tail-first'}`)
  world.free()
}

function traceLongRun(label: string, groups: BodyGroup[], dragOn: boolean, gain: number, seconds: number, noLimits = false, useMotor = false) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  world.timestep = TIMESTEP
  const body = buildBody3D(world, groups)!
  if (noLimits) {
    for (const jt of body.joints) {
      const j = jt.joint as unknown as { setLimits?: (lo: number, hi: number) => void }
      if (j.setLimits) j.setLimits(-Math.PI, Math.PI)
    }
  }
  if (useMotor) {
    for (const jt of body.joints) {
      (jt.joint as RAPIER.RevoluteImpulseJoint).configureMotorModel(RAPIER.MotorModel.ForceBased)
    }
  }
  // inertia + mass dump (settle the ~0.044 question): print yaw-axis effective inertia
  console.log(`--- ${label} (gain ${gain}, drag ${dragOn ? 'ON' : 'OFF'}, ${seconds}s) ---`)
  const I0 = body.bodies[0].principalInertia()
  console.log(`  head: mass ${body.bodies[0].mass().toFixed(2)}  principalInertia (${I0.x.toFixed(3)}, ${I0.y.toFixed(3)}, ${I0.z.toFixed(3)})`)
  const cpgSpec = buildCpgSpec(body.segLength)
  const cpgState = initCpgState(cpgSpec)
  const delay = body.joints.map(() => createDelayBuffer(TIMESTEP))
  const steps = Math.round(seconds / TIMESTEP)
  const markEvery = Math.round(1 / TIMESTEP)
  for (let s = 0; s < steps; s++) {
    stepCpg(cpgState, cpgSpec, DRIVE, EXC, TIMESTEP)
    let maxJfrac = 0
    for (let j = 0; j < body.joints.length; j++) {
      const jt = body.joints[j]
      const k = body.jointToCpgSegment[j]
      const mL = oscillatorOutput(cpgState, k) * gain
      const mR = oscillatorOutput(cpgState, k + cpgSpec.n) * gain
      const d = pushAndReadDelayed(delay[j], mL, mR)
      const phi = jointAngle(jt, body.bodies)
      const phiDot = jointRate(jt, body.bodies)
      const cap = phi >= 0 ? jt.capForward : jt.capBackward
      if (cap > 1e-6) maxJfrac = Math.max(maxJfrac, Math.abs(phi) / cap)
      if (useMotor) {
        // Ekeberg torque rewritten as a spring-damper, applied via Rapier's implicit motor.
        // T = α(mL−mR) − β(mL+mR+γ)φ − δφ̇  =  −k(φ−φEq) − δφ̇,  k=β(mL+mR+γ), φEq=α(mL−mR)/k.
        const kStiff = BETA * (d.mL + d.mR + GAMMA)
        const phiEq = kStiff > 1e-9 ? (ALPHA * (d.mL - d.mR)) / kStiff : 0
        ;(jt.joint as RAPIER.RevoluteImpulseJoint).configureMotorPosition(phiEq, kStiff, DELTA)
      } else {
        const tau = ekebergTorque(d.mL, d.mR, phi, phiDot) - JOINT_DAMP * phiDot
        const ax = worldAxis(jt, body.bodies)
        body.bodies[jt.childIndex].addTorque({ x: ax.x * tau, y: ax.y * tau, z: ax.z * tau }, true)
        body.bodies[jt.parentIndex].addTorque({ x: -ax.x * tau, y: -ax.y * tau, z: -ax.z * tau }, true)
      }
    }
    if (useMotor) for (const b of body.bodies) b.wakeUp()
    world.step()
    if (dragOn) applyEnvironment3D(body, TIMESTEP)
    if (s % markEvery === 0) {
      console.log(`   t=${(s * TIMESTEP).toFixed(0).padStart(2)}s  KE=${kineticEnergy(body.bodies).toExponential(2)}  maxJ=${(maxJfrac * 100).toFixed(0)}%`)
    }
  }
  world.free()
}

async function main() {
  await RAPIER.init()
  console.log(`Energy-conservation test (drag OFF, gravity OFF → KE should NOT grow). DRIVE=${DRIVE} EXC=${EXC} gain=1\n`)
  console.log('=== EXPLICIT torque (current, +JOINT_DAMP=2) — the energy pump ===')
  traceLongRun('explicit', buildRigGroups(0, 0), false, 1, 20)
  console.log('\n=== MOTOR (implicit, paper δ=0.1 only, no JOINT_DAMP) — should stay energy-stable ===')
  traceLongRun('motor', buildRigGroups(0, 0), false, 1, 20, false, true)
  console.log('\n=== MOTOR on curved rig (real-dragon shape) ===')
  traceLongRun('motor-curved', buildRigGroups(1.5, 0), false, 1, 20, false, true)
}

main().catch((e) => { console.error('ERROR', e); process.exit(1) })
