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

function buildRigGroups(): BodyGroup[] {
  const groups: BodyGroup[] = []
  let x = 0
  const ends: number[] = []
  for (let i = 0; i < RIG_LEN.length; i++) { x += RIG_LEN[i]; ends.push(x) }
  for (let i = 0; i < RIG_LEN.length; i++) {
    const type = i === 0 ? 'head' : i === RIG_LEN.length - 1 ? 'tail' : 'spine'
    const g: BodyGroup = {
      id: `g${i}`, name: `g${i}`, segmentIds: [], color: '#fff', type,
      nodeBack: { x: ends[i], y: 0, z: 0 },
      angleCaps: { yaw: (CAP_DEG[i] * Math.PI) / 180, pitchUp: 1, pitchDown: 1 },
    }
    if (i === 0) g.nodeFront = { x: 0, y: 0, z: 0 }
    groups.push(g)
  }
  return groups
}

function comX(bodies: RAPIER.RigidBody[]): number {
  let s = 0
  for (const b of bodies) s += b.translation().x
  return s / bodies.length
}

async function main() {
  await RAPIER.init()
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  world.timestep = TIMESTEP

  const groups = buildRigGroups()
  const body = buildBody3D(world, groups)
  if (!body) { console.log('build failed'); return }
  console.log(`built ${body.bodies.length} bodies, ${body.joints.length} joints`)
  console.log('seg lengths:', body.segLength.map((l) => l.toFixed(2)).join(' '))
  console.log('masses:', body.bodies.map((b) => b.mass().toFixed(2)).join(' '))

  const cpgSpec = buildCpgSpec(body.segLength)
  const cpgState = initCpgState(cpgSpec)
  const delay = body.joints.map(() => createDelayBuffer(TIMESTEP))

  const startCom = comX(body.bodies)
  const startHead = body.bodies[0].translation().x
  let maxJoint = 0
  let blew = false

  const totalT = 10
  const steps = Math.round(totalT / TIMESTEP)
  const fwd = new Vector3()
  for (let s = 0; s < steps; s++) {
    stepCpg(cpgState, cpgSpec, DRIVE, EXC, TIMESTEP)
    for (let j = 0; j < body.joints.length; j++) {
      const jt = body.joints[j]
      const k = body.jointToCpgSegment[j]
      const mL = oscillatorOutput(cpgState, k) * GAIN
      const mR = oscillatorOutput(cpgState, k + cpgSpec.n) * GAIN
      const d = pushAndReadDelayed(delay[j], mL, mR)
      const phi = jointAngle(jt, body.bodies)
      const phiDot = jointRate(jt, body.bodies)
      const tau = ekebergTorque(d.mL, d.mR, phi, phiDot)
      maxJoint = Math.max(maxJoint, Math.abs(phi))
      const ax = worldAxis(jt, body.bodies)
      body.bodies[jt.childIndex].addTorque({ x: ax.x * tau, y: ax.y * tau, z: ax.z * tau }, true)
      body.bodies[jt.parentIndex].addTorque({ x: -ax.x * tau, y: -ax.y * tau, z: -ax.z * tau }, true)
    }
    // 3D anisotropic drag
    for (let i = 0; i < body.bodies.length; i++) {
      const b = body.bodies[i]
      const L = body.segLength[i]
      const v = b.linvel()
      const r = b.rotation()
      fwd.set(1, 0, 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w))
      const vPar = v.x * fwd.x + v.y * fwd.y + v.z * fwd.z
      const fx = -L * (Cn * (v.x - vPar * fwd.x) + Ct * vPar * fwd.x)
      const fy = -L * (Cn * (v.y - vPar * fwd.y) + Ct * vPar * fwd.y)
      const fz = -L * (Cn * (v.z - vPar * fwd.z) + Ct * vPar * fwd.z)
      b.addForce({ x: fx, y: fy, z: fz }, true)
      const w = b.angvel()
      b.addTorque({ x: -L * Cw * w.x, y: -L * Cw * w.y, z: -L * Cw * w.z }, true)
    }
    world.step()
    if (!Number.isFinite(comX(body.bodies))) { blew = true; console.log(`BLEW UP at t=${(s * TIMESTEP).toFixed(2)}`); break }
  }

  if (blew) return
  const endCom = comX(body.bodies)
  const endHead = body.bodies[0].translation().x
  const tail = body.bodies[body.bodies.length - 1].translation()
  console.log(`\nmax joint angle: ${(maxJoint * 180 / Math.PI).toFixed(1)} deg`)
  console.log(`COM  x: ${startCom.toFixed(2)} -> ${endCom.toFixed(2)}  (Δ ${(endCom - startCom).toFixed(3)})`)
  console.log(`HEAD x: ${startHead.toFixed(2)} -> ${endHead.toFixed(2)}`)
  console.log(`(head is the -x end; snout faces -x, so Δx < 0 = HEAD-FIRST / forward)`)
  console.log(`tail body pos: (${tail.x.toFixed(2)}, ${tail.y.toFixed(2)}, ${tail.z.toFixed(2)})  [y,z show out-of-plane drift]`)
  console.log(`VERDICT: ${endCom - startCom < 0 ? 'HEAD-FIRST (correct)' : 'TAIL-FIRST (wrong)'}`)
}

main().catch((e) => { console.error('ERROR', e); process.exit(1) })
