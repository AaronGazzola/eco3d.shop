'use client'

import { useMemo, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
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
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(seg.positions, 3))
    g.computeVertexNormals()
    return g
  }, [seg.positions])

  if (isPending) {
    return (
      <mesh geometry={geom} onClick={(e) => { e.stopPropagation(); onClick() }}>
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
      <mesh geometry={geom} onClick={(e) => { e.stopPropagation(); onClick() }}>
        <meshStandardMaterial color={groupColor} roughness={0.4} metalness={0.05} />
      </mesh>
    )
  }

  return (
    <mesh geometry={geom} onClick={(e) => { e.stopPropagation(); onClick() }}>
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
  const { segments, pendingSegmentIds, groups, togglePendingSegment, modelRotation } = useStudioStore()

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
