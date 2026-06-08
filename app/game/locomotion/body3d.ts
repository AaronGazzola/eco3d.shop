import RAPIER from '@dimforge/rapier3d-compat'
import { Vector3, Quaternion } from 'three'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'
import { STD_SEGMENT_WIDTH, defaultWeightFor } from './weights'

const CAPSULE_Y = new Vector3(0, 1, 0)

// Swim = neutral-buoyancy water (gravity off, legs are passengers). Land = gravity + a ground plane,
// legs built as physics and the body stands on them.
export type CoupledMode = 'swim' | 'land'


// Rotation taking the capsule's default +Y long axis onto the segment's forward direction.
function capsuleRotation(forward: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(CAPSULE_Y, forward.clone().normalize())
}

export interface Body3DJoint {
  joint: RAPIER.ImpulseJoint
  parentIndex: number
  childIndex: number
  cpgSegment: number
  restAxisLocal: { x: number; y: number; z: number }
  capForward: number
  capBackward: number
  // local anchor offset from each body's center to the shared joint node (for integrity checks):
  // the joint holds iff parentCenter+R_parent·anchorParent ≈ childCenter+R_child·anchorChild.
  anchorParent: { x: number; y: number; z: number }
  anchorChild: { x: number; y: number; z: number }
}

// Axial segment lengths from node spacing — no Rapier, for buildCpgSpec / diagnostics.
export function axialLengths(groups: BodyGroup[]): number[] {
  const chain = flattenSkeleton(buildSkeletonTree(groups))
  const out: number[] = []
  for (let i = 0; i < chain.length; i++) {
    const g = chain[i]
    const parent = i > 0 ? chain[i - 1] : null
    const n = parent ? parent.nodeBack : (g.nodeFront ?? g.nodeBack)
    const e = g.nodeBack
    if (!n || !e) continue
    const dx = e.x - n.x
    const dy = (e.y ?? 0) - (n.y ?? 0)
    const dz = e.z - n.z
    out.push(Math.max(Math.hypot(dx, dy, dz), 1e-3))
  }
  return out
}

export interface Body3D {
  bodies: RAPIER.RigidBody[]
  joints: Body3DJoint[]
  segLength: number[]
  groupIds: string[]
  jointToCpgSegment: number[]
  // rest center of each body in model/node space — used to render meshes (which live in model
  // space) at the body's current transform: world = T·R·translate(−restCenter).
  restCenters: { x: number; y: number; z: number }[]
}

function nodeVec(n: { x: number; y?: number; z: number } | undefined): Vector3 | null {
  if (!n) return null
  return new Vector3(n.x, n.y ?? 0, n.z)
}

