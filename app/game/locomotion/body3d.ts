import RAPIER from '@dimforge/rapier3d-compat'
import { Vector3, Quaternion } from 'three'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'
import { findFrontHip, findRearHip } from './legs'
import { LIMB_LF, LIMB_RF, LIMB_LH, LIMB_RH } from './cpg'
import { STD_SEGMENT_WIDTH, defaultWeightFor } from './weights'

export type CoupledMode = 'swim' | 'walk'

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
  // local anchor offset from each body's center to the shared joint node (for integrity checks):
  // the joint holds iff parentCenter+R_parent·anchorParent ≈ childCenter+R_child·anchorChild.
  anchorParent: { x: number; y: number; z: number }
  anchorChild: { x: number; y: number; z: number }
}

// Axial chain (lengths + group ids) from node spacing — no Rapier, for buildCpgSpec / diagnostics.
export function axialChain(groups: BodyGroup[]): { lengths: number[]; groupIds: string[] } {
  const chain = flattenSkeleton(buildSkeletonTree(groups))
  const lengths: number[] = []
  const groupIds: string[] = []
  for (let i = 0; i < chain.length; i++) {
    const g = chain[i]
    const parent = i > 0 ? chain[i - 1] : null
    const n = parent ? parent.nodeBack : (g.nodeFront ?? g.nodeBack)
    const e = g.nodeBack
    if (!n || !e) continue
    const dx = e.x - n.x
    const dy = (e.y ?? 0) - (n.y ?? 0)
    const dz = e.z - n.z
    lengths.push(Math.max(Math.hypot(dx, dy, dz), 1e-3))
    groupIds.push(g.id)
  }
  return { lengths, groupIds }
}

export function axialLengths(groups: BodyGroup[]): number[] {
  return axialChain(groups).lengths
}

export interface Body3DHipJoint {
  limbIdx: number
  joint: RAPIER.RevoluteImpulseJoint
  capStance: number
  capSwing: number
  thighIndex: number
}

export interface Body3D {
  bodies: RAPIER.RigidBody[]
  joints: Body3DJoint[]
  segLength: number[]
  groupIds: string[]
  jointToCpgSegment: number[]
  restCenters: { x: number; y: number; z: number }[]
  hipJoints: Body3DHipJoint[]
  groundBody: RAPIER.RigidBody | null
  mode: CoupledMode
}

function nodeVec(n: { x: number; y?: number; z: number } | undefined): Vector3 | null {
  if (!n) return null
  return new Vector3(n.x, n.y ?? 0, n.z)
}

function limbIndexOf(groups: BodyGroup[], leg: BodyGroup): number | null {
  const front = findFrontHip(groups)
  const rear = findRearHip(groups)
  if (front && leg.attachedToSpineId === front.id) {
    return leg.type === 'leg-left' ? LIMB_LF : LIMB_RF
  }
  if (rear && leg.attachedToSpineId === rear.id) {
    return leg.type === 'leg-left' ? LIMB_LH : LIMB_RH
  }
  return null
}

