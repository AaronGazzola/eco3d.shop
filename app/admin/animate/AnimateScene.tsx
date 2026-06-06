'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore } from './animateStore'
import { CameraController, StudioCanvas } from '../_lib/StudioCanvas'
import { CameraPreset, ModelConfigRow } from '../_lib/types'
import { AnimatedModel } from '@/app/game/AnimatedModel'

// Dev/observation hook: lets the headless observation harness (scripts/observe-swim.mjs) drive the
// studio deterministically — set camera angle, start/stop the sim, toggle drag, tune the CPG, and
// read live diagnostics — without scraping the DOM. Admin-studio only; see documentation/observation-loop.md.
function useStudioObservationHook() {
  useEffect(() => {
    const w = window as unknown as { __studio?: Record<string, unknown> }
    const store = useAnimateStore.getState
    w.__studio = {
      setCam: (p: CameraPreset) => store().setCameraPreset(p),
      drive: (on = true) => store().setCoupledRunning(on),
      drag: (on: boolean) => store().setEnvironmentEnabled(on),
      tune: (drive: number, exc: number) => { store().setCpgDrive(drive); store().setCpgExcitability(exc) },
      muscle: (alpha: number, beta: number, damping: number) => { store().setMuscleAlpha(alpha); store().setMuscleBeta(beta); store().setMuscleDamping(damping) },
      planar: (on: boolean) => store().setPlanarConstraint(on),
      record: (on: boolean) => store().setSimRecording(on),
      diag: () => store().simDiagnostics,
    }
    return () => { delete (w as { __studio?: unknown }).__studio }
  }, [])
}

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
      <AnimatedModel
        modelConfig={modelConfig}
        segments={segments}
        showNodes
        opacity={modelOpacity}
        rootRef={rootRef}
      />
    </group>
  )
}

export function AnimateScene() {
  const cameraPreset = useAnimateStore((s) => s.cameraPreset)
  const setCameraPreset = useAnimateStore((s) => s.setCameraPreset)
  useStudioObservationHook()

  return (
    <StudioCanvas>
      <SceneContent />
      <CameraController preset={cameraPreset} onConsumed={() => setCameraPreset(null)} />
    </StudioCanvas>
  )
}
