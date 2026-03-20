'use client'

import { useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { useStudioStore } from './page.stores'
import { SegmentData, BodyGroup, NodeType } from './page.types'

function computeCentroid(segmentIds: string[], segmentMap: Map<string, SegmentData>): THREE.Vector3 {
  let sumX = 0, sumZ = 0, count = 0
  for (const sid of segmentIds) {
    const seg = segmentMap.get(sid)
    if (!seg) continue
    const n = seg.positions.length / 3
    for (let i = 0; i < n; i++) {
      sumX += seg.positions[i * 3]
      sumZ += seg.positions[i * 3 + 2]
      count++
    }
  }
  return count > 0 ? new THREE.Vector3(sumX / count, 0, sumZ / count) : new THREE.Vector3()
}

function disposeObject(obj: THREE.Object3D) {
  if (
    obj instanceof THREE.Mesh ||
    obj instanceof THREE.InstancedMesh ||
    obj instanceof THREE.Line ||
    obj instanceof THREE.LineSegments
  ) {
    obj.geometry?.dispose()
    const mat = obj.material
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else (mat as THREE.Material)?.dispose()
  }
}

interface NodeEntry {
  groupId: string
  nodeType: NodeType
  position: THREE.Vector3
  color: string
}

const NODE_COLORS: Record<NodeType, string> = {
  front: '#60a5fa',
  back: '#f87171',
  hipLeft: '#4ade80',
  hipRight: '#a78bfa',
  hip: '#fbbf24',
  foot: '#fb923c',
}

function buildSpineChain(groups: BodyGroup[]): BodyGroup[] {
  const head = groups.find((g) => g.type === 'head')
  const tail = groups.find((g) => g.type === 'tail')
  const spines = groups.filter((g) => g.type === 'spine')
  return [...(head ? [head] : []), ...spines, ...(tail ? [tail] : [])]
}

/**
 * Returns canonical node entries — no duplicates.
 * - chain[0].nodeFront = joint[0] (independent)
 * - chain[i].nodeBack  = joint[i+1] (shared with chain[i+1].front)
 * - spine.nodeHipLeft/Right = shared with attached leg's hip
 * - leg.nodeFoot = foot joint (owned by leg)
 */
function getCanonicalNodes(
  groups: BodyGroup[],
  segmentMap: Map<string, SegmentData>
): NodeEntry[] {
  const chain = buildSpineChain(groups)
  const legs = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right')
  const entries: NodeEntry[] = []

  chain.forEach((g, i) => {
    const c = computeCentroid(g.segmentIds, segmentMap)
    if (i === 0) {
      entries.push({
        groupId: g.id,
        nodeType: 'front',
        position: g.nodeFront ? new THREE.Vector3(g.nodeFront.x, 0, g.nodeFront.z) : c.clone(),
        color: NODE_COLORS.front,
      })
    }
    entries.push({
      groupId: g.id,
      nodeType: 'back',
      position: g.nodeBack ? new THREE.Vector3(g.nodeBack.x, 0, g.nodeBack.z) : c.clone(),
      color: NODE_COLORS.back,
    })

    const hasLeft = legs.some((l) => l.type === 'leg-left' && l.attachedToSpineId === g.id)
    const hasRight = legs.some((l) => l.type === 'leg-right' && l.attachedToSpineId === g.id)
    if (hasLeft) {
      entries.push({
        groupId: g.id,
        nodeType: 'hipLeft',
        position: g.nodeHipLeft
          ? new THREE.Vector3(g.nodeHipLeft.x, 0, g.nodeHipLeft.z)
          : new THREE.Vector3(c.x - 0.3, 0, c.z),
        color: NODE_COLORS.hipLeft,
      })
    }
    if (hasRight) {
      entries.push({
        groupId: g.id,
        nodeType: 'hipRight',
        position: g.nodeHipRight
          ? new THREE.Vector3(g.nodeHipRight.x, 0, g.nodeHipRight.z)
          : new THREE.Vector3(c.x + 0.3, 0, c.z),
        color: NODE_COLORS.hipRight,
      })
    }
  })

  legs.forEach((g) => {
    const c = computeCentroid(g.segmentIds, segmentMap)
    entries.push({
      groupId: g.id,
      nodeType: 'foot',
      position: g.nodeFoot ? new THREE.Vector3(g.nodeFoot.x, 0, g.nodeFoot.z) : c.clone(),
      color: NODE_COLORS.foot,
    })
  })

  return entries
}

function buildLines(
  groups: BodyGroup[],
  segmentMap: Map<string, SegmentData>
): { spinePoints: THREE.Vector3[]; limbPairs: THREE.Vector3[] } {
  const chain = buildSpineChain(groups)
  const legs = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right')

  const spinePoints: THREE.Vector3[] = []
  chain.forEach((g, i) => {
    const c = computeCentroid(g.segmentIds, segmentMap)
    if (i === 0) {
      spinePoints.push(g.nodeFront ? new THREE.Vector3(g.nodeFront.x, 0, g.nodeFront.z) : c.clone())
    }
    spinePoints.push(g.nodeBack ? new THREE.Vector3(g.nodeBack.x, 0, g.nodeBack.z) : c.clone())
  })

  const limbPairs: THREE.Vector3[] = []
  legs.forEach((g) => {
    const spineGroup = groups.find((sg) => sg.id === g.attachedToSpineId)
    if (!spineGroup) return
    const hipNode = g.type === 'leg-left' ? spineGroup.nodeHipLeft : spineGroup.nodeHipRight
    if (!hipNode) return
    const hip = new THREE.Vector3(hipNode.x, 0, hipNode.z)
    const foot = g.nodeFoot ? new THREE.Vector3(g.nodeFoot.x, 0, g.nodeFoot.z) : computeCentroid(g.segmentIds, segmentMap)
    limbPairs.push(hip, foot)
  })

  return { spinePoints, limbPairs }
}

function InteractiveNode({ entry }: { entry: NodeEntry }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { controls } = useThree()
  const { selectedNodeId, setSelectedNodeId, setGroupNode } = useStudioStore()

  const isSelected =
    selectedNodeId?.groupId === entry.groupId && selectedNodeId?.nodeType === entry.nodeType

  useLayoutEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.copy(entry.position)
  }, [entry.position.x, entry.position.z])

  const handleMouseDown = useCallback(() => {
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false
  }, [controls])

  const handleMouseUp = useCallback(() => {
    if (controls) (controls as unknown as { enabled: boolean }).enabled = true
    if (!groupRef.current) return
    groupRef.current.position.y = 0
    setGroupNode(entry.groupId, entry.nodeType, groupRef.current.position.x, groupRef.current.position.z)
  }, [controls, entry.groupId, entry.nodeType, setGroupNode])

  const handleChange = useCallback(() => {
    if (groupRef.current) groupRef.current.position.y = 0
  }, [])

  return (
    <>
      <group ref={groupRef}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            setSelectedNodeId({ groupId: entry.groupId, nodeType: entry.nodeType })
          }}
        >
          <sphereGeometry args={[isSelected ? 0.22 : 0.15, 10, 10]} />
          <meshStandardMaterial
            color={isSelected ? '#ffffff' : entry.color}
            emissive={entry.color}
            emissiveIntensity={isSelected ? 1 : 0.4}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      </group>
      {isSelected && (
        <TransformControls
          object={groupRef}
          mode="translate"
          showY={false}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onChange={handleChange}
        />
      )}
    </>
  )
}

