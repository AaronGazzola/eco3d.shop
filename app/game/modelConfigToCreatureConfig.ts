import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { ModelConfigRow, BodyGroup, SegmentData } from '../studio/page.types'
import { CREATURE_DEFAULTS } from '../page.constants'

function groupCentroid(group: BodyGroup, segmentMap: Map<string, SegmentData>): THREE.Vector3 {
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

function nodeVec(pos: { x: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(pos.x, 0, pos.z)
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

  const centroids = chain.map((g) => groupCentroid(g, segmentMap))

  // front of chain[0] = chain[0].nodeFront; front of chain[i>0] = chain[i-1].nodeBack
  const frontPositions = chain.map((g, i) =>
    i === 0
      ? (g.nodeFront ? nodeVec(g.nodeFront) : centroids[0].clone())
      : (chain[i - 1].nodeBack ? nodeVec(chain[i - 1].nodeBack!) : centroids[i].clone())
  )
  const backPositions = chain.map((g, i) =>
    g.nodeBack ? nodeVec(g.nodeBack) : centroids[i].clone()
  )

  const segmentLengths = chain.map((g, i) => {
    const d = frontPositions[i].distanceTo(backPositions[i])
    if (d > 0.001) return d
    if (i < chain.length - 1) return centroids[i].distanceTo(centroids[i + 1])
    if (i > 0) return centroids[i - 1].distanceTo(centroids[i])
    return defaults.segmentLength
  })

  const avgSegmentLength =
    segmentLengths.length > 0
      ? segmentLengths.reduce((a, b) => a + b, 0) / segmentLengths.length
      : defaults.segmentLength

  const limbNodes = config.groups
    .filter((g) => (g.type === 'leg-left' || g.type === 'leg-right') && g.attachedToSpineId)
    .flatMap((g) => {
      const idx = chain.findIndex((c) => c.id === g.attachedToSpineId)
      if (idx < 0) return []

      const spineGroup = chain[idx]
      const spineCenter = centroids[idx]
      const isLeft = g.type === 'leg-left'

      let bodyHalfWidth = defaults.bodyHalfWidth
      const hipNode = isLeft ? spineGroup.nodeHipLeft : spineGroup.nodeHipRight
      if (hipNode) {
        bodyHalfWidth = Math.sqrt(
          (hipNode.x - spineCenter.x) ** 2 + (hipNode.z - spineCenter.z) ** 2
        )
      }

      let limbSegmentLength = defaults.limbSegmentLength
      let limbReach = defaults.limbReach
      if (hipNode && g.nodeFoot) {
        const hipV = nodeVec(hipNode)
        const footV = nodeVec(g.nodeFoot)
        limbSegmentLength = hipV.distanceTo(footV) / 2
        limbReach = spineCenter.distanceTo(footV)
      }

      const parentLocalOrigin = idx === 0
        ? (spineGroup.nodeFront ?? { x: spineCenter.x, z: spineCenter.z })
        : (chain[idx - 1].nodeBack ?? { x: centroids[idx - 1].x, z: centroids[idx - 1].z })

      const hipOffset = hipNode
        ? { x: hipNode.x - parentLocalOrigin.x, z: hipNode.z - parentLocalOrigin.z }
        : undefined

      const parentBack = spineGroup.nodeBack ?? { x: spineCenter.x, z: spineCenter.z }
      const parentRestAngle = Math.atan2(
        parentLocalOrigin.z - parentBack.z,
        parentLocalOrigin.x - parentBack.x
      )

      return [
        {
          index: idx,
          side: (isLeft ? -1 : 1) as 1 | -1,
          bodyHalfWidth,
          limbSegmentLength,
          limbReach,
          hipOffset,
          parentRestAngle,
        },
      ]
    })

  return {
    ...defaults,
    segmentCount: chain.length + 1,
    segmentLength: avgSegmentLength,
    segmentLengths,
    limbNodes,
    limbSegmentLength: defaults.limbSegmentLength,
    limbReach: defaults.limbReach,
    bodyHalfWidth: defaults.bodyHalfWidth,
  }
}
