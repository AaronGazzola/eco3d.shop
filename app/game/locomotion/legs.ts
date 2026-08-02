import { BodyGroup } from '@/app/admin/_lib/types'

export function findFrontHip(groups: BodyGroup[]): BodyGroup | null {
  const spines = groups.filter((g) => g.type === 'spine')
  return spines.find((g) => !!(g.nodeHipLeft || g.nodeHipRight)) ?? null
}

export function findRearHip(groups: BodyGroup[]): BodyGroup | null {
  const spines = groups.filter((g) => g.type === 'spine')
  const hips = spines.filter((g) => !!(g.nodeHipLeft || g.nodeHipRight))
  return hips[1] ?? null
}

export function findLegsForHip(
  groups: BodyGroup[],
  hipId: string
): { left: BodyGroup | null; right: BodyGroup | null } {
  let left: BodyGroup | null = null
  let right: BodyGroup | null = null
  for (const g of groups) {
    if (g.attachedToSpineId !== hipId) continue
    if (g.type === 'leg-left') left = g
    else if (g.type === 'leg-right') right = g
  }
  return { left, right }
}
