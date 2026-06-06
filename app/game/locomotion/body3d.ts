import RAPIER from '@dimforge/rapier3d-compat'
import { Vector3, Quaternion } from 'three'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'
import { STD_SEGMENT_WIDTH, defaultWeightFor } from './weights'

const CAPSULE_Y = new Vector3(0, 1, 0)

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

export function buildBody3D(world: RAPIER.World, groups: BodyGroup[]): Body3D | null {
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
  // the segment forward. This keeps every revolute joint's yaw axis = world up, so a curved 3D
  // rest pose does not make adjacent joint axes disagree (which would snap the chain violently).
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
    const axisLocal = { x: 0, y: 1, z: 0 } // world up = yaw axis (consistent for all bodies)
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

    joints.push({
      joint, parentIndex: i - 1, childIndex: i, cpgSegment: i,
      restAxisLocal: axisLocal, capForward: fwd, capBackward: back,
    })
    jointToCpgSegment.push(i)
  }

  const restCenters = centers.map((c) => ({ x: c.x, y: c.y, z: c.z }))
  return { bodies, joints, segLength, groupIds, jointToCpgSegment, restCenters }
}

// Signed joint angle about its yaw axis, from the two bodies' current rotations.
export function jointAngle(j: Body3DJoint, bodies: RAPIER.RigidBody[]): number {
  const qp = bodies[j.parentIndex].rotation()
  const qc = bodies[j.childIndex].rotation()
  const qParent = new Quaternion(qp.x, qp.y, qp.z, qp.w)
  const qChild = new Quaternion(qc.x, qc.y, qc.z, qc.w)
  const qRel = qParent.invert().multiply(qChild)
  // rotation about local Y → signed angle
  return 2 * Math.atan2(qRel.y, qRel.w)
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
