import { BodyGroup, AngleCaps } from '@/app/admin/_lib/types'

export function buildCascadeChain(groups: BodyGroup[]): BodyGroup[] {
  const head = groups.find((g) => g.type === 'head')
  if (!head) return []

  const spines = groups.filter((g) => g.type === 'spine')
  const tail = groups.find((g) => g.type === 'tail')
  return [head, ...spines, ...(tail ? [tail] : [])]
}

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

function groupCenter(g: BodyGroup): { x: number; z: number } {
  const b = g.nodeBack
  if (b) return { x: b.x, z: b.z }
  const f = g.nodeFront
  if (f) return { x: f.x, z: f.z }
  return { x: 0, z: 0 }
}

function hipCenter(g: BodyGroup): { x: number; z: number } {
  const l = g.nodeHipLeft
  const r = g.nodeHipRight
  if (l && r) return { x: (l.x + r.x) / 2, z: (l.z + r.z) / 2 }
  if (l) return { x: l.x, z: l.z }
  if (r) return { x: r.x, z: r.z }
  return groupCenter(g)
}

function nearestChainIndex(chain: BodyGroup[], x: number, z: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < chain.length; i++) {
    const c = groupCenter(chain[i])
    const dx = c.x - x
    const dz = c.z - z
    const dist = dx * dx + dz * dz
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

export function buildSkeletonTree(groups: BodyGroup[]): SkeletonNode | null {
  const head = groups.find((g) => g.type === 'head')
  if (!head) return null
  const tail = groups.find((g) => g.type === 'tail') ?? null
  const spines = groups.filter((g) => g.type === 'spine')
  const chain = [head, ...spines, ...(tail ? [tail] : [])]

  const hipIndices = chain
    .map((g, i) => (g.nodeHipLeft || g.nodeHipRight ? i : -1))
    .filter((i) => i >= 0)
  let rootIdx: number
  if (hipIndices.length >= 2) {
    const front = hipCenter(chain[hipIndices[0]])
    const rear = hipCenter(chain[hipIndices[hipIndices.length - 1]])
    rootIdx = nearestChainIndex(chain, (front.x + rear.x) / 2, (front.z + rear.z) / 2)
  } else if (hipIndices.length === 1) {
    rootIdx = hipIndices[0]
  } else {
    rootIdx = Math.floor(chain.length / 2)
  }

  const rostral = buildLinearBranch(chain.slice(0, rootIdx).reverse())
  const caudal = buildLinearBranch(chain.slice(rootIdx + 1))
  const children: SkeletonNode[] = []
  if (rostral) children.push(rostral)
  if (caudal) children.push(caudal)
  return { group: chain[rootIdx], children }
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