export function buildBody3D(world: RAPIER.World, groups: BodyGroup[], mode: CoupledMode = 'swim'): Body3D | null {
  const chain = flattenSkeleton(buildSkeletonTree(groups))
  if (chain.length === 0) return null

  // node[i] = rotation center: head uses nodeFront, others use parent.nodeBack; segEnd[i] = group[i].nodeBack
  const nodes: Vector3[] = []
  const ends: Vector3[] = []
  const usable: BodyGroup[] = []
  for (let i = 0; i < chain.length; i++) {
    const g = chain[i]
    const parent = i > 0 ? chain[i - 1] : null
    const node = parent ? nodeVec(parent.nodeBack) : nodeVec(g.nodeFront ?? g.nodeBack)
    const end = nodeVec(g.nodeBack)
    if (!node || !end) continue
    nodes.push(node)
    ends.push(end)
    usable.push(g)
  }
  if (usable.length === 0) return null

  const radius = STD_SEGMENT_WIDTH / 2
  const bodies: RAPIER.RigidBody[] = []
  const segLength: number[] = []
  const groupIds: string[] = []
  const dirs: Vector3[] = []
  const centers: Vector3[] = []

  // All bodies stay WORLD-ALIGNED (identity rotation); only the capsule collider is rotated to
  // the segment forward. World-aligned bodies mean each revolute joint specifies its axis as a
  // single world vector that BOTH connected bodies share at rest — so there is no within-joint axis
  // disagreement (which is what snaps the chain). Each joint may still carry its OWN tilted axis.
  for (let i = 0; i < usable.length; i++) {
    const g = usable[i]
    const node = nodes[i]
    const end = ends[i]
    let dir = new Vector3().subVectors(end, node)
    let length = dir.length()
    if (length < 1e-4) {
      dir = i > 0 ? dirs[i - 1].clone() : new Vector3(1, 0, 0)
      length = i > 0 ? segLength[i - 1] : 1
    }
    dir.normalize()
    const center = new Vector3().addVectors(node, dir.clone().multiplyScalar(length / 2))

    const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(center.x, center.y, center.z)
    const body = world.createRigidBody(bd)

    const halfHeight = Math.max(length / 2 - radius, 1e-3)
    const mass = g.nodeWeight ?? defaultWeightFor(g.type)
    const capQ = capsuleRotation(dir)
    const cd = RAPIER.ColliderDesc.capsule(halfHeight, radius)
      .setRotation({ x: capQ.x, y: capQ.y, z: capQ.z, w: capQ.w })
      .setMass(mass)
    world.createCollider(cd, body)

    bodies.push(body)
    segLength.push(length)
    groupIds.push(g.id)
    dirs.push(dir)
    centers.push(center)
  }

  const joints: Body3DJoint[] = []
  const jointToCpgSegment: number[] = []
  for (let i = 1; i < usable.length; i++) {
    const node = nodes[i] // = group[i-1].nodeBack, the shared joint location
    // bodies are world-aligned, so local anchors are just world offsets from each body center
    const a1 = node.clone().sub(centers[i - 1])
    const a2 = node.clone().sub(centers[i])
    // Bend axis = the child segment's LOCAL up: world-up with its along-segment component removed,
    // i.e. the component of (0,1,0) perpendicular to the segment forward. For a horizontal segment
    // this is exactly world-up; for a segment tilted by the rig's node heights it tilts with it.
    // Because the capsule is axisymmetric about its forward, any perpendicular axis is a PRINCIPAL
    // axis of its inertia — so the muscle torque about it produces a clean in-segment-plane bend
    // with no roll/pitch leak (a world-up torque on a tilted segment is what drifted it off-plane).
    // The axis lives in the body's local frame, so when a segment later pitches up/down the bend
    // stays parallel to the segment, not the floor.
    const f = dirs[i]
    const axisV = new Vector3(0, 1, 0).addScaledVector(f, -f.y)
    if (axisV.lengthSq() < 1e-8) axisV.set(0, 1, 0) // near-vertical segment: fall back to world up
    axisV.normalize()
    const axisLocal = { x: axisV.x, y: axisV.y, z: axisV.z }
    const jd = RAPIER.JointData.revolute(
      { x: a1.x, y: a1.y, z: a1.z },
      { x: a2.x, y: a2.y, z: a2.z },
      axisLocal
    )
    const joint = world.createImpulseJoint(jd, bodies[i - 1], bodies[i], true) as RAPIER.RevoluteImpulseJoint
    const caps = effectiveAngleCaps(usable[i])
    const fwd = caps.yaw
    const back = caps.yawBack ?? caps.yaw
    if (typeof joint.setLimits === 'function') joint.setLimits(-back, fwd)
    // The Ekeberg muscle is driven through this joint's ForceBased motor (implicit, energy-stable)
    // rather than an explicit external torque (which numerically injects energy). See useLocomotion.
    if (typeof joint.configureMotorModel === 'function') joint.configureMotorModel(RAPIER.MotorModel.ForceBased)

    joints.push({
      joint, parentIndex: i - 1, childIndex: i, cpgSegment: i,
      restAxisLocal: axisLocal, capForward: fwd, capBackward: back,
      anchorParent: { x: a1.x, y: a1.y, z: a1.z },
      anchorChild: { x: a2.x, y: a2.y, z: a2.z },
    })
    jointToCpgSegment.push(i)
  }

  const restCenters = centers.map((c) => ({ x: c.x, y: c.y, z: c.z }))

  // LAND regime (Phase F0): build the legs as real capsules from each hip socket (on the parent
  // girdle) down to the leg's nodeFoot, with foot contact + friction, so the body stands on them.
  // Hips are RIGID (fixed) here — standing foundation only; the paper's limb CPG + transfer function
  // will drive motorized hips in the walking step. Floor sits just below the feet (y≈0).
  if (mode === 'land') {
    const legRadius = STD_SEGMENT_WIDTH / 2
    let lowestFootY = Infinity
    for (const leg of groups) {
      if (leg.type !== 'leg-left' && leg.type !== 'leg-right') continue
      const parent = groups.find((g) => g.id === leg.attachedToSpineId)
      if (!parent) continue
      const parentIndex = groupIds.indexOf(parent.id)
      if (parentIndex < 0) continue
      const socket = leg.type === 'leg-left' ? parent.nodeHipLeft : parent.nodeHipRight
      const hip = nodeVec(socket)
      const foot = nodeVec((leg as { nodeFoot?: { x: number; y?: number; z: number } }).nodeFoot)
      if (!hip || !foot) continue
      const dir = new Vector3().subVectors(foot, hip)
      const len = dir.length()
      if (len < 1e-3) continue
      dir.normalize()
      const center = new Vector3().addVectors(hip, dir.clone().multiplyScalar(len / 2))

      const lbd = RAPIER.RigidBodyDesc.dynamic().setTranslation(center.x, center.y, center.z)
      const legBody = world.createRigidBody(lbd)
      const legHalf = Math.max(len / 2 - legRadius, 1e-3)
      const legMass = leg.nodeWeight ?? defaultWeightFor(leg.type)
      const legQ = capsuleRotation(dir)
      const lcd = RAPIER.ColliderDesc.capsule(legHalf, legRadius)
        .setRotation({ x: legQ.x, y: legQ.y, z: legQ.z, w: legQ.w })
        .setMass(legMass)
        .setFriction(0.9)
      world.createCollider(lcd, legBody)

      const pc = centers[parentIndex]
      const a1 = { x: hip.x - pc.x, y: hip.y - pc.y, z: hip.z - pc.z }
      const a2 = { x: hip.x - center.x, y: hip.y - center.y, z: hip.z - center.z }
      const jd = RAPIER.JointData.fixed(a1, { x: 0, y: 0, z: 0, w: 1 }, a2, { x: 0, y: 0, z: 0, w: 1 })
      world.createImpulseJoint(jd, bodies[parentIndex], legBody, true)

      bodies.push(legBody)
      segLength.push(len)
      groupIds.push(leg.id)
      restCenters.push({ x: center.x, y: center.y, z: center.z })
      lowestFootY = Math.min(lowestFootY, foot.y)
    }

    if (!Number.isFinite(lowestFootY)) lowestFootY = 0
    const groundTop = lowestFootY - legRadius - 0.02
    const gd = RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundTop - 0.05, 0)
    const groundBody = world.createRigidBody(gd)
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.05, 100).setFriction(0.9), groundBody)
  }

  return { bodies, joints, segLength, groupIds, jointToCpgSegment, restCenters }
}

