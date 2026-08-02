import { BodyGroup, AngleCaps } from '@/app/admin/_lib/types'

export interface SkeletonNode {
  group: BodyGroup
  children: SkeletonNode[]
}

function buildLinearBranch(linear: BodyGroup[]): SkeletonNode | null {
  if (linear.length === 0) return null
  let current: SkeletonNode | null = null
  for (let i = linear.length - 1; i >= 0; i--) {
    current = { group: linear[i], children: current ? [current] : [] }
  }
  return current
}

export function buildSkeletonTree(groups: BodyGroup[]): SkeletonNode | null {
  const head = groups.find((g) => g.type === 'head')
  if (!head) return null
  const tail = groups.find((g) => g.type === 'tail') ?? null
  const spines = groups.filter((g) => g.type === 'spine')

  const linear = [head, ...spines, ...(tail ? [tail] : [])]
  return buildLinearBranch(linear)
}

export function flattenSkeleton(tree: SkeletonNode | null): BodyGroup[] {
  if (!tree) return []
  return [tree.group, ...tree.children.flatMap(flattenSkeleton)]
}

export const DEFAULT_HEAD_YAW = Math.PI / 3
export const DEFAULT_SPINE_YAW = Math.PI / 6
export const DEFAULT_PITCH_UP = Math.PI / 6
export const DEFAULT_PITCH_DOWN = Math.PI / 6
export const DEFAULT_TAIL_YAW = Math.PI / 4

export function defaultAngleCapsFor(group: BodyGroup): AngleCaps {
  if (group.type === 'head') {
    return { yaw: DEFAULT_HEAD_YAW, pitchUp: DEFAULT_PITCH_UP, pitchDown: DEFAULT_PITCH_DOWN }
  }
  if (group.type === 'tail') {
    return { yaw: DEFAULT_TAIL_YAW, pitchUp: DEFAULT_PITCH_UP, pitchDown: DEFAULT_PITCH_DOWN }
  }
  return { yaw: DEFAULT_SPINE_YAW, pitchUp: DEFAULT_PITCH_UP, pitchDown: DEFAULT_PITCH_DOWN }
}

export function effectiveAngleCaps(group: BodyGroup): AngleCaps {
  return group.angleCaps ?? defaultAngleCapsFor(group)
}
