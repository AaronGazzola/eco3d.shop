import { Vector3 } from 'three'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'
import { STD_SEGMENT_WIDTH, defaultWeightFor } from './weights'

// Builds a MuJoCo MJCF model of the creature in REDUCED coordinates that mirrors the Rapier rig in
// app/game/locomotion/body3d.ts joint-for-joint: a floating-base trunk chain of one-DOF hinges and a
// two-hinge (lift+sweep) hip per leg with NO carrier body. Geometry, mass, bend axes and angle caps
// are derived from the SAME skeleton helpers body3d.ts uses, so the model matches the rendered creature.
// Every hinge is a position servo (force-limited). Each foot has a switchable `connect` equality to a
// mocap anchor the runner repositions — the grip. The sidecar `MjcfMeta` tells the runner which joint
// drives which CPG segment/limb and which sign/cap to use, so useLocomotion's mapping can be replicated.

export interface MjcfServoOpts {
  timestep?: number
  // Position-servo gains, shared across joints (the runner may override per-run while tuning).
  kp?: number
  jointDamping?: number
  // Stall torque: the servo force limit (|forcerange|). One value for spine, one for hips.
  spineStall?: number
  hipStall?: number
  // Belly-support contact spheres under each trunk segment. They were a Rapier crutch to hold the
  // floppy-legged body flat; in the reduced-coordinate model the legs support the body, and 22
  // redundant coplanar belly contacts destabilise MuJoCo's contact solver. Off by default.
  bellySupport?: boolean
}

export interface SpineJointMeta {
  name: string
  actuator: string
  childIndex: number // = cpgSegment in body3d (the axial segment this joint samples)
  axis: [number, number, number]
  capForward: number
  capBackward: number
}

export interface LegMeta {
  limbIdx: number // 0=LF,1=RF,2=LH,3=RH
  side: 'leg-left' | 'leg-right'
  parentSegIndex: number
  legBody: string
  liftJoint: string
  liftActuator: string
  liftAxis: [number, number, number]
  liftSign: number
  sweepJoint: string
  sweepActuator: string
  sweepAxis: [number, number, number]
  sweepSign: number
  capStance: number
  capSwing: number
  footSite: string
  footWorld: [number, number, number]
  anchorMocap: string
  gripEquality: string
  groupId: string
  restCenter: [number, number, number]
  legAxisLocal: [number, number, number]
}

export interface MjcfMeta {
  timestep: number
  configName: string
  segmentCount: number
  spineJoints: SpineJointMeta[]
  legs: LegMeta[]
  groundTop: number
  // MuJoCo body → rig group + its rest centre (model space), for rendering: the group matrix is
  // Translate(bodyWorldPos)·Rotate(bodyWorldQuat)·Translate(−restCenter). Trunk `seg{i}` + leg `leg{limbIdx}`.
  segmentBodies: { body: string; groupId: string; restCenter: [number, number, number] }[]
}

export interface MjcfResult {
  xml: string
  meta: MjcfMeta
}

const f = (n: number): string => (Object.is(n, -0) ? 0 : n).toFixed(6)
const v3 = (v: { x: number; y: number; z: number }): string => `${f(v.x)} ${f(v.y)} ${f(v.z)}`

function nodeVec(n: { x: number; y?: number; z: number } | undefined): Vector3 | null {
  if (!n) return null
  return new Vector3(n.x, n.y ?? 0, n.z)
}

