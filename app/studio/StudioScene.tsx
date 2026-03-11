'use client'

import { useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStudioStore } from './page.stores'
import { SegmentData } from './page.types'
import { NodeOverlay } from './NodeOverlay'

const CAMERA_PRESETS = {
  reset: { pos: [0, 8, 16]    as [number, number, number], target: [0, 3, 0] as [number, number, number] },
  front: { pos: [0, 4, 22]    as [number, number, number], target: [0, 4, 0] as [number, number, number] },
  top:   { pos: [0, 30, 0.01] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  side:  { pos: [22, 4, 0]    as [number, number, number], target: [0, 4, 0] as [number, number, number] },
}

function CameraController() {
  const { cameraPreset, setCameraPreset } = useStudioStore()
  const { camera, controls } = useThree()

  useEffect(() => {
    if (!cameraPreset || !controls) return
    const oc = controls as unknown as { target: THREE.Vector3; update: () => void }
    const p = CAMERA_PRESETS[cameraPreset]
    camera.position.set(...p.pos)
    oc.target.set(...p.target)
    oc.update()
    setCameraPreset(null)
  }, [cameraPreset, camera, controls, setCameraPreset])

  return null
}

function SphereSelector() {
  const { sphere, setSphere } = useStudioStore()
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
    const s = useStudioStore.getState().sphere
    if (!s) return
    const { segments: segs, modelRotation: mr } = useStudioStore.getState()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...mr)).invert()
    const { x, y, z } = groupRef.current.position
    const localCenter = new THREE.Vector3(x, y, z).applyQuaternion(q)
    const r2 = s.radius * s.radius
    const matchingIds: string[] = []
    for (const seg of segs) {
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
      useStudioStore.getState().setPendingSegmentIds(matchingIds)
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
    const s = useStudioStore.getState().sphere
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
  onClick,
}: {
  seg: SegmentData
  isPending: boolean
  groupColor: string | null
  dimmed: boolean
  onClick: () => void
}) {
  const { selectionMode, sphere, setSphere } = useStudioStore()

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
    } else {
      onClick()
    }
  }, [selectionMode, sphere, setSphere, onClick])

  if (isPending) {
    return (
      <mesh geometry={geom} onClick={handleClick}>
        <meshStandardMaterial
          color={seg.color}
          emissive={seg.color}
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
    )
  }

  if (groupColor) {
    return (
      <mesh geometry={geom} onClick={handleClick}>
        <meshStandardMaterial color={groupColor} roughness={0.4} metalness={0.05} />
      </mesh>
    )
  }

  return (
    <mesh geometry={geom} onClick={handleClick}>
      <meshStandardMaterial
        color={seg.color}
        opacity={dimmed ? 0.35 : 1}
        transparent={dimmed}
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  )
}

function SceneContent() {
  const {
    segments, pendingSegmentIds, groups, togglePendingSegment, modelRotation,
    selectionMode, sphere, setSphere,
  } = useStudioStore()

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
      <Grid
        position={[0, 0.001, 0]}
        args={[100, 100]}
        cellSize={1}
        cellColor="#888888"
        sectionSize={5}
        sectionColor="#aaaaaa"
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
      />
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
        {segments.map((seg) => (
          <SegmentMesh
            key={seg.id}
            seg={seg}
            isPending={pendingSegmentIds.includes(seg.id)}
            groupColor={assignedMap.get(seg.id) ?? null}
            dimmed={anyPending && !pendingSegmentIds.includes(seg.id) && !assignedMap.has(seg.id)}
            onClick={() => togglePendingSegment(seg.id)}
          />
        ))}
        <NodeOverlay />
      </group>
      {selectionMode === 'sphere' && sphere !== null && <SphereSelector />}
    </>
  )
}

export function StudioScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, 16], fov: 50 }}
      style={{ background: '#4a4a4a', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 12, 8]} intensity={1.8} />
      <directionalLight position={[-5, 6, -8]} intensity={0.6} />
      <OrbitControls
        makeDefault
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
      <SceneContent />
      <CameraController />
    </Canvas>
  )
}
