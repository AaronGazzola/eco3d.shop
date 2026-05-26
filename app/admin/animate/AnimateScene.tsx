'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore } from './animateStore'
import { CameraController, StudioCanvas } from '../_lib/StudioCanvas'
import { ModelConfigRow } from '../_lib/types'
import { AnimatedModel } from '@/app/game/AnimatedModel'

function SceneContent() {
  const segments = useSharedStore((s) => s.segments)
  const groups = useSharedStore((s) => s.groups)
  const stlKey = useSharedStore((s) => s.stlKey)
  const configId = useSharedStore((s) => s.configId)
  const configName = useSharedStore((s) => s.configName)
  const modelRotation = useSharedStore((s) => s.modelRotation)
  const modelOpacity = useAnimateStore((s) => s.modelOpacity)
  const rootRef = useRef<THREE.Group | null>(null)

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
    <group rotation={modelRotation}>
      <group ref={rootRef}>
        <AnimatedModel
          modelConfig={modelConfig}
          segments={segments}
          showNodes
          opacity={modelOpacity}
          rootRef={rootRef}
        />
      </group>
    </group>
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
