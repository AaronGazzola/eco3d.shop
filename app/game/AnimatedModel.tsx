'use client'

import { RefObject, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData, BodyGroup } from '../admin/_lib/types'
import { useAnimateStore } from '../admin/animate/animateStore'
import { useLocomotion } from './locomotion/useLocomotion'
import { buildSkeletonTree, flattenSkeleton, SkeletonNode } from './locomotion/chain'

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
  opacity,
}: {
  group: BodyGroup
  segmentMap: Map<string, SegmentData>
  showNodes: boolean
  opacity: number
}) {
  const segments = useGroupSegments(group, segmentMap)
  return (
    <>
      <MergedGroupMesh segments={segments} color={group.color} opacity={opacity} />
      {showNodes && <GroupNodeSpheres group={group} />}
    </>
  )
}

function LegMount({
  group,
  segmentMap,
  showNodes,
  pivotsRef,
  opacity,
}: {
  group: BodyGroup
  segmentMap: Map<string, SegmentData>
  showNodes: boolean
  pivotsRef: RefObject<Map<string, THREE.Group>>
  opacity: number
}) {
  return (
    <group
      ref={(node) => {
        const m = pivotsRef.current
        if (!m) return
        if (node) m.set(group.id, node)
        else m.delete(group.id)
      }}
    >
      <GroupBody group={group} segmentMap={segmentMap} showNodes={showNodes} opacity={opacity} />
    </group>
  )
}

type ChainNodePos = { x: number; y?: number; z: number }

function ChainNode({
  node,
  segmentMap,
  showNodes,
  pivotsRef,
  opacity,
  legsBySpineId,
  parentNodeBack,
}: {
  node: SkeletonNode
  segmentMap: Map<string, SegmentData>
  showNodes: boolean
  pivotsRef: RefObject<Map<string, THREE.Group>>
  opacity: number
  legsBySpineId: Map<string, BodyGroup[]>
  parentNodeBack: ChainNodePos | null
}) {
  const g = node.group
  const attachedLegs = legsBySpineId.get(g.id) ?? []
  const children = node.children.map((child) => (
    <ChainNode
      key={child.group.id}
      node={child}
      segmentMap={segmentMap}
      showNodes={showNodes}
      pivotsRef={pivotsRef}
      opacity={opacity}
      legsBySpineId={legsBySpineId}
      parentNodeBack={g.nodeBack ?? null}
    />
  ))
  const legMounts = attachedLegs.map((leg) => (
    <LegMount
      key={leg.id}
      group={leg}
      segmentMap={segmentMap}
      showNodes={showNodes}
      pivotsRef={pivotsRef}
      opacity={opacity}
    />
  ))

  const pivotNode = parentNodeBack ?? g.nodeFront ?? g.nodeBack
  if (!pivotNode) {
    return (
      <group>
        <GroupBody group={g} segmentMap={segmentMap} showNodes={showNodes} opacity={opacity} />
        {children}
        {legMounts}
      </group>
    )
  }

  const px = pivotNode.x
  const py = pivotNode.y ?? 0
  const pz = pivotNode.z

  return (
    <group position={[px, py, pz]}>
      <group
        ref={(node) => {
          const m = pivotsRef.current
          if (!m) return
          if (node) m.set(g.id, node)
          else m.delete(g.id)
        }}
      >
        <group position={[-px, -py, -pz]}>
          <GroupBody group={g} segmentMap={segmentMap} showNodes={showNodes} opacity={opacity} />
          {children}
          {legMounts}
        </group>
      </group>
    </group>
  )
}

// During locomotion each chain segment is drawn directly from its Rapier body transform: the
// group's matrix is set every frame by useLocomotion (matrixAutoUpdate off), so what is rendered
// is exactly what the physics simulates — no kinematic-puppet reconstruction. Attached legs ride
// inside it as passengers.
function BodyMount({
  group,
  segmentMap,
  showNodes,
  opacity,
  bodyRefs,
  pivotsRef,
  legs,
}: {
  group: BodyGroup
  segmentMap: Map<string, SegmentData>
  showNodes: boolean
  opacity: number
  bodyRefs: RefObject<Map<string, THREE.Group>>
  pivotsRef: RefObject<Map<string, THREE.Group>>
  legs: BodyGroup[]
}) {
  return (
    <group
      matrixAutoUpdate={false}
      ref={(node) => {
        const m = bodyRefs.current
        if (!m) return
        if (node) m.set(group.id, node)
        else m.delete(group.id)
      }}
    >
      <GroupBody group={group} segmentMap={segmentMap} showNodes={showNodes} opacity={opacity} />
      {legs.map((leg) => (
        <LegMount
          key={leg.id}
          group={leg}
          segmentMap={segmentMap}
          showNodes={showNodes}
          pivotsRef={pivotsRef}
          opacity={opacity}
        />
      ))}
    </group>
  )
}

