'use client'

import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useStudioStore } from './page.stores'
import { SegmentData } from './page.types'

function SegmentMesh({ seg, selected, onClick }: { seg: SegmentData; selected: boolean; onClick: () => void }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(seg.positions, 3))
    g.computeVertexNormals()
    return g
  }, [seg.positions])

  return (
    <mesh geometry={geom} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <meshStandardMaterial
        color={selected ? '#ffffff' : seg.color}
        emissive={selected ? seg.color : '#000000'}
        emissiveIntensity={selected ? 0.4 : 0}
      />
    </mesh>
  )
}

function SceneContent() {
  const { segments, selectedSegmentId, setSelectedSegmentId } = useStudioStore()

  return (
    <>
      <Grid
        position={[0, 0.001, 0]}
        args={[100, 100]}
        cellSize={1}
        cellColor="#1e1e1e"
        sectionSize={5}
        sectionColor="#2e2e2e"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid
      />
      {segments.map((seg) => (
        <SegmentMesh
          key={seg.id}
          seg={seg}
          selected={seg.id === selectedSegmentId}
          onClick={() => setSelectedSegmentId(seg.id === selectedSegmentId ? null : seg.id)}
        />
      ))}
    </>
  )
}

export function StudioScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, 16], fov: 50 }}
      style={{ background: '#080808', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 12, 8]} intensity={1.0} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.3} color="#ffffff" />
      <OrbitControls
        makeDefault
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
      <SceneContent />
    </Canvas>
  )
}
