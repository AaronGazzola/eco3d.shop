'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore } from './animateStore'
import { CameraController, StudioCanvas } from '../_lib/StudioCanvas'
import { ModelConfigRow } from '../_lib/types'
import { AnimatedModel } from '@/app/game/AnimatedModel'
import { getRecording } from '@/app/game/locomotion/diagnostics'

function AttractorMarker({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y + 0.02, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} depthTest={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color="#22d3ee" depthTest={false} />
      </mesh>
    </group>
  )
}

function SceneContent() {
  const segments = useSharedStore((s) => s.segments)
  const groups = useSharedStore((s) => s.groups)
  const stlKey = useSharedStore((s) => s.stlKey)
  const configId = useSharedStore((s) => s.configId)
  const configName = useSharedStore((s) => s.configName)
  const modelRotation = useSharedStore((s) => s.modelRotation)
  const liveAttractor = useAnimateStore((s) => s.attractor)
  const setAttractor = useAnimateStore((s) => s.setAttractor)
  const modelOpacity = useAnimateStore((s) => s.modelOpacity)
  const playback = useAnimateStore((s) => s.playback)

  let attractor = liveAttractor
  if (playback.active) {
    const frames = getRecording()
    if (frames.length > 0) {
      const idx = Math.min(Math.max(0, playback.frameIndex), frames.length - 1)
      attractor = frames[idx].attractor
    }
  }

  const modelConfig = useMemo<ModelConfigRow>(
    () => ({
      id: configId ?? 'studio-preview',
      stl_key: stlKey ?? '',
      name: configName || 'preview',
      groups,
      model_rotation: modelRotation,
      created_at: new Date().toISOString(),
    }),
    [configId, stlKey, configName, groups, modelRotation]
  )

  if (groups.length === 0 || segments.length === 0) return null

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          if (playback.active) return
          setAttractor({ x: e.point.x, y: 0, z: e.point.z })
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
      <group rotation={modelRotation}>
        <AnimatedModel
          modelConfig={modelConfig}
          segments={segments}
          showNodes
          opacity={modelOpacity}
        />
      </group>
      {attractor && <AttractorMarker x={attractor.x} y={attractor.y} z={attractor.z} />}
    </>
  )
}

export function AnimateScene() {
  const cameraPreset = useAnimateStore((s) => s.cameraPreset)
  const setCameraPreset = useAnimateStore((s) => s.setCameraPreset)

  return (
    <StudioCanvas>
      <SceneContent />
      <CameraController preset={cameraPreset} onConsumed={() => setCameraPreset(null)} />
    </StudioCanvas>
  )
}
