import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { ModelConfigRow, BodyGroup, SegmentData } from '../studio/page.types'
import { CREATURE_DEFAULTS } from '../page.constants'

function groupNodePosition(group: BodyGroup, segmentMap: Map<string, SegmentData>): THREE.Vector3 {
  if (group.nodePosition) {
    return new THREE.Vector3(group.nodePosition.x, 0, group.nodePosition.z)
  }
  let sumX = 0, sumZ = 0, count = 0
  for (const sid of group.segmentIds) {
    const seg = segmentMap.get(sid)
    if (!seg) continue
    for (let i = 0; i < seg.positions.length; i += 3) {
      sumX += seg.positions[i]
      sumZ += seg.positions[i + 2]
      count++
    }
  }
  return count > 0 ? new THREE.Vector3(sumX / count, 0, sumZ / count) : new THREE.Vector3()
}

function spineChainGroups(config: ModelConfigRow): BodyGroup[] {
  const head = config.groups.find((g) => g.type === 'head')
  const tail = config.groups.find((g) => g.type === 'tail')
  const spines = config.groups.filter((g) => g.type === 'spine')
  return [...(head ? [head] : []), ...spines, ...(tail ? [tail] : [])]
}

export function modelConfigToCreatureConfig(
  config: ModelConfigRow,
  segments: SegmentData[]
): CreatureConfig {
  const defaults = CREATURE_DEFAULTS.lizard
  const segmentMap = new Map(segments.map((s) => [s.id, s]))
  const chain = spineChainGroups(config)

  const positions = chain.map((g) => groupNodePosition(g, segmentMap))

  let segmentLength = defaults.segmentLength
  if (positions.length >= 2) {
    let total = 0
    for (let i = 1; i < positions.length; i++) {
      total += positions[i].distanceTo(positions[i - 1])
    }
    segmentLength = total / (positions.length - 1)
  }

  const limbNodes = config.groups
    .filter((g) => (g.type === 'leg-left' || g.type === 'leg-right') && g.attachedToSpineId)
    .flatMap((g) => {
      const idx = chain.findIndex((c) => c.id === g.attachedToSpineId)
      if (idx < 0) return []
      return [{ index: idx, side: (g.type === 'leg-left' ? -1 : 1) as 1 | -1 }]
    })

  return {
    ...defaults,
    segmentCount: chain.length,
    segmentLength,
    limbNodes,
    limbSegmentLength: segmentLength * 1.2,
    limbReach: segmentLength * 3,
    bodyHalfWidth: segmentLength * 0.7,
  }
}
