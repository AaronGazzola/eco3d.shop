'use client'

import { useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { useStudioStore } from './page.stores'
import { SegmentData, BodyGroup } from './page.types'

function computeFloorCentroid(segmentIds: string[], segmentMap: Map<string, SegmentData>): THREE.Vector3 {
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
  if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
    obj.geometry?.dispose()
    const mat = obj.material
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else (mat as THREE.Material)?.dispose()
  }
}

function getNodePosition(group: BodyGroup, segmentMap: Map<string, SegmentData>): THREE.Vector3 {
  if (group.nodePosition) return new THREE.Vector3(group.nodePosition.x, 0, group.nodePosition.z)
  return computeFloorCentroid(group.segmentIds, segmentMap)
}

function InteractiveNode({ group, centroid }: { group: BodyGroup; centroid: THREE.Vector3 }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { controls } = useThree()

  const {
    selectedNodeGroupId,
    nodeTransformMode,
    setSelectedNodeGroupId,
    setNodeGroupPosition,
    setNodeGroupAngle,
  } = useStudioStore()

  const isSelected = selectedNodeGroupId === group.id
  const pos = group.nodePosition ?? { x: centroid.x, z: centroid.z }
  const angle = group.nodeAngle ?? 0

  useLayoutEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(pos.x, 0, pos.z)
    groupRef.current.rotation.set(0, angle, 0)
  }, [pos.x, pos.z, angle])

  const arrowGeom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 1.5]), 3))
    return g
  }, [])

  useEffect(() => () => arrowGeom.dispose(), [arrowGeom])

  const handleMouseDown = useCallback(() => {
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false
  }, [controls])

  const handleMouseUp = useCallback(() => {
    if (controls) (controls as unknown as { enabled: boolean }).enabled = true
    if (!groupRef.current) return
    if (nodeTransformMode === 'translate') {
      groupRef.current.position.y = 0
      setNodeGroupPosition(group.id, groupRef.current.position.x, groupRef.current.position.z)
    } else {
      setNodeGroupAngle(group.id, groupRef.current.rotation.y)
    }
  }, [controls, nodeTransformMode, group.id, setNodeGroupPosition, setNodeGroupAngle])

  const handleChange = useCallback(() => {
    if (nodeTransformMode === 'translate' && groupRef.current) {
      groupRef.current.position.y = 0
    }
  }, [nodeTransformMode])

  return (
    <>
      <group ref={groupRef}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            setSelectedNodeGroupId(group.id)
          }}
        >
          <sphereGeometry args={[isSelected ? 0.25 : 0.18, 10, 10]} />
          <meshStandardMaterial
            color={isSelected ? '#ffffff' : group.color}
            emissive={group.color}
            emissiveIntensity={isSelected ? 1 : 0.3}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
        <line>
          <primitive attach="geometry" object={arrowGeom} />
          <lineBasicMaterial color={group.color} opacity={0.85} transparent />
        </line>
      </group>
      {isSelected && (
        <TransformControls
          object={groupRef}
          mode={nodeTransformMode}
          showY={nodeTransformMode === 'translate' ? false : undefined}
          showX={nodeTransformMode === 'rotate' ? false : undefined}
          showZ={nodeTransformMode === 'rotate' ? false : undefined}
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
    const centroidMap = new Map<string, THREE.Vector3>()
    for (const g of groups) {
      centroidMap.set(g.id, getNodePosition(g, segmentMap))
    }

    const headGroup = groups.find((g) => g.type === 'head')
    const tailGroup = groups.find((g) => g.type === 'tail')
    const spineGroups = groups.filter((g) => g.type === 'spine')
    const legGroups = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right')

    const sphereMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 })
    const sphereGeom = new THREE.SphereGeometry(0.15, 10, 10)
    const mesh = new THREE.InstancedMesh(sphereGeom, sphereMat, groups.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    const dummy = new THREE.Object3D()
    groups.forEach((g, i) => {
      dummy.position.copy(centroidMap.get(g.id)!)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, new THREE.Color(g.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    container.add(mesh)

    const spineChain: BodyGroup[] = [
      ...(headGroup ? [headGroup] : []),
      ...spineGroups,
      ...(tailGroup ? [tailGroup] : []),
    ]
    if (spineChain.length >= 2) {
      const points = spineChain.map((g) => centroidMap.get(g.id)!)
      container.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: '#ffffff', opacity: 0.6, transparent: true })
      ))
    }

    const legPairs: THREE.Vector3[] = []
    for (const leg of legGroups) {
      if (!leg.attachedToSpineId) continue
      const legPos = centroidMap.get(leg.id)
      const spinePos = centroidMap.get(leg.attachedToSpineId)
      if (legPos && spinePos) legPairs.push(legPos.clone(), spinePos.clone())
    }
    if (legPairs.length >= 2) {
      container.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(legPairs),
        new THREE.LineBasicMaterial({ color: '#22c55e', opacity: 0.7, transparent: true })
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
    return (
      <>
        {groups.map((g) => (
          <InteractiveNode
            key={g.id}
            group={g}
            centroid={getNodePosition(g, segmentMap)}
          />
        ))}
      </>
    )
  }

  return <StaticNodeOverlay groups={groups} segments={segments} />
}
