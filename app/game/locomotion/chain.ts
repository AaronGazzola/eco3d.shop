import { BodyGroup } from '@/app/studio/page.types'

function isHipGroup(g: BodyGroup): boolean {
  return !!(g.nodeHipLeft || g.nodeHipRight)
}

export function buildCascadeChain(groups: BodyGroup[]): BodyGroup[] {
  const head = groups.find((g) => g.type === 'head')
  if (!head) return []

  const spines = groups.filter((g) => g.type === 'spine')
  const frontHipIdx = spines.findIndex(isHipGroup)
  if (frontHipIdx === -1) return [head, ...spines]

  return [head, ...spines.slice(0, frontHipIdx + 1)]
}
