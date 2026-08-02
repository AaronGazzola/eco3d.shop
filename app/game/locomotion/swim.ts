import type { BodyGroup } from '@/app/admin/_lib/types'
import type { Pose } from '@/app/game/animation.types'
import { axialChain } from './network'

export interface SegmentState {
  id: string
  midX: number
  midZ: number
  axisX: number
  axisZ: number
  length: number
}

export interface SwimTuning {
  thrustGain: number
  drag: number
}

interface Transform {
  cos: number
  sin: number
  tx: number
  tz: number
}

const IDENTITY: Transform = { cos: 1, sin: 0, tx: 0, tz: 0 }

function compose(outer: Transform, inner: Transform): Transform {
  return {
    cos: outer.cos * inner.cos - outer.sin * inner.sin,
    sin: outer.cos * inner.sin + outer.sin * inner.cos,
    tx: outer.cos * inner.tx - outer.sin * inner.tz + outer.tx,
    tz: outer.sin * inner.tx + outer.cos * inner.tz + outer.tz,
  }
}

function apply(t: Transform, x: number, z: number): { x: number; z: number } {
  return { x: t.cos * x - t.sin * z + t.tx, z: t.sin * x + t.cos * z + t.tz }
}

function rotateAbout(ax: number, az: number, yaw: number): Transform {
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  return { cos, sin, tx: ax - cos * ax + sin * az, tz: az - sin * ax - cos * az }
}

function anchorOf(group: BodyGroup): { x: number; z: number } | null {
  const node = group.nodeBack ?? group.nodeFront
  if (!node) return null
  return { x: node.x, z: node.z }
}

function endpointsOf(group: BodyGroup): { fx: number; fz: number; bx: number; bz: number } | null {
  const front = group.nodeFront ?? group.nodeBack
  const back = group.nodeBack ?? group.nodeFront
  if (!front || !back) return null
  return { fx: front.x, fz: front.z, bx: back.x, bz: back.z }
}

export function chainSegments(groups: BodyGroup[], pose: Pose): SegmentState[] {
  const chain = axialChain(groups)
  if (chain.length === 0) return []

  const out: SegmentState[] = []
  const headAnchor = anchorOf(chain[0])
  let running: Transform = IDENTITY

  for (let j = 0; j < chain.length; j++) {
    const group = chain[j]
    const yaw = pose.joints[group.id]?.yawRad ?? 0

    if (j === 0) {
      running = IDENTITY
    } else {
      const anchorSource = j === 1 ? headAnchor : anchorOf(chain[j - 1])
      if (anchorSource) {
        running = compose(running, rotateAbout(anchorSource.x, anchorSource.z, yaw))
      }
    }

    const local = j === 0 && headAnchor ? rotateAbout(headAnchor.x, headAnchor.z, yaw) : IDENTITY
    const transform = j === 0 ? local : running

    const ends = endpointsOf(group)
    if (!ends) continue

    const front = apply(transform, ends.fx, ends.fz)
    const back = apply(transform, ends.bx, ends.bz)
    const dx = front.x - back.x
    const dz = front.z - back.z
    const length = Math.hypot(dx, dz)
    if (length < 1e-6) continue

    out.push({
      id: group.id,
      midX: (front.x + back.x) / 2,
      midZ: (front.z + back.z) / 2,
      axisX: dx / length,
      axisZ: dz / length,
      length,
    })
  }

  return out
}

export function segmentVelocities(
  previous: SegmentState[],
  current: SegmentState[],
  dt: number,
): { vx: number; vz: number }[] {
  if (dt <= 0) return current.map(() => ({ vx: 0, vz: 0 }))
  const byId = new Map(previous.map((s) => [s.id, s]))
  return current.map((s) => {
    const before = byId.get(s.id)
    if (!before) return { vx: 0, vz: 0 }
    return { vx: (s.midX - before.midX) / dt, vz: (s.midZ - before.midZ) / dt }
  })
}

export function forwardAxis(groups: BodyGroup[]): { x: number; z: number } {
  const chain = axialChain(groups)
  if (chain.length < 2) return { x: 1, z: 0 }

  const headEnds = endpointsOf(chain[0])
  const tailEnds = endpointsOf(chain[chain.length - 1])
  if (!headEnds || !tailEnds) return { x: 1, z: 0 }

  const dx = headEnds.fx - tailEnds.bx
  const dz = headEnds.fz - tailEnds.bz
  const length = Math.hypot(dx, dz)
  if (length < 1e-6) return { x: 1, z: 0 }
  return { x: dx / length, z: dz / length }
}

export function swimSpeed(
  segments: SegmentState[],
  velocities: { vx: number; vz: number }[],
  forward: { x: number; z: number },
  tuning: SwimTuning,
): number {
  if (tuning.drag <= 0) {
    console.error('swimSpeed called with non-positive drag')
    throw new Error('drag must be positive')
  }

  let forwardThrust = 0
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    const v = velocities[i]
    if (!v) continue
    const normalX = -s.axisZ
    const normalZ = s.axisX
    const vNormal = v.vx * normalX + v.vz * normalZ
    const forceX = -tuning.thrustGain * vNormal * normalX * s.length
    const forceZ = -tuning.thrustGain * vNormal * normalZ * s.length
    forwardThrust += forceX * forward.x + forceZ * forward.z
  }

  return forwardThrust / tuning.drag
}

export function advanceRoot(
  pose: Pose,
  speed: number,
  dt: number,
  forward: { x: number; z: number },
): void {
  pose.root.x += forward.x * speed * dt
  pose.root.z += forward.z * speed * dt
}
