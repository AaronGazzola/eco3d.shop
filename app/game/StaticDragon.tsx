'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData, BodyGroup } from '../admin/_lib/types'
import { RoleTags } from './dragons.types'
import { Phenotype } from './dragons.genetics'

function mergeGroupPositions(segments: SegmentData[]): Float32Array {
  let totalLen = 0
  for (const s of segments) totalLen += s.positions.length
  const merged = new Float32Array(totalLen)
  let offset = 0
  for (const s of segments) {
    merged.set(s.positions, offset)
    offset += s.positions.length
  }
  return merged
}

function useMergedGeometry(segments: SegmentData[]): THREE.BufferGeometry | null {
  return useMemo(() => {
    if (segments.length === 0) return null
    const merged = mergeGroupPositions(segments)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(merged, 3))
    geo.computeVertexNormals()
    return geo
  }, [segments])
}

function useGroupSegments(
  group: BodyGroup,
  segmentMap: Map<string, SegmentData>
): SegmentData[] {
  return useMemo(() => {
    const out: SegmentData[] = []
    for (const sid of group.segmentIds) {
      const s = segmentMap.get(sid)
      if (s) out.push(s)
    }
    return out
  }, [group.segmentIds, segmentMap])
}

function MergedGroupMesh({
  segments,
  color,
  opacity,
}: {
  segments: SegmentData[]
  color: string
  opacity: number
}) {
  const geometry = useMergedGeometry(segments)
  const isTransparent = opacity < 1
  if (opacity <= 0.001 || !geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        key={isTransparent ? 'transparent' : 'opaque'}
        color={color}
        roughness={0.5}
        metalness={0.05}
        transparent={isTransparent}
        opacity={opacity}
        depthWrite={!isTransparent}
      />
    </mesh>
  )
}

function collectNodes(groups: BodyGroup[]): { pos: THREE.Vector3; color: string }[] {
  const NODE_COLORS = {
    front: '#60a5fa',
    back: '#f87171',
    hipLeft: '#4ade80',
    hipRight: '#a78bfa',
    foot: '#fb923c',
  }
  const out: { pos: THREE.Vector3; color: string }[] = []
  for (const g of groups) {
    if (g.nodeFront && g.type === 'head') out.push({ pos: new THREE.Vector3(g.nodeFront.x, g.nodeFront.y ?? 0, g.nodeFront.z), color: NODE_COLORS.front })
    if (g.nodeBack) out.push({ pos: new THREE.Vector3(g.nodeBack.x, g.nodeBack.y ?? 0, g.nodeBack.z), color: NODE_COLORS.back })
    if (g.nodeHipLeft) out.push({ pos: new THREE.Vector3(g.nodeHipLeft.x, g.nodeHipLeft.y ?? 0, g.nodeHipLeft.z), color: NODE_COLORS.hipLeft })
    if (g.nodeHipRight) out.push({ pos: new THREE.Vector3(g.nodeHipRight.x, g.nodeHipRight.y ?? 0, g.nodeHipRight.z), color: NODE_COLORS.hipRight })
    if (g.nodeFoot) out.push({ pos: new THREE.Vector3(g.nodeFoot.x, g.nodeFoot.y ?? 0, g.nodeFoot.z), color: NODE_COLORS.foot })
  }
  return out
}

export function StaticPosedModel({
  modelConfig,
  segments,
  opacity = 1,
  showNodes = false,
}: {
  modelConfig: ModelConfigRow
  segments: SegmentData[]
  opacity?: number
  showNodes?: boolean
}) {
  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])
  const nodes = useMemo(() => (showNodes ? collectNodes(modelConfig.groups) : []), [showNodes, modelConfig.groups])

  return (
    <group>
      {modelConfig.groups.map((g) => (
        <StaticGroupBody key={g.id} group={g} segmentMap={segmentMap} opacity={opacity} />
      ))}
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[0.1, 12, 8]} />
          <meshBasicMaterial color={n.color} depthTest={false} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  )
}

function StaticGroupBody({
  group,
  segmentMap,
  opacity,
}: {
  group: BodyGroup
  segmentMap: Map<string, SegmentData>
  opacity: number
}) {
  const segments = useGroupSegments(group, segmentMap)
  return <MergedGroupMesh segments={segments} color={group.color} opacity={opacity} />
}

const NEUTRAL_ROLE_COLOR = '#9ca3af'

function partitionSegmentsByColor(
  segments: SegmentData[],
  roleTags: RoleTags,
  phenotype: Phenotype,
): { color: string; segments: SegmentData[] }[] {
  const byColor = new Map<string, SegmentData[]>()
  for (const s of segments) {
    const role = roleTags[s.id]
    const color = (role && phenotype[role]) || NEUTRAL_ROLE_COLOR
    const list = byColor.get(color) ?? []
    list.push(s)
    byColor.set(color, list)
  }
  return Array.from(byColor.entries()).map(([color, segs]) => ({ color, segments: segs }))
}

export function RoleColoredGroupBody({
  group,
  segmentMap,
  roleTags,
  phenotype,
  opacity,
}: {
  group: BodyGroup
  segmentMap: Map<string, SegmentData>
  roleTags: RoleTags
  phenotype: Phenotype
  opacity: number
}) {
  const segments = useGroupSegments(group, segmentMap)
  const parts = useMemo(
    () => partitionSegmentsByColor(segments, roleTags, phenotype),
    [segments, roleTags, phenotype],
  )
  return (
    <>
      {parts.map((p) => (
        <MergedGroupMesh key={p.color} segments={p.segments} color={p.color} opacity={opacity} />
      ))}
    </>
  )
}

function useModelFit(segments: SegmentData[], targetSize = 8) {
  return useMemo(() => {
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (const s of segments) {
      const p = s.positions
      for (let i = 0; i < p.length; i += 3) {
        if (p[i] < minX) minX = p[i]; if (p[i] > maxX) maxX = p[i]
        if (p[i + 1] < minY) minY = p[i + 1]; if (p[i + 1] > maxY) maxY = p[i + 1]
        if (p[i + 2] < minZ) minZ = p[i + 2]; if (p[i + 2] > maxZ) maxZ = p[i + 2]
      }
    }
    if (!Number.isFinite(minX)) return { scale: 1, position: [0, 0, 0] as [number, number, number] }
    const dim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1
    const scale = targetSize / dim
    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2
    return { scale, position: [-scale * cx, -scale * minY, -scale * cz] as [number, number, number] }
  }, [segments, targetSize])
}

export function PosedDragon({
  groups,
  segments,
  roleTags,
  phenotype,
  opacity = 1,
}: {
  groups: BodyGroup[]
  segments: SegmentData[]
  roleTags: RoleTags
  phenotype: Phenotype
  opacity?: number
}) {
  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])
  const fit = useModelFit(segments)
  return (
    <group scale={fit.scale} position={fit.position}>
      {groups.map((g) => (
        <RoleColoredGroupBody
          key={g.id}
          group={g}
          segmentMap={segmentMap}
          roleTags={roleTags}
          phenotype={phenotype}
          opacity={opacity}
        />
      ))}
    </group>
  )
}
