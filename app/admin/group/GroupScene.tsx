'use client'

import { useMemo, useEffect, useRef, useLayoutEffect, useCallback, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSharedStore } from '../_lib/sharedStore'
import { useGroupStore } from './groupStore'
import { CameraController, StudioCanvas } from '../_lib/StudioCanvas'
import { SegmentData } from '../_lib/types'
import { NodeOverlay } from './NodeOverlay'

function SphereSelector() {
  const sphere = useGroupStore((s) => s.sphere)
  const setSphere = useGroupStore((s) => s.setSphere)
  const groupRef = useRef<THREE.Group>(null!)
  const isDragging = useRef(false)
  const lastIdsKey = useRef('')
  const { controls } = useThree()

  useLayoutEffect(() => {
    if (!groupRef.current || isDragging.current || !sphere) return
    groupRef.current.position.set(sphere.x, sphere.y, sphere.z)
  }, [sphere?.x, sphere?.y, sphere?.z])

  useFrame(() => {
    if (!groupRef.current) return
    const s = useGroupStore.getState().sphere
    if (!s) return
    const { segments, modelRotation } = useSharedStore.getState()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...modelRotation)).invert()
    const { x, y, z } = groupRef.current.position
    const localCenter = new THREE.Vector3(x, y, z).applyQuaternion(q)
    const r2 = s.radius * s.radius
    const matchingIds: string[] = []
    for (const seg of segments) {
      let hit = false
      for (let i = 0; i < seg.positions.length; i += 3) {
        const dx = seg.positions[i] - localCenter.x
        const dy = seg.positions[i + 1] - localCenter.y
        const dz = seg.positions[i + 2] - localCenter.z
        if (dx * dx + dy * dy + dz * dz <= r2) { hit = true; break }
      }
      if (hit) matchingIds.push(seg.id)
    }
    const newKey = matchingIds.join(',')
    if (newKey !== lastIdsKey.current) {
      lastIdsKey.current = newKey
      useGroupStore.getState().setPendingSegmentIds(matchingIds)
    }
  })

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false
  }, [controls])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    if (controls) (controls as unknown as { enabled: boolean }).enabled = true
    if (!groupRef.current) return
    const { x, y, z } = groupRef.current.position
    const s = useGroupStore.getState().sphere
    if (!s) return
    setSphere({ x, y, z, radius: s.radius })
  }, [controls, setSphere])

  if (!sphere) return null

  return (
    <>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[sphere.radius, 32, 16]} />
          <meshStandardMaterial color="#7c3aed" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <TransformControls
        object={groupRef}
        mode="translate"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
    </>
  )
}

function SegmentMesh({
  seg,
  isPending,
  groupColor,
  dimmed,
  translucent,
  onClick,
}: {
  seg: SegmentData
  isPending: boolean
  groupColor: string | null
  dimmed: boolean
  translucent: boolean
  onClick: () => void
}) {
  const selectionMode = useGroupStore((s) => s.selectionMode)
  const sphere = useGroupStore((s) => s.sphere)
  const setSphere = useGroupStore((s) => s.setSphere)

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(seg.positions, 3))
    g.computeVertexNormals()
    return g
  }, [seg.positions])

  const handleClick = useCallback((e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    e.stopPropagation()
    if (selectionMode === 'sphere') {
      setSphere({ x: e.point.x, y: e.point.y, z: e.point.z, radius: sphere?.radius ?? 2.0 })
    } else if (selectionMode === 'click') {
      onClick()
    }
  }, [selectionMode, sphere, setSphere, onClick])

  const colorMaterial = isPending ? (
    <meshStandardMaterial
      color={seg.color}
      emissive={seg.color}
      emissiveIntensity={0.7}
      roughness={0.3}
      metalness={0.1}
      opacity={translucent ? 0.4 : 1}
      transparent={translucent}
      depthWrite={!translucent}
      depthFunc={translucent ? THREE.LessEqualDepth : THREE.LessDepth}
    />
  ) : groupColor ? (
    <meshStandardMaterial
      color={groupColor}
      roughness={0.4}
      metalness={0.05}
      opacity={translucent ? 0.4 : 1}
      transparent={translucent}
      depthWrite={!translucent}
      depthFunc={translucent ? THREE.LessEqualDepth : THREE.LessDepth}
    />
  ) : (
    <meshStandardMaterial
      color={seg.color}
      opacity={translucent ? 0.4 : dimmed ? 0.35 : 1}
      transparent={translucent || dimmed}
      depthWrite={!translucent}
      depthFunc={translucent ? THREE.LessEqualDepth : THREE.LessDepth}
      roughness={0.5}
      metalness={0.05}
    />
  )

  if (translucent) {
    return (
      <>
        <mesh geometry={geom} renderOrder={0} raycast={() => null}>
          <meshBasicMaterial colorWrite={false} />
        </mesh>
        <mesh geometry={geom} renderOrder={1} raycast={() => null}>
          {colorMaterial}
        </mesh>
      </>
    )
  }

  return (
    <mesh geometry={geom} onClick={handleClick}>
      {colorMaterial}
    </mesh>
  )
}

const BATCH_SIZE = 10

function SceneContent() {
  const segments = useSharedStore((s) => s.segments)
  const groups = useSharedStore((s) => s.groups)
  const modelRotation = useSharedStore((s) => s.modelRotation)
  const pendingSegmentIds = useGroupStore((s) => s.pendingSegmentIds)
  const togglePendingSegment = useGroupStore((s) => s.togglePendingSegment)
  const selectionMode = useGroupStore((s) => s.selectionMode)
  const sphere = useGroupStore((s) => s.sphere)
  const setSphere = useGroupStore((s) => s.setSphere)
  const translucent = selectionMode === 'node'

  const [renderCount, setRenderCount] = useState(0)

  useEffect(() => {
    if (segments.length === 0) { setRenderCount(0); return }
    let count = 0
    let raf: number
    function addBatch() {
      count = Math.min(count + BATCH_SIZE, segments.length)
      setRenderCount(count)
      if (count < segments.length) raf = requestAnimationFrame(addBatch)
    }
    raf = requestAnimationFrame(addBatch)
    return () => cancelAnimationFrame(raf)
  }, [segments])

  const visibleSegments = segments.slice(0, renderCount)

  const assignedMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of groups) {
      for (const sid of g.segmentIds) {
        map.set(sid, g.color)
      }
    }
    return map
  }, [groups])

  const anyPending = pendingSegmentIds.length > 0

  return (
    <>
      {selectionMode === 'sphere' && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            setSphere({ x: e.point.x, y: e.point.y, z: e.point.z, radius: sphere?.radius ?? 2.0 })
          }}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <group rotation={modelRotation}>
        {visibleSegments.map((seg) => (
          <SegmentMesh
            key={seg.id}
            seg={seg}
            isPending={pendingSegmentIds.includes(seg.id)}
            groupColor={assignedMap.get(seg.id) ?? null}
            dimmed={anyPending && !pendingSegmentIds.includes(seg.id) && !assignedMap.has(seg.id)}
            translucent={translucent}
            onClick={() => togglePendingSegment(seg.id)}
          />
        ))}
        <NodeOverlay />
      </group>
      {selectionMode === 'sphere' && sphere !== null && <SphereSelector />}
    </>
  )
}

export function GroupScene() {
  const cameraPreset = useGroupStore((s) => s.cameraPreset)
  const setCameraPreset = useGroupStore((s) => s.setCameraPreset)

  return (
    <StudioCanvas>
      <SceneContent />
      <CameraController preset={cameraPreset} onConsumed={() => setCameraPreset(null)} />
    </StudioCanvas>
  )
}
