import RAPIER from '@dimforge/rapier3d-compat'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildBody3D, jointAngle, jointRate, worldAxis } from '@/app/game/locomotion/body3d'
import { buildCpgSpec, initCpgState, stepCpg, oscillatorOutput } from '@/app/game/locomotion/cpg'
import { ekebergTorque, createDelayBuffer, pushAndReadDelayed } from '@/app/game/locomotion/muscles'
import { applyEnvironment3D } from '@/app/game/locomotion/environment'

const RIG_LEN = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
const CAP_DEG = [60, 21, 23, 37, 39, 28, 28, 22, 30, 30, 45] // head cap unused
const GAIN = 12
const DRIVE = 2.0
const EXC = 0.09
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

function traceLongRun(label: string, groups: BodyGroup[], dragOn: boolean, gain: number, seconds: number) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  world.timestep = TIMESTEP
  const body = buildBody3D(world, groups)!
  // inertia + mass dump (settle the ~0.044 question): print yaw-axis effective inertia
  console.log(`--- ${label} (gain ${gain}, drag ${dragOn ? 'ON' : 'OFF'}, ${seconds}s) ---`)
  const I0 = body.bodies[0].principalInertia()
  console.log(`  head: mass ${body.bodies[0].mass().toFixed(2)}  principalInertia (${I0.x.toFixed(3)}, ${I0.y.toFixed(3)}, ${I0.z.toFixed(3)})`)
  const cpgSpec = buildCpgSpec(body.segLength)
  const cpgState = initCpgState(cpgSpec)
  const delay = body.joints.map(() => createDelayBuffer(TIMESTEP))
  const steps = Math.round(seconds / TIMESTEP)
  const marks = new Set([0, 2, 5, 10, 20, 30, 45, 60].map((s) => Math.round(s / TIMESTEP)))
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
      const ax = worldAxis(jt, body.bodies)
      body.bodies[jt.childIndex].addTorque({ x: ax.x * tau, y: ax.y * tau, z: ax.z * tau }, true)
      body.bodies[jt.parentIndex].addTorque({ x: -ax.x * tau, y: -ax.y * tau, z: -ax.z * tau }, true)
    }
    world.step()
    if (dragOn) applyEnvironment3D(body, TIMESTEP)
    if (marks.has(s)) {
      const com = body.bodies.reduce((a, b) => { const p = b.translation(); return { x: a.x + p.x, y: a.y + p.y, z: a.z + p.z } }, { x: 0, y: 0, z: 0 })
      console.log(`   t=${(s * TIMESTEP).toFixed(0).padStart(2)}s  KE=${kineticEnergy(body.bodies).toExponential(2)}  comY=${(com.y / 11).toFixed(3)}`)
    }
  }
  world.free()
}

async function main() {
  await RAPIER.init()
  console.log('Long-run energy trace (does KE grow unbounded? does comY float up?)\n')
  traceLongRun('curved-z', buildRigGroups(1.5, 0), true, 1, 60)
  traceLongRun('curved-z', buildRigGroups(1.5, 0), false, 1, 60)
}

main().catch((e) => { console.error('ERROR', e); process.exit(1) })
