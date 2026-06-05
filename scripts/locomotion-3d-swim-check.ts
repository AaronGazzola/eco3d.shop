import RAPIER from '@dimforge/rapier3d-compat'
import { Vector3, Quaternion } from 'three'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildBody3D, jointAngle, jointRate, worldAxis } from '@/app/game/locomotion/body3d'
import { buildCpgSpec, initCpgState, stepCpg, oscillatorOutput } from '@/app/game/locomotion/cpg'
import { ekebergTorque, createDelayBuffer, pushAndReadDelayed } from '@/app/game/locomotion/muscles'

const RIG_LEN = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
const CAP_DEG = [60, 21, 23, 37, 39, 28, 28, 22, 30, 30, 45] // head cap unused
const GAIN = 12
const DRIVE = 2.0
const EXC = 0.09
const TIMESTEP = 1 / 120
const Cn = 0.6, Ct = 0.05, Cw = 0.03
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
  const fwd = new Vector3()
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
    if (dragOn) for (let i = 0; i < body.bodies.length; i++) {
      const b = body.bodies[i]
      const L = body.segLength[i]
      const v = b.linvel()
      const r = b.rotation()
      fwd.set(1, 0, 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w))
      const vPar = v.x * fwd.x + v.y * fwd.y + v.z * fwd.z
      b.addForce({
        x: -L * (Cn * (v.x - vPar * fwd.x) + Ct * vPar * fwd.x),
        y: -L * (Cn * (v.y - vPar * fwd.y) + Ct * vPar * fwd.y),
        z: -L * (Cn * (v.z - vPar * fwd.z) + Ct * vPar * fwd.z),
      }, true)
      const w = b.angvel()
      b.addTorque({ x: -L * Cw * w.x, y: -L * Cw * w.y, z: -L * Cw * w.z }, true)
    }
    world.step()
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

async function main() {
  await RAPIER.init()
  console.log(`fine gain sweep, drag ON (want maxJ ≲ cap, finalKE low/bounded, HEAD-FIRST)\n`)
  for (const g of [0.5, 0.8, 1, 1.2, 1.5]) runCase('curved-z drag ON', buildRigGroups(1.5, 0), true, g)
  console.log('')
  const G = 1
  runCase('straight  drag OFF', buildRigGroups(0, 0), false, G)
  runCase('curved-z  drag OFF', buildRigGroups(1.5, 0), false, G)
  runCase('straight  drag ON', buildRigGroups(0, 0), true, G)
  runCase('curved-3D drag ON', buildRigGroups(1.5, 0.8), true, G)
}

main().catch((e) => { console.error('ERROR', e); process.exit(1) })