// Signed joint angle about its bend axis, from the two bodies' current rotations. The revolute
// constraint keeps the relative rotation aligned with restAxisLocal, so the signed angle is the
// quaternion's vector part projected onto that axis. Reduces to the y-component for a world-up axis.
export function jointAngle(j: Body3DJoint, bodies: RAPIER.RigidBody[]): number {
  const qp = bodies[j.parentIndex].rotation()
  const qc = bodies[j.childIndex].rotation()
  const qParent = new Quaternion(qp.x, qp.y, qp.z, qp.w)
  const qChild = new Quaternion(qc.x, qc.y, qc.z, qc.w)
  const qRel = qParent.invert().multiply(qChild)
  const a = j.restAxisLocal
  return 2 * Math.atan2(qRel.x * a.x + qRel.y * a.y + qRel.z * a.z, qRel.w)
}

// Joint angular rate about its world axis.
export function jointRate(j: Body3DJoint, bodies: RAPIER.RigidBody[]): number {
  const c = bodies[j.childIndex]
  const p = bodies[j.parentIndex]
  const axisWorld = worldAxis(j, bodies)
  const wc = c.angvel()
  const wp = p.angvel()
  return (wc.x - wp.x) * axisWorld.x + (wc.y - wp.y) * axisWorld.y + (wc.z - wp.z) * axisWorld.z
}

// The joint's yaw axis in world space (child body's current up).
export function worldAxis(j: Body3DJoint, bodies: RAPIER.RigidBody[]): { x: number; y: number; z: number } {
  const qc = bodies[j.childIndex].rotation()
  const v = new Vector3(j.restAxisLocal.x, j.restAxisLocal.y, j.restAxisLocal.z)
  v.applyQuaternion(new Quaternion(qc.x, qc.y, qc.z, qc.w))
  return { x: v.x, y: v.y, z: v.z }
}
