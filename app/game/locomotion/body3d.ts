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
// Axial segment lengths + their group ids in head→tail chain order (no Rapier; for the CPG spec
// and diagnostics). The group ids let the limb CPG attach each leg to its girdle's axial oscillator.
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

// A motorized hip (land mode), driven by useLocomotion from the limb CPG through the transfer
// function. One sturdy revolute on a TILTED axis (mostly vertical, leaned toward the leg's side):
// the same fore-aft sweep then also raises the foot in swing / lowers it in stance, so the foot
// clears without a second joint. `limbIdx` is LF/RF/LH/RH.
export interface Body3DHip {
  joint: RAPIER.RevoluteImpulseJoint
  limbIdx: number
  capStance: number
  capSwing: number
  // For grip-timing: which girdle body this leg hangs off, the leg's own body/collider index, and
  // the hip-socket / foot offsets in each body's local frame. Lets useLocomotion measure how far
  // forward/back the foot is reaching (driven by the body wave) to time the foot's floor grip.
  parentIndex: number
  legBodyIndex: number
  hipLocal: { x: number; y: number; z: number }
  footLocal: { x: number; y: number; z: number }
}

// How far the hip hinge leans from vertical toward the leg's side (radians). 0 = pure vertical
// (sprawled yaw, foot scrubs); larger = more of the sweep becomes vertical foot lift. Tune by eye.
export const HIP_AXIS_TILT = 0.5

// Land contact friction, set per-collider and combined by MULTIPLY against a friction-1.0 ground, so
// the effective surface friction equals each collider's own coefficient. Trunk slides (low) so the
// axial wave isn't pinned to the floor; feet grip (high) to turn the wave + step into traction.
// Live-tunable from the studio (useLocomotion updates the colliders each frame).
export const BODY_FRICTION_DEFAULT = 0
export const LEG_FRICTION_DEFAULT = 0

// Collision groups (Rapier packs membership in the high 16 bits, filter in the low 16). The body and
// legs are SOLID-mesh only for show — they collide with nothing. ALL ground contact goes through the
// zero-mass support balls placed at each node's authored height (trunk segments + feet alike), so the
// model rests on its node-height profile and the leg capsules never bang into the body or each other.
const GROUP_GROUND = 0x0001
const GROUP_BODY = 0x0002
const COLLIDE_NONE = (GROUP_BODY << 16) | 0x0000 // member BODY, collide with nothing (capsules)
const COLLIDE_GROUND_CONTACT = (GROUP_BODY << 16) | GROUP_GROUND // support balls ↔ ground only
const COLLIDE_GROUND = (GROUP_GROUND << 16) | GROUP_BODY // the floor ↔ body group only

export interface Body3D {
  bodies: RAPIER.RigidBody[]
  // one collider per body, parallel to `bodies` (trunk segments then legs). Friction is updated
  // live from the studio; isLeg is decided by groupIds, so this stays in body→collider order.
  colliders: RAPIER.Collider[]
  // zero-mass ground-contact spheres under the trunk (two per segment, spread left/right of the
  // spine) that hold the body flat at its authored node-height profile. Carry the body friction.
  groundContacts: RAPIER.Collider[]
  joints: Body3DJoint[]
  segLength: number[]
  groupIds: string[]
  jointToCpgSegment: number[]
  // rest center of each body in model/node space — used to render meshes (which live in model
  // space) at the body's current transform: world = T·R·translate(−restCenter).
  restCenters: { x: number; y: number; z: number }[]
  hipJoints: Body3DHip[]
}

function nodeVec(n: { x: number; y?: number; z: number } | undefined): Vector3 | null {
  if (!n) return null
  return new Vector3(n.x, n.y ?? 0, n.z)
}

export interface BuildBody3DOptions {
  // Land-rig parts, gated independently so the rig can be stripped back toward swim one piece at a
  // time. Ignored in swim mode (which never builds legs or a floor).
  buildLegs?: boolean
  buildGround?: boolean
}

