'use client'

import { RefObject, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData, BodyGroup } from '../admin/_lib/types'
import { useLocomotion } from './locomotion/useLocomotion'
import { buildSkeletonTree, flattenSkeleton, SkeletonNode } from './locomotion/chain'
import { findFrontHip, findRearHip, findLegsForHip } from './locomotion/legs'

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

function GroupNodeSpheres({ group }: { group: BodyGroup }) {
  const nodes = useMemo(() => collectNodes([group]), [group])
  return (
    <>
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[0.1, 12, 8]} />
          <meshBasicMaterial color={n.color} depthTest={false} transparent opacity={0.95} />
        </mesh>
      ))}
    </>
  )
}

function GroupBody({
  group,
  segmentMap,
  showNodes,
}: {
  group: BodyGroup
  segmentMap: Map<string, SegmentData>
  showNodes: boolean
}) {
  return (
    <>
      {group.segmentIds.map((sid) => {
        const seg = segmentMap.get(sid)
        if (!seg) return null
        return <SegmentMesh key={sid} positions={seg.positions} color={group.color} opacity={1} />
      })}
      {showNodes && <GroupNodeSpheres group={group} />}
    </>
  )
}

function ChainNode({
  node,
  segmentMap,
  showNodes,
  pivotsRef,
}: {
  node: SkeletonNode
  segmentMap: Map<string, SegmentData>
  showNodes: boolean
  pivotsRef: RefObject<Map<string, THREE.Group>>
}) {
  const g = node.group
  const children = node.children.map((child) => (
    <ChainNode
      key={child.group.id}
      node={child}
      segmentMap={segmentMap}
      showNodes={showNodes}
      pivotsRef={pivotsRef}
    />
  ))

  if (!g.nodeBack) {
    return (
      <group>
        <GroupBody group={g} segmentMap={segmentMap} showNodes={showNodes} />
        {children}
      </group>
    )
  }

  const back = g.nodeBack
  const bx = back.x
  const by = back.y ?? 0
  const bz = back.z

  return (
    <group position={[bx, by, bz]}>
      <group
        ref={(node) => {
          const m = pivotsRef.current
          if (!m) return
          if (node) m.set(g.id, node)
          else m.delete(g.id)
        }}
      >
        <group position={[-bx, -by, -bz]}>
          <GroupBody group={g} segmentMap={segmentMap} showNodes={showNodes} />
          {children}
        </group>
      </group>
    </group>
  )
}

function FootMarker({ markerRef, color }: { markerRef: RefObject<THREE.Group | null>; color: string }) {
  return (
    <group ref={markerRef}>
      <mesh>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

export function AnimatedModel({
  modelConfig,
  segments,
  showNodes = false,
}: {
  modelConfig: ModelConfigRow
  segments: SegmentData[]
  showNodes?: boolean
}) {
  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])
  const pivotsRef = useRef<Map<string, THREE.Group>>(new Map())
  const frontLeftFootMarkerRef = useRef<THREE.Group | null>(null)
  const frontRightFootMarkerRef = useRef<THREE.Group | null>(null)
  const rearLeftFootMarkerRef = useRef<THREE.Group | null>(null)
  const rearRightFootMarkerRef = useRef<THREE.Group | null>(null)

  const skeletonTree = useMemo(() => buildSkeletonTree(modelConfig.groups), [modelConfig.groups])
  const skeletonGroups = useMemo(() => flattenSkeleton(skeletonTree), [skeletonTree])
  const chainIds = useMemo(() => new Set(skeletonGroups.map((g) => g.id)), [skeletonGroups])

  const hasFrontLegs = useMemo(() => {
    const frontHip = findFrontHip(modelConfig.groups)
    if (!frontHip) return false
    const { left, right } = findLegsForHip(modelConfig.groups, frontHip.id)
    return !!(left?.nodeFoot && right?.nodeFoot)
  }, [modelConfig.groups])

  const hasRearLegs = useMemo(() => {
    const rearHip = findRearHip(modelConfig.groups)
    if (!rearHip) return false
    const { left, right } = findLegsForHip(modelConfig.groups, rearHip.id)
    return !!(left?.nodeFoot && right?.nodeFoot)
  }, [modelConfig.groups])

  useLocomotion(pivotsRef, modelConfig.groups, modelConfig.model_rotation, {
    front: hasFrontLegs
      ? { left: frontLeftFootMarkerRef, right: frontRightFootMarkerRef }
      : null,
    rear: hasRearLegs
      ? { left: rearLeftFootMarkerRef, right: rearRightFootMarkerRef }
      : null,
  })

  return (
    <group>
      {modelConfig.groups.map((g) => {
        if (chainIds.has(g.id)) return null
        if (g.type === 'leg-left' || g.type === 'leg-right') {
          return (
            <group
              key={g.id}
              ref={(node) => {
                const m = pivotsRef.current
                if (!m) return
                if (node) m.set(g.id, node)
                else m.delete(g.id)
              }}
            >
              <GroupBody group={g} segmentMap={segmentMap} showNodes={showNodes} />
            </group>
          )
        }
        return (
          <group key={g.id}>
            <GroupBody group={g} segmentMap={segmentMap} showNodes={showNodes} />
          </group>
        )
      })}
      {skeletonTree && (
        <ChainNode
          node={skeletonTree}
          segmentMap={segmentMap}
          showNodes={showNodes}
          pivotsRef={pivotsRef}
        />
      )}
      {hasFrontLegs && (
        <>
          <FootMarker markerRef={frontLeftFootMarkerRef} color="#4ade80" />
          <FootMarker markerRef={frontRightFootMarkerRef} color="#a78bfa" />
        </>
      )}
      {hasRearLegs && (
        <>
          <FootMarker markerRef={rearLeftFootMarkerRef} color="#facc15" />
          <FootMarker markerRef={rearRightFootMarkerRef} color="#38bdf8" />
        </>
      )}
    </group>
  )
}