export function AnimatedModel({
  modelConfig,
  segments,
  showNodes = false,
  opacity = 1,
  rootRef,
}: {
  modelConfig: ModelConfigRow
  segments: SegmentData[]
  showNodes?: boolean
  opacity?: number
  rootRef?: RefObject<THREE.Group | null>
}) {
  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])
  const pivotsRef = useRef<Map<string, THREE.Group>>(new Map())
  const bodyRefs = useRef<Map<string, THREE.Group>>(new Map())
  const footGlowRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const allLegs = useMemo(
    () => modelConfig.groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right'),
    [modelConfig.groups]
  )
  const coupledRunning = useAnimateStore((s) => s.coupledRunning)
  const coupledMode = useAnimateStore((s) => s.coupledMode)
  const landLegsEnabled = useAnimateStore((s) => s.landLegsEnabled)
  // Render legs as their own physics-driven bodies ONLY when those bodies are actually built.
  // When legs are stripped, fall back to the swim renderer (legs glued to their spine segment) so
  // they swing with the body wave instead of rendering frozen/detached at the origin.
  const landMode = coupledMode === 'land' && landLegsEnabled

  const skeletonTree = useMemo(() => buildSkeletonTree(modelConfig.groups), [modelConfig.groups])
  const skeletonGroups = useMemo(() => flattenSkeleton(skeletonTree), [skeletonTree])
  const chainIds = useMemo(() => new Set(skeletonGroups.map((g) => g.id)), [skeletonGroups])

  const { legsBySpineId, orphanLegs } = useMemo(() => {
    const byParent = new Map<string, BodyGroup[]>()
    const orphans: BodyGroup[] = []
    for (const g of modelConfig.groups) {
      if (g.type !== 'leg-left' && g.type !== 'leg-right') continue
      const parentId = g.attachedToSpineId
      if (parentId && chainIds.has(parentId)) {
        const list = byParent.get(parentId)
        if (list) list.push(g)
        else byParent.set(parentId, [g])
      } else {
        console.error(
          `AnimatedModel: leg group ${g.id} has unresolved attachedToSpineId ${parentId ?? '<missing>'} — rendering at model root`
        )
        orphans.push(g)
      }
    }
    return { legsBySpineId: byParent, orphanLegs: orphans }
  }, [modelConfig.groups, chainIds])

  useLocomotion(pivotsRef, bodyRefs, modelConfig.groups, segments, rootRef, footGlowRef)

  return (
    <group ref={rootRef}>
      {modelConfig.groups.map((g) => {
        if (chainIds.has(g.id)) return null
        if (g.type === 'leg-left' || g.type === 'leg-right') return null
        return (
          <group key={g.id}>
            <GroupBody group={g} segmentMap={segmentMap} showNodes={showNodes} opacity={opacity} />
          </group>
        )
      })}
      {orphanLegs.map((leg) => (
        <LegMount
          key={leg.id}
          group={leg}
          segmentMap={segmentMap}
          showNodes={showNodes}
          pivotsRef={pivotsRef}
          opacity={opacity}
        />
      ))}
      {coupledRunning
        ? (
            <>
              {skeletonGroups.map((g) => (
                <BodyMount
                  key={g.id}
                  group={g}
                  segmentMap={segmentMap}
                  showNodes={showNodes}
                  opacity={opacity}
                  bodyRefs={bodyRefs}
                  pivotsRef={pivotsRef}
                  legs={landMode ? [] : legsBySpineId.get(g.id) ?? []}
                />
              ))}
              {landMode &&
                Array.from(legsBySpineId.values()).flat().map((leg) => (
                  <BodyMount
                    key={leg.id}
                    group={leg}
                    segmentMap={segmentMap}
                    showNodes={showNodes}
                    opacity={opacity}
                    bodyRefs={bodyRefs}
                    pivotsRef={pivotsRef}
                    legs={[]}
                  />
                ))}
            </>
          )
        : skeletonTree && (
            <ChainNode
              node={skeletonTree}
              segmentMap={segmentMap}
              showNodes={showNodes}
              pivotsRef={pivotsRef}
              opacity={opacity}
              legsBySpineId={legsBySpineId}
              parentNodeBack={null}
            />
          )}
      {allLegs.map((leg) => (
        <mesh
          key={`footglow-${leg.id}`}
          ref={(m) => {
            const map = footGlowRef.current
            if (m) map.set(leg.id, m)
            else map.delete(leg.id)
          }}
          visible={false}
        >
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshBasicMaterial color="#00e5ff" toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  )
}