function StaticNodeOverlay({ groups, segments }: { groups: BodyGroup[]; segments: SegmentData[] }) {
  const containerRef = useRef<THREE.Group>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const toDispose = [...container.children]
    container.clear()
    toDispose.forEach(disposeObject)

    if (groups.length === 0) return

    const segmentMap = new Map(segments.map((s) => [s.id, s]))
    const allNodes = getCanonicalNodes(groups, segmentMap)

    if (allNodes.length > 0) {
      const sphereGeom = new THREE.SphereGeometry(0.12, 10, 10)
      const mesh = new THREE.InstancedMesh(
        sphereGeom,
        new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }),
        allNodes.length
      )
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      const dummy = new THREE.Object3D()
      allNodes.forEach((n, i) => {
        dummy.position.copy(n.position)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        mesh.setColorAt(i, new THREE.Color(n.color))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      container.add(mesh)
    }

    const { spinePoints, limbPairs } = buildLines(groups, segmentMap)

    if (spinePoints.length >= 2) {
      container.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(spinePoints),
        new THREE.LineBasicMaterial({ color: '#ffffff', opacity: 0.6, transparent: true })
      ))
    }

    if (limbPairs.length >= 2) {
      container.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(limbPairs),
        new THREE.LineBasicMaterial({ color: '#fbbf24', opacity: 0.7, transparent: true })
      ))
    }

    return () => {
      const children = [...container.children]
      container.clear()
      children.forEach(disposeObject)
    }
  }, [segments, groups])

  return <group ref={containerRef} />
}

export function NodeOverlay() {
  const { segments, groups, selectionMode } = useStudioStore()

  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])

  if (selectionMode === 'node' && groups.length > 0) {
    const allNodes = getCanonicalNodes(groups, segmentMap)
    return (
      <>
        {allNodes.map((entry) => (
          <InteractiveNode
            key={`${entry.groupId}-${entry.nodeType}`}
            entry={entry}
          />
        ))}
      </>
    )
  }

  return <StaticNodeOverlay groups={groups} segments={segments} />
}