export function buildMjcf(groups: BodyGroup[], opts: MjcfServoOpts = {}): MjcfResult {
  const timestep = opts.timestep ?? 1 / 120
  const kp = opts.kp ?? 40
  const jointDamping = opts.jointDamping ?? 1
  const hipStall = opts.hipStall ?? 60
  const bellySupport = opts.bellySupport ?? true

  const chain = flattenSkeleton(buildSkeletonTree(groups))
  if (chain.length === 0) throw new Error('empty skeleton')

  // --- trunk segments (mirror body3d.ts node/end/dir/center derivation exactly) ---
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
  if (usable.length === 0) throw new Error('no usable segments')

  const radius = STD_SEGMENT_WIDTH / 2
  const dirs: Vector3[] = []
  const centers: Vector3[] = []
  const segLen: number[] = []
  const groupIds: string[] = []
  for (let i = 0; i < usable.length; i++) {
    let dir = new Vector3().subVectors(ends[i], nodes[i])
    let length = dir.length()
    if (length < 1e-4) {
      dir = i > 0 ? dirs[i - 1].clone() : new Vector3(1, 0, 0)
      length = i > 0 ? segLen[i - 1] : 1
    }
    dir.normalize()
    centers.push(new Vector3().addVectors(nodes[i], dir.clone().multiplyScalar(length / 2)))
    dirs.push(dir)
    segLen.push(length)
    groupIds.push(usable[i].id)
  }

  // --- spine joints (child i, i>=1): axis + caps mirror body3d ---
  const spineJoints: SpineJointMeta[] = []
  const spineJointBySeg = new Map<number, SpineJointMeta>()
  for (let i = 1; i < usable.length; i++) {
    const fdir = dirs[i]
    const axisV = new Vector3(0, 1, 0).addScaledVector(fdir, -fdir.y)
    if (axisV.lengthSq() < 1e-8) axisV.set(0, 1, 0)
    axisV.normalize()
    const caps = effectiveAngleCaps(usable[i])
    const fwd = caps.yaw
    const back = caps.yawBack ?? caps.yaw
    const meta: SpineJointMeta = {
      name: `spine_j${i}`,
      actuator: `act_spine_j${i}`,
      childIndex: i,
      axis: [axisV.x, axisV.y, axisV.z],
      capForward: fwd,
      capBackward: back,
    }
    spineJoints.push(meta)
    spineJointBySeg.set(i, meta)
  }

  // --- legs (mirror body3d.ts hip resolution: parent girdle, hip socket, foot, dir, center) ---
  interface LegSpec {
    leg: BodyGroup
    parentIndex: number
    hip: Vector3
    foot: Vector3
    center: Vector3
    len: number
  }
  const specs: LegSpec[] = []
  for (const leg of groups) {
    if (leg.type !== 'leg-left' && leg.type !== 'leg-right') continue
    const parent = groups.find((g) => g.id === leg.attachedToSpineId)
    if (!parent) continue
    const parentIndex = groupIds.indexOf(parent.id)
    if (parentIndex < 0) continue
    const socket = leg.type === 'leg-left' ? parent.nodeHipLeft : parent.nodeHipRight
    const hip = nodeVec(socket)
    const foot = nodeVec(leg.nodeFoot)
    if (!hip || !foot) continue
    const dir = new Vector3().subVectors(foot, hip)
    const len = dir.length()
    if (len < 1e-3) continue
    dir.normalize()
    const center = new Vector3().addVectors(hip, dir.clone().multiplyScalar(len / 2))
    specs.push({ leg, parentIndex, hip, foot, center, len })
  }
  const foreIdx = specs.length ? Math.min(...specs.map((s) => s.parentIndex)) : -1
  let lowestFootY = Infinity
  for (const s of specs) lowestFootY = Math.min(lowestFootY, s.foot.y)
  if (!Number.isFinite(lowestFootY)) lowestFootY = 0
  const legRadius = STD_SEGMENT_WIDTH / 2
  // Small foot-contact spheres with the floor right beneath the lowest foot. A big ball (the app's
  // trick to hold the foot at authored height) on a light leg has a terrible contact mass ratio and
  // ejects violently under undulation; a small sphere just below the foot node is gentle and stable.
  const FOOT_CONTACT_R = 0.06
  const groundTop = lowestFootY - FOOT_CONTACT_R

  const legsByParent = new Map<number, LegMeta[]>()
  const legNodes = new Map<number, string[]>() // parentSegIndex -> nested-body XML for its legs

  for (const s of specs) {
    const isHind = s.parentIndex !== foreIdx
    const isLeft = s.leg.type === 'leg-left'
    const limbIdx = (isHind ? 2 : 0) + (isLeft ? 0 : 1)
    const caps = effectiveAngleCaps(s.leg)
    const capStance = caps.yaw
    const capSwing = caps.yawBack ?? caps.yaw
    // Sweep axis is MIRRORED per side (isLeft ? -1 : 1): the two contralateral legs are mirror images,
    // so the same joint rotation must map to the same BODY-relative direction (both retract = sweep the
    // foot toward the tail during their stance/grip window). Without the flip, one leg visually protracts
    // while the other retracts during grip. The Calibrate tab uses this SAME per-side flip for its
    // forward/back preview (see useLocomotion calibrate pose), so +capStance ("forward") reaches the
    // forward cap toward the head on both sides.
    const sweepDir = isLeft ? -1 : 1
    // lift axis: horizontal, perpendicular to the leg's own horizontal direction (mirror body3d)
    const dir = new Vector3().subVectors(s.foot, s.hip).normalize()
    const hLenReal = Math.hypot(dir.x, dir.z) || 1
    const liftAxis: [number, number, number] = [-dir.z / hLenReal, 0, dir.x / hLenReal]
    const sweepAxis: [number, number, number] = [0, sweepDir, 0]

    const pc = centers[s.parentIndex]
    const aHipLeg = new Vector3().subVectors(s.hip, s.center) // hip in leg-body-local frame
    const footLegLocal = new Vector3().subVectors(s.foot, s.center)
    const legBodyPos = new Vector3().subVectors(s.center, pc) // relative to girdle body

    const tag = `${limbIdx}` // 0..3 unique per leg
    const legBody = `leg${tag}`
    const liftJoint = `${legBody}_lift`
    const sweepJoint = `${legBody}_sweep`
    const footSite = `${legBody}_foot`
    const anchorMocap = `${legBody}_anchor`
    const gripEquality = `${legBody}_grip`

    const legMass = s.leg.nodeWeight ?? defaultWeightFor(s.leg.type)

    const xml = `      <body name="${legBody}" pos="${v3(legBodyPos)}">
        <joint name="${liftJoint}" type="hinge" pos="${v3(aHipLeg)}" axis="${liftAxis.map(f).join(' ')}" damping="${f(jointDamping)}"/>
        <joint name="${sweepJoint}" type="hinge" pos="${v3(aHipLeg)}" axis="${sweepAxis.map(f).join(' ')}" range="${f(-capSwing)} ${f(capStance)}" limited="true" damping="${f(jointDamping)}"/>
        <geom type="capsule" fromto="${v3(aHipLeg)} ${v3(footLegLocal)}" size="${f(legRadius)}" mass="${f(legMass)}" contype="0" conaffinity="0" rgba="0.8 0.6 0.2 1"/>
        <site name="${footSite}" pos="${v3(footLegLocal)}" size="0.03"/>
        <geom name="${footSite}_ball" type="sphere" condim="1" pos="${v3(footLegLocal)}" size="${f(Math.max(0.05, s.foot.y - groundTop))}" density="0" contype="2" conaffinity="1" rgba="0.2 0.8 0.4 0.5"/>
      </body>`

    if (!legNodes.has(s.parentIndex)) legNodes.set(s.parentIndex, [])
    legNodes.get(s.parentIndex)!.push(xml)

    if (!legsByParent.has(s.parentIndex)) legsByParent.set(s.parentIndex, [])
    legsByParent.get(s.parentIndex)!.push({
      limbIdx,
      side: s.leg.type as 'leg-left' | 'leg-right',
      parentSegIndex: s.parentIndex,
      legBody,
      liftJoint,
      liftActuator: `act_${liftJoint}`,
      liftAxis,
      liftSign: 1,
      sweepJoint,
      sweepActuator: `act_${sweepJoint}`,
      sweepAxis,
      sweepSign: sweepDir,
      capStance,
      capSwing,
      footSite,
      footWorld: [s.foot.x, s.foot.y, s.foot.z],
      anchorMocap,
      gripEquality,
      groupId: s.leg.id,
      restCenter: [s.center.x, s.center.y, s.center.z],
      // Unit vector hip→foot in the leg-body-local frame. The runtime rotates it by the leg body's
      // world quaternion to get the live leg axis, along which the slide-mode grip lets the foot travel.
      legAxisLocal: (() => {
        const a = new Vector3().subVectors(footLegLocal, aHipLeg)
        const n = a.length() || 1
        return [a.x / n, a.y / n, a.z / n]
      })(),
    })
  }

  // --- assemble the nested trunk chain, injecting leg bodies at their girdle segments ---
  function segmentBody(i: number): string {
    const nodeLocal = new Vector3().subVectors(nodes[i], centers[i])
    const endLocal = new Vector3().subVectors(ends[i], centers[i])
    const pos = i === 0 ? centers[0] : new Vector3().subVectors(centers[i], centers[i - 1])
    const mass = usable[i].nodeWeight ?? defaultWeightFor(usable[i].type)

    // belly support spheres: two zero-mass contact balls per trunk segment (mirror body3d). Off by
    // default — see bellySupport note; the legs hold the body in the reduced-coordinate model.
    const supportR = 0.1
    const tlen = Math.hypot(dirs[i].z, dirs[i].x) || 1
    const ux = (dirs[i].z / tlen) * radius
    const uz = (-dirs[i].x / tlen) * radius
    const oy = groundTop + supportR - centers[i].y
    const belly = bellySupport
      ? [1, -1]
          .map(
            (sgn) =>
              `        <geom type="sphere" condim="1" pos="${f(sgn * ux)} ${f(oy)} ${f(sgn * uz)}" size="${f(supportR)}" density="0" contype="2" conaffinity="1" rgba="0.3 0.5 0.9 0.4"/>`
          )
          .join('\n')
      : ''

    const jointXml =
      i === 0
        ? '        <freejoint/>'
        : (() => {
            const jm = spineJointBySeg.get(i)!
            return `        <joint name="${jm.name}" type="hinge" pos="${v3(nodeLocal)}" axis="${jm.axis.map(f).join(' ')}" range="${f(-jm.capBackward)} ${f(jm.capForward)}" limited="true" damping="${f(jointDamping)}"/>`
          })()

    const legXml = (legNodes.get(i) ?? []).join('\n')
    const childXml = i + 1 < usable.length ? segmentBody(i + 1) : ''
    const inner = [
      jointXml,
      `        <geom type="capsule" fromto="${v3(nodeLocal)} ${v3(endLocal)}" size="${f(radius)}" mass="${f(mass)}" contype="0" conaffinity="0" rgba="0.6 0.6 0.7 1"/>`,
      belly,
      legXml,
      childXml,
    ]
      .filter(Boolean)
      .join('\n')

    return `      <body name="seg${i}" pos="${v3(pos)}">
${inner}
      </body>`
  }

  const allLegs: LegMeta[] = []
  for (const arr of legsByParent.values()) allLegs.push(...arr)
  allLegs.sort((a, b) => a.limbIdx - b.limbIdx)

  // mocap anchor bodies, each placed at its foot's REST world point so the connect constraint's
  // compile-time body2 offset is zero — then a runtime `mocap_pos = current foot world` pins the
  // foot exactly where it is when the grip fires (no compile-time drift).
  const mocapXml = allLegs
    .map(
      (l) =>
        `    <body name="${l.anchorMocap}" mocap="true" pos="${l.footWorld.map(f).join(' ')}">
      <site name="${l.anchorMocap}_site" size="0.03" rgba="1 0.2 0.2 1"/>
    </body>`
    )
    .join('\n')

  const equalityXml = allLegs
    .map(
      (l) =>
        `    <connect name="${l.gripEquality}" body1="${l.legBody}" body2="${l.anchorMocap}" anchor="${
          // anchor in leg-body-local frame = foot local; recompute from spec
          (() => {
            const s = specs.find(
              (sp) => ((sp.parentIndex !== foreIdx ? 2 : 0) + (sp.leg.type === 'leg-left' ? 0 : 1)) === l.limbIdx
            )!
            const footLocal = new Vector3().subVectors(s.foot, s.center)
            return v3(footLocal)
          })()
        }" active="false"/>`
    )
    .join('\n')

  const actuatorXml = [
    // Spine = fixed-gain implicit position servo tracking the Ekeberg equilibrium angle
    // φEq = α(mL−mR)/(β(mL+mR+γ)), which the runner writes to ctrl each step. φEq carries the full
    // CPG wave; a fixed-gain servo is stable (a runtime-varying gain destabilises the implicit
    // integrator's stale linearisation), unlike Rapier's per-step ForceBased stiffness.
    ...spineJoints.map((j) => `    <position name="${j.actuator}" joint="${j.name}" kp="${f(kp)}" kv="${f(kp / 12)}"/>`),
    ...allLegs.flatMap((l) => [
      `    <position name="${l.liftActuator}" joint="${l.liftJoint}" kp="${f(kp)}" forcerange="${f(-hipStall)} ${f(
        hipStall
      )}"/>`,
      `    <position name="${l.sweepActuator}" joint="${l.sweepJoint}" kp="${f(kp)}" forcerange="${f(-hipStall)} ${f(
        hipStall
      )}" ctrlrange="${f(-l.capSwing)} ${f(l.capStance)}"/>`,
    ]),
  ].join('\n')

  const xml = `<mujoco model="eco3d-salamander">
  <compiler angle="radian" autolimits="true"/>
  <option timestep="${f(timestep)}" gravity="0 -9.81 0" integrator="implicitfast" solver="Newton" iterations="100" tolerance="1e-10"/>
  <default>
    <geom friction="0 0.005 0.0001"/>
  </default>
  <worldbody>
    <geom name="floor" type="plane" condim="1" pos="0 ${f(groundTop)} 0" zaxis="0 1 0" size="100 100 0.1" contype="1" conaffinity="2" rgba="0.4 0.4 0.45 1"/>
    <light pos="0 5 0" dir="0 -1 0"/>
${mocapXml}
${segmentBody(0)}
  </worldbody>
  <equality>
${equalityXml}
  </equality>
  <actuator>
${actuatorXml}
  </actuator>
</mujoco>
`

  const segmentBodies = [
    ...usable.map((g, i) => ({
      body: `seg${i}`,
      groupId: g.id,
      restCenter: [centers[i].x, centers[i].y, centers[i].z] as [number, number, number],
    })),
    ...allLegs.map((l) => ({ body: l.legBody, groupId: l.groupId, restCenter: l.restCenter })),
  ]
  const meta: MjcfMeta = {
    timestep,
    configName: '',
    segmentCount: usable.length,
    spineJoints,
    legs: allLegs,
    groundTop,
    segmentBodies,
  }
  return { xml, meta }
}