export function buildBody3D(
  world: RAPIER.World,
  groups: BodyGroup[],
  mode: CoupledMode = 'swim'
): Body3D | null {
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

  const hipJoints: Body3DHipJoint[] = []
  let groundBody: RAPIER.RigidBody | null = null

  if (mode === 'walk') {
    const legGroups = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right')
    const radius = STD_SEGMENT_WIDTH / 2
    for (const leg of legGroups) {
      const limbIdx = limbIndexOf(groups, leg)
      if (limbIdx === null) continue
      const spineId = leg.attachedToSpineId
      if (!spineId) continue
      const parentIndex = groupIds.indexOf(spineId)
      if (parentIndex < 0) continue
      const hipNode = nodeVec(leg.nodeFront)
      const footNode = nodeVec(leg.nodeBack)
      if (!hipNode || !footNode) continue
      const dir = new Vector3().subVectors(footNode, hipNode)
      const length = dir.length()
      if (length < 1e-4) continue
      dir.normalize()
      const center = new Vector3().addVectors(hipNode, dir.clone().multiplyScalar(length / 2))

      const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(center.x, center.y, center.z)
      const thigh = world.createRigidBody(bd)
      const halfHeight = Math.max(length / 2 - radius, 1e-3)
      const mass = leg.nodeWeight ?? defaultWeightFor(leg.type)
      const capQ = capsuleRotation(dir)
      const cd = RAPIER.ColliderDesc.capsule(halfHeight, radius)
        .setRotation({ x: capQ.x, y: capQ.y, z: capQ.z, w: capQ.w })
        .setMass(mass)
      world.createCollider(cd, thigh)

      const parentCenter = centers[parentIndex]
      const aParent = { x: hipNode.x - parentCenter.x, y: hipNode.y - parentCenter.y, z: hipNode.z - parentCenter.z }
      const aChild = { x: hipNode.x - center.x, y: hipNode.y - center.y, z: hipNode.z - center.z }
      const jd = RAPIER.JointData.revolute(aParent, aChild, { x: 0, y: 1, z: 0 })
      const joint = world.createImpulseJoint(jd, bodies[parentIndex], thigh, true) as RAPIER.RevoluteImpulseJoint
      const caps = effectiveAngleCaps(leg)
      const capStance = caps.yaw
      const capSwing = caps.yawBack ?? caps.yaw
      if (typeof joint.setLimits === 'function') joint.setLimits(-capSwing, capStance)
      if (typeof joint.configureMotorModel === 'function') joint.configureMotorModel(RAPIER.MotorModel.ForceBased)

      const thighIndex = bodies.length
      bodies.push(thigh)
      segLength.push(length)
      groupIds.push(leg.id)
      restCenters.push({ x: center.x, y: center.y, z: center.z })
      hipJoints.push({ limbIdx, joint, capStance, capSwing, thighIndex })
    }

    let lowestY = Infinity
    for (const rc of restCenters) if (rc.y - STD_SEGMENT_WIDTH < lowestY) lowestY = rc.y - STD_SEGMENT_WIDTH
    if (!Number.isFinite(lowestY)) lowestY = -2
    const groundY = lowestY - 0.05
    const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundY - 0.05, 0)
    groundBody = world.createRigidBody(groundDesc)
    const groundCollider = RAPIER.ColliderDesc.cuboid(50, 0.05, 50).setFriction(0.7)
    world.createCollider(groundCollider, groundBody)
  }

  return { bodies, joints, segLength, groupIds, jointToCpgSegment, restCenters, hipJoints, groundBody, mode }
}

// Swimming is a planar undulation. The internal torque/inertia dynamics otherwise tilt the body out
// of plane within ~0.6s, which decoheres the wave and (under drag) makes it "swim upward" off the
// floor. We keep it planar with a SOFT post-step projection (planarProject) rather than hard per-body
// DOF locks — hard locks over-constrain the revolute chain on a non-planar rig and blow it up. Full
// 6-DOF returns in the climbing phase.
export const PLANAR_SWIM = true

// Soft post-step planar projection: keep the swim in its horizontal plane without over-constraining
// the revolute chain. Per body, zero the out-of-plane velocity (Y-linear, pitch/roll-angular), snap
// the height back to rest, and strip pitch/roll from the orientation (keep yaw only). Applied like
// the drag, after world.step(). Cheap, can't inject solver forces, and holds the body planar so the
// controller's yaw-only angle/rate readback stays valid.
export function planarProject(body: Body3D): void {
  for (let i = 0; i < body.bodies.length; i++) {
    const b = body.bodies[i]
    const v = b.linvel()
    b.setLinvel({ x: v.x, y: 0, z: v.z }, true)
    const w = b.angvel()
    b.setAngvel({ x: 0, y: w.y, z: 0 }, true)
    const t = b.translation()
    b.setTranslation({ x: t.x, y: body.restCenters[i].y, z: t.z }, false)
    const q = b.rotation()
    const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z))
    b.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, false)
  }
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
