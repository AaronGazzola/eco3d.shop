'use client'

import { ReactNode, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { CameraPreset } from './types'

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  reset: { pos: [0, 8, 16], target: [0, 3, 0] },
  front: { pos: [0, 4, 22], target: [0, 4, 0] },
  top: { pos: [0, 30, 0.01], target: [0, 0, 0] },
  side: { pos: [22, 4, 0], target: [0, 4, 0] },
}

export function CameraController({
  preset,
  onConsumed,
}: {
  preset: CameraPreset | null
  onConsumed: () => void
}) {
  const { camera, controls } = useThree()

  useEffect(() => {
    if (!preset || !controls) return
    const oc = controls as unknown as { target: THREE.Vector3; update: () => void }
    const p = CAMERA_PRESETS[preset]
    camera.position.set(...p.pos)
    oc.target.set(...p.target)
    oc.update()
    onConsumed()
  }, [preset, camera, controls, onConsumed])

  return null
}

export function StudioCanvas({ children }: { children: ReactNode }) {
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
      {children}
    </Canvas>
  )
}
