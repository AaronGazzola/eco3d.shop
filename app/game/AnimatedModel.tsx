'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData, BodyGroup } from '../studio/page.types'

function SegmentMesh({
  positions,
  color,
  opacity,
}: {
  positions: Float32Array
  color: string
  opacity: number
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.computeVertexNormals()
    return geo
  }, [positions])

  const isTransparent = opacity < 1
  if (opacity <= 0.001) return null

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
    if (g.nodeFront) out.push({ pos: new THREE.Vector3(g.nodeFront.x, g.nodeFront.y ?? 0, g.nodeFront.z), color: NODE_COLORS.front })
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
      {modelConfig.groups.map((g) =>
        g.segmentIds.map((sid) => {
          const seg = segmentMap.get(sid)
          if (!seg) return null
          return <SegmentMesh key={sid} positions={seg.positions} color={g.color} opacity={opacity} />
        })
      )}
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[0.1, 12, 8]} />
          <meshBasicMaterial color={n.color} depthTest={false} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  )
}
