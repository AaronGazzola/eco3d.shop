import { BodyGroup, BodyGroupType, SegmentData } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'

export const BODY_DENSITY = 1

export const DEFAULT_AXIAL_WEIGHT = 1.5
export const DEFAULT_LEG_WEIGHT = 0.4
export const STD_SEGMENT_WIDTH = 0.5

export function defaultWeightFor(type: BodyGroupType): number {
  return type === 'leg-left' || type === 'leg-right'
    ? DEFAULT_LEG_WEIGHT
    : DEFAULT_AXIAL_WEIGHT
}

export interface PlanarSegment {
  groupId: string
  length: number
  mass: number
  inertiaAboutComY: number
  restNodeX: number
  restNodeZ: number
  restComX: number
  restComZ: number
}

export interface PlanarJoint {
  segmentIndex: number
  coordIndex: number
  yawForwardLimit: number
  yawBackwardLimit: number
}

export interface BodySpec {
  segments: PlanarSegment[]
  joints: PlanarJoint[]
  density: number
  restRootX: number
  restRootZ: number
}

interface MeshStats {
  centroidX: number
  centroidZ: number
  extentX: number
  extentY: number
  extentZ: number
  vertexCount: number
}

function meshStatsForGroup(group: BodyGroup, segmentMap: Map<string, SegmentData>): MeshStats {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  let sumX = 0
  let sumZ = 0
  let count = 0
  for (const segId of group.segmentIds) {
    const seg = segmentMap.get(segId)
    if (!seg) continue
    const p = seg.positions
    for (let i = 0; i + 2 < p.length; i += 3) {
      const x = p[i]
      const y = p[i + 1]
      const z = p[i + 2]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (z < minZ) minZ = z
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
      sumX += x
      sumZ += z
      count++
    }
  }
  if (count === 0) {
    return { centroidX: 0, centroidZ: 0, extentX: 0, extentY: 0, extentZ: 0, vertexCount: 0 }
  }
  return {
    centroidX: sumX / count,
    centroidZ: sumZ / count,
    extentX: maxX - minX,
    extentY: maxY - minY,
    extentZ: maxZ - minZ,
    vertexCount: count,
  }
}

function rotationCenterXZ(
  group: BodyGroup,
  parent: BodyGroup | null
): { x: number; z: number } | null {
  const node = parent?.nodeBack ?? group.nodeFront ?? group.nodeBack
  if (!node) return null
  return { x: node.x, z: node.z }
}

export function buildBodySpec(groups: BodyGroup[], segments: SegmentData[]): BodySpec | null {
  const chain = flattenSkeleton(buildSkeletonTree(groups))
  if (chain.length === 0) return null

  const segmentMap = new Map(segments.map((s) => [s.id, s]))

  const centers: { x: number; z: number }[] = []
  const stats: MeshStats[] = []
  const usableGroups: BodyGroup[] = []
  for (let i = 0; i < chain.length; i++) {
    const group = chain[i]
    const parent = i > 0 ? chain[i - 1] : null
    const center = rotationCenterXZ(group, parent)
    if (!center) continue
    centers.push(center)
    stats.push(meshStatsForGroup(group, segmentMap))
    usableGroups.push(group)
  }
  if (usableGroups.length === 0) return null

  const planarSegments: PlanarSegment[] = []
  const joints: PlanarJoint[] = []

  for (let i = 0; i < usableGroups.length; i++) {
    const group = usableGroups[i]
    const center = centers[i]
    const stat = stats[i]

    const next = centers[i + 1]
    const length = next
      ? Math.hypot(next.x - center.x, next.z - center.z)
      : Math.hypot(stat.centroidX - center.x, stat.centroidZ - center.z) * 2

    const mass = group.nodeWeight ?? defaultWeightFor(group.type)
    const inertiaAboutComY =
      (mass * (length * length + STD_SEGMENT_WIDTH * STD_SEGMENT_WIDTH)) / 12

    const restComX = stat.vertexCount > 0 ? stat.centroidX : center.x
    const restComZ = stat.vertexCount > 0 ? stat.centroidZ : center.z

    planarSegments.push({
      groupId: group.id,
      length,
      mass,
      inertiaAboutComY,
      restNodeX: center.x,
      restNodeZ: center.z,
      restComX,
      restComZ,
    })

    if (i > 0) {
      const caps = effectiveAngleCaps(group)
      joints.push({
        segmentIndex: i,
        coordIndex: 3 + (i - 1),
        yawForwardLimit: caps.yaw,
        yawBackwardLimit: caps.yawBack ?? caps.yaw,
      })
    }
  }

  return {
    segments: planarSegments,
    joints,
    density: BODY_DENSITY,
    restRootX: centers[0].x,
    restRootZ: centers[0].z,
  }
}
