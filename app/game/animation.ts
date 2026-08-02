import type { BodyGroup } from '@/app/admin/_lib/types'
import type { Animations, Cycle, JointOffset, Pose, RootOffset } from './animation.types'
import { WALK_CYCLE } from './animation.types'

const REST_ROOT: RootOffset = { x: 0, z: 0, yawRad: 0 }

export function restPose(): Pose {
  return { root: { ...REST_ROOT }, joints: {} }
}

export function wrapPhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0
  const wrapped = phase % 1
  return wrapped < 0 ? wrapped + 1 : wrapped
}

export function advancePhase(phase: number, speed: number, deltaSeconds: number): number {
  return wrapPhase(phase + speed * deltaSeconds)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpJoint(a: JointOffset | undefined, b: JointOffset | undefined, t: number): JointOffset {
  const from = a ?? { yawRad: 0, pitchRad: 0 }
  const to = b ?? { yawRad: 0, pitchRad: 0 }
  return {
    yawRad: lerp(from.yawRad, to.yawRad, t),
    pitchRad: lerp(from.pitchRad, to.pitchRad, t),
  }
}

function scaleJoint(joint: JointOffset, amplitude: number): JointOffset {
  return { yawRad: joint.yawRad * amplitude, pitchRad: joint.pitchRad * amplitude }
}

export function evaluateCycle(cycle: Cycle, phase: number): Pose {
  const frames = cycle.keyframes
  if (frames.length === 0) return restPose()

  const amplitude = Number.isFinite(cycle.amplitude) ? cycle.amplitude : 1

  if (frames.length === 1) {
    const only = frames[0]
    const joints: Record<string, JointOffset> = {}
    for (const id of Object.keys(only.joints)) {
      joints[id] = scaleJoint(only.joints[id], amplitude)
    }
    return {
      root: {
        x: only.root.x * amplitude,
        z: only.root.z * amplitude,
        yawRad: only.root.yawRad * amplitude,
      },
      joints,
    }
  }

  const position = wrapPhase(phase) * frames.length
  const index = Math.floor(position) % frames.length
  const nextIndex = (index + 1) % frames.length
  const t = position - Math.floor(position)

  const from = frames[index]
  const to = frames[nextIndex]

  const ids = new Set([...Object.keys(from.joints), ...Object.keys(to.joints)])
  const joints: Record<string, JointOffset> = {}
  for (const id of ids) {
    joints[id] = scaleJoint(lerpJoint(from.joints[id], to.joints[id], t), amplitude)
  }

  return {
    root: {
      x: lerp(from.root.x, to.root.x, t) * amplitude,
      z: lerp(from.root.z, to.root.z, t) * amplitude,
      yawRad: lerp(from.root.yawRad, to.root.yawRad, t) * amplitude,
    },
    joints,
  }
}

const DEG = Math.PI / 180

function emptyPose(): Pose {
  return { root: { x: 0, z: 0, yawRad: 0 }, joints: {} }
}

export function buildDefaultWalkCycle(groups: BodyGroup[]): Cycle {
  const spines = groups.filter((g) => g.type === 'spine')
  const legs = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right')
  const head = groups.find((g) => g.type === 'head')
  const tail = groups.find((g) => g.type === 'tail')

  const spineOrder = new Map(spines.map((g, i) => [g.id, i]))

  const legPhase = (leg: BodyGroup): number => {
    const spineIndex = spineOrder.get(leg.attachedToSpineId ?? '') ?? 0
    const front = spineIndex < spines.length / 2
    const left = leg.type === 'leg-left'
    if (front && left) return 0
    if (!front && !left) return 0
    return 0.5
  }

  const STRIDE = 22 * DEG
  const LIFT = 10 * DEG
  const SWAY = 5 * DEG
  const HEAD_SWAY = 6 * DEG
  const TAIL_SWAY = 9 * DEG

  const frameCount = 4
  const keyframes: Pose[] = []

  for (let f = 0; f < frameCount; f++) {
    const t = f / frameCount
    const pose = emptyPose()

    for (const leg of legs) {
      const local = wrapPhase(t + legPhase(leg))
      const swing = Math.cos(local * Math.PI * 2)
      const lift = Math.max(0, Math.sin(local * Math.PI * 2))
      pose.joints[leg.id] = {
        yawRad: swing * STRIDE,
        pitchRad: lift * LIFT,
      }
    }

    for (const spine of spines) {
      const index = spineOrder.get(spine.id) ?? 0
      const travel = wrapPhase(t - index * 0.06)
      pose.joints[spine.id] = {
        yawRad: Math.sin(travel * Math.PI * 2) * SWAY,
        pitchRad: 0,
      }
    }

    if (head) {
      pose.joints[head.id] = {
        yawRad: Math.sin(t * Math.PI * 2) * HEAD_SWAY * -1,
        pitchRad: 0,
      }
    }

    if (tail) {
      const travel = wrapPhase(t - spines.length * 0.06)
      pose.joints[tail.id] = {
        yawRad: Math.sin(travel * Math.PI * 2) * TAIL_SWAY,
        pitchRad: 0,
      }
    }

    keyframes.push(pose)
  }

  return { keyframes, speed: 1, amplitude: 1 }
}

export function resolveCycle(
  animations: Animations,
  name: string,
  groups: BodyGroup[],
): Cycle {
  const saved = animations[name]
  if (saved && saved.keyframes.length > 0) return saved
  if (name === WALK_CYCLE) return buildDefaultWalkCycle(groups)
  return { keyframes: [], speed: 1, amplitude: 1 }
}
