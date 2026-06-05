import RAPIER from '@dimforge/rapier3d-compat'
import { Vector3, Quaternion, Matrix4 } from 'three'
import { BodyGroup, BodyGroupType } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'

export const DEFAULT_AXIAL_WEIGHT = 1.5
export const DEFAULT_LEG_WEIGHT = 0.4
export const STD_SEGMENT_WIDTH = 0.5

export function defaultWeightFor(type: BodyGroupType): number {
  return type === 'leg-left' || type === 'leg-right'
    ? DEFAULT_LEG_WEIGHT
    : DEFAULT_AXIAL_WEIGHT
}

const WORLD_UP = new Vector3(0, 1, 0)

export interface Body3DJoint {
  joint: RAPIER.ImpulseJoint
  parentIndex: number
  childIndex: number
  cpgSegment: number
  restAxisLocal: { x: number; y: number; z: number }
}

export interface Body3D {
  bodies: RAPIER.RigidBody[]
  joints: Body3DJoint[]
  segLength: number[]
  groupIds: string[]
  jointToCpgSegment: number[]
}

function nodeVec(n: { x: number; y?: number; z: number } | undefined): Vector3 | null {
  if (!n) return null
  return new Vector3(n.x, n.y ?? 0, n.z)
}

// Quaternion whose local +X = forward, local +Y ≈ world up (so the yaw axis is local +Y).
function segmentQuat(forward: Vector3): Quaternion {
  const x = forward.clone().normalize()
  let up = WORLD_UP.clone()
  if (Math.abs(x.dot(up)) > 0.99) up = new Vector3(0, 0, 1)
  const z = new Vector3().crossVectors(x, up).normalize()
  const y = new Vector3().crossVectors(z, x).normalize()
  const m = new Matrix4().makeBasis(x, y, z)
  return new Quaternion().setFromRotationMatrix(m)
}

// Capsule's local axis is +Y by default; rotate it to lie along local +X (the segment forward).
const CAPSULE_Y_TO_X = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(1, 0, 0))

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
  const quats: Quaternion[] = []
  const centers: Vector3[] = []

  for (let i = 0; i < usable.length; i++) {
    const g = usable[i]
    const node = nodes[i]
    const end = ends[i]
    let dir = new Vector3().subVectors(end, node)
    let length = dir.length()
    if (length < 1e-4) {
      // degenerate node spacing: reuse the previous segment's forward + length
      dir = i > 0 ? new Vector3(1, 0, 0).applyQuaternion(quats[i - 1]) : new Vector3(1, 0, 0)
      length = i > 0 ? segLength[i - 1] : 1
    }
    const q = segmentQuat(dir)
    const center = new Vector3().addVectors(node, dir.clone().setLength(length / 2))

    const bd = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    const body = world.createRigidBody(bd)

    const halfHeight = Math.max(length / 2 - radius, 1e-3)
    const mass = g.nodeWeight ?? defaultWeightFor(g.type)
    const cd = RAPIER.ColliderDesc.capsule(halfHeight, radius)
      .setRotation({ x: CAPSULE_Y_TO_X.x, y: CAPSULE_Y_TO_X.y, z: CAPSULE_Y_TO_X.z, w: CAPSULE_Y_TO_X.w })
      .setMass(mass)
    world.createCollider(cd, body)

    bodies.push(body)
    segLength.push(length)
    groupIds.push(g.id)
    quats.push(q)
    centers.push(center)
  }

  const joints: Body3DJoint[] = []
  const jointToCpgSegment: number[] = []
  for (let i = 1; i < usable.length; i++) {
    const node = nodes[i] // = group[i-1].nodeBack, the shared joint location
    // anchors in each body's local frame
    const a1 = node.clone().sub(centers[i - 1]).applyQuaternion(quats[i - 1].clone().invert())
    const a2 = node.clone().sub(centers[i]).applyQuaternion(quats[i].clone().invert())
    const axisLocal = { x: 0, y: 1, z: 0 } // local up = yaw axis
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

    joints.push({ joint, parentIndex: i - 1, childIndex: i, cpgSegment: i, restAxisLocal: axisLocal })
    jointToCpgSegment.push(i)
  }

  return { bodies, joints, segLength, groupIds, jointToCpgSegment }
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