export function buildBody3D(
  world: RAPIER.World,
  groups: BodyGroup[],
  mode: CoupledMode = 'swim',
  opts: BuildBody3DOptions = {}
): Body3D | null {
  const buildLegs = opts.buildLegs ?? true
  const buildGround = opts.buildGround ?? true
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
  const colliders: RAPIER.Collider[] = []
  const groundContacts: RAPIER.Collider[] = []
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
      .setFriction(BODY_FRICTION_DEFAULT)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
      .setCollisionGroups(COLLIDE_NONE)
    colliders.push(world.createCollider(cd, body))

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

  // LAND regime: build the legs as real capsules from each hip socket (on the parent girdle) down to
  // the leg's nodeFoot, with foot contact + friction. Each hip is a revolute joint about VERTICAL
  // with a ForceBased motor (D2): position-driven by useLocomotion through the limb transfer
  // function (it holds the rest angle when not stepping, so the body still stands). Floor sits just
  // below the feet (y≈0).
  const hipJoints: Body3DHip[] = []
  if (mode === 'land') {
    const legRadius = STD_SEGMENT_WIDTH / 2
    // Pass 1: resolve each leg's geometry + which girdle it hangs from (forward girdle = lower index).
    const specs: { leg: BodyGroup; parentIndex: number; hip: Vector3; foot: Vector3; dir: Vector3; len: number; center: Vector3 }[] = []
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
      specs.push({ leg, parentIndex, hip, foot, dir, len, center })
    }
    const foreIdx = specs.length ? Math.min(...specs.map((s) => s.parentIndex)) : -1
    // Floor height from the lowest foot node, computed up front so feet and trunk share it.
    let lowestFootY = Infinity
    for (const s of specs) lowestFootY = Math.min(lowestFootY, s.foot.y)
    if (!Number.isFinite(lowestFootY)) lowestFootY = 0
    const groundTop = lowestFootY - legRadius - 0.02
    if (buildLegs) for (const s of specs) {
      const legBodyIndex = bodies.length // leg collider + body both land at this index (arrays stay parallel)
      const lbd = RAPIER.RigidBodyDesc.dynamic().setTranslation(s.center.x, s.center.y, s.center.z)
      const legBody = world.createRigidBody(lbd)
      const legHalf = Math.max(s.len / 2 - legRadius, 1e-3)
      const legMass = s.leg.nodeWeight ?? defaultWeightFor(s.leg.type)
      const legQ = capsuleRotation(s.dir)
      const lcd = RAPIER.ColliderDesc.capsule(legHalf, legRadius)
        .setRotation({ x: legQ.x, y: legQ.y, z: legQ.z, w: legQ.w })
        .setMass(legMass)
        .setFriction(LEG_FRICTION_DEFAULT)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
        .setCollisionGroups(COLLIDE_NONE) // visual/mass only — never collides with body, legs, or floor
      colliders.push(world.createCollider(lcd, legBody))

      const pc = centers[s.parentIndex]
      const isHind = s.parentIndex !== foreIdx
      const isLeft = s.leg.type === 'leg-left'
      const limbIdx = (isHind ? 2 : 0) + (isLeft ? 0 : 1) // LF=0, RF=1, LH=2, RH=3
      // Single TILTED hinge: vertical leaned toward the leg's side (mirrored L/R) so the fore-aft
      // sweep also lifts the foot. One sturdy joint — holds the body weight like the vertical hinge.
      const tiltSign = isLeft ? 1 : -1
      const ax = new Vector3(0, Math.cos(HIP_AXIS_TILT), tiltSign * Math.sin(HIP_AXIS_TILT)).normalize()
      const a1 = { x: s.hip.x - pc.x, y: s.hip.y - pc.y, z: s.hip.z - pc.z }
      const a2 = { x: s.hip.x - s.center.x, y: s.hip.y - s.center.y, z: s.hip.z - s.center.z }
      const jd = RAPIER.JointData.revolute(a1, a2, { x: ax.x, y: ax.y, z: ax.z })
      const joint = world.createImpulseJoint(jd, bodies[s.parentIndex], legBody, true) as RAPIER.RevoluteImpulseJoint
      const caps = effectiveAngleCaps(s.leg)
      const capStance = caps.yaw
      const capSwing = caps.yawBack ?? caps.yaw
      if (typeof joint.setLimits === 'function') joint.setLimits(-capSwing, capStance)
      if (typeof joint.configureMotorModel === 'function') joint.configureMotorModel(RAPIER.MotorModel.ForceBased)
      hipJoints.push({
        joint, limbIdx, capStance, capSwing,
        parentIndex: s.parentIndex, legBodyIndex,
        hipLocal: { x: a1.x, y: a1.y, z: a1.z },
        footLocal: { x: s.dir.x * (s.len / 2), y: s.dir.y * (s.len / 2), z: s.dir.z * (s.len / 2) },
      })

      bodies.push(legBody)
      segLength.push(s.len)
      groupIds.push(s.leg.id)
      restCenters.push({ x: s.center.x, y: s.center.y, z: s.center.z })

      // Foot ground contact: a zero-mass ball centred ON the foot node, radius = (footY − groundTop),
      // so the foot node rests at its authored height no matter how the leg is rotated (a sphere
      // centred at the node always holds its centre one radius above the floor). Ground-only — never
      // the body — so turning legs on rests the feet at node height without disturbing the spine.
      if (buildGround) {
        const footBallR = Math.max(0.05, s.foot.y - groundTop)
        const fbcd = RAPIER.ColliderDesc.ball(footBallR)
          .setTranslation(s.dir.x * (s.len / 2), s.dir.y * (s.len / 2), s.dir.z * (s.len / 2))
          .setDensity(0)
          .setFriction(BODY_FRICTION_DEFAULT)
          .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
          .setCollisionGroups(COLLIDE_GROUND_CONTACT)
        groundContacts.push(world.createCollider(fbcd, legBody))
      }
    }

    if (buildGround) {
      const gd = RAPIER.RigidBodyDesc.fixed().setTranslation(0, groundTop - 0.05, 0)
      const groundBody = world.createRigidBody(gd)
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(100, 0.05, 100)
          .setFriction(1.0)
          .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
          .setCollisionGroups(COLLIDE_GROUND),
        groundBody
      )

      // Distributed body support: two zero-mass contact balls under each trunk segment, spread
      // left/right of the spine and hung down so they rest on the floor when the segment sits at
      // its authored height. This holds the whole body flat along its authored node-height profile
      // and resists roll (two laterally-spread contacts per segment), instead of the body balancing
      // up high on the feet. Density 0 so they add no mass/inertia; friction = body (slides).
      const supportR = 0.1
      for (let i = 0; i < usable.length; i++) {
        const f = dirs[i]
        // transverse-horizontal = up × forward = (f.z, 0, −f.x); spreads the contacts sideways
        const tlen = Math.hypot(f.z, f.x) || 1
        const ux = (f.z / tlen) * radius
        const uz = (-f.x / tlen) * radius
        const oy = groundTop + supportR - centers[i].y // local y → ball bottom rests on the floor
        for (const sgn of [1, -1]) {
          const scd = RAPIER.ColliderDesc.ball(supportR)
            .setTranslation(sgn * ux, oy, sgn * uz)
            .setDensity(0)
            .setFriction(BODY_FRICTION_DEFAULT)
            .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
            .setCollisionGroups(COLLIDE_GROUND_CONTACT)
          groundContacts.push(world.createCollider(scd, bodies[i]))
        }
      }
    }
  }

  return { bodies, colliders, groundContacts, joints, segLength, groupIds, jointToCpgSegment, restCenters, hipJoints }
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
