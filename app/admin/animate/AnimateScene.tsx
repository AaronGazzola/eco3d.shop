'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore, pickSimConfig, SimConfig } from './animateStore'
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
      front: (segments: number, drive: number) => { store().setFrontSegments(segments); store().setFrontDrive(drive) },
      turn: (bias: number) => store().setTurnBias(bias),
      muscle: (alpha: number, beta: number, damping: number) => { store().setMuscleAlpha(alpha); store().setMuscleBeta(beta); store().setMuscleDamping(damping) },
      friction: (body: number, leg: number) => { store().setBodyFriction(body); store().setLegFriction(leg) },
      gravity: (on: boolean) => store().setGravityEnabled(on),
      legs: (on: boolean) => store().setLandLegsEnabled(on),
      ground: (on: boolean) => store().setLandGroundEnabled(on),
      limbcpg: (on: boolean) => store().setLimbCpgEnabled(on),
      lock: (on: boolean) => store().setLegsLocked(on),
      grip: (on: boolean, shift?: number, duration?: number) => {
        store().setGripEnabled(on)
        if (shift != null) store().setGripShift(shift)
        if (duration != null) store().setGripDuration(duration)
      },
      // Drive the step controller — needed by the observation harness because the default
      // sweepAmount=0 silences the controller (horizontal-hold baseline). Set sweep>0 + grip>0 to
      // see the actual walking sweep and physical foot-plant.
      step: (on: boolean, sweep?: number, lift?: number) => {
        store().setStepEnabled(on)
        if (sweep != null) store().setSweepAmount(sweep)
        if (lift != null) store().setLiftAmount(lift)
      },
      glow: (on: boolean) => store().setGripGlowEnabled(on),
      gripFoot: (foot: 'FL' | 'FR' | 'BL' | 'BR', on: boolean) => store().setGripFoot(foot, on),
      record: (on: boolean) => store().setSimRecording(on),
      diag: () => store().simDiagnostics,
      // Total config control for the observation harness: read the full sim config, or apply any
      // subset of it. applySimConfig only writes keys that exist in SimConfig, so the underlying
      // simulation logic is preserved — only its tunable parameters change.
      getConfig: () => pickSimConfig(store() as unknown as SimConfig),
      apply: (partial: Partial<SimConfig>) => store().applySimConfig(partial),
      // Node-position capture: buffer every body's world (x,y,z) at a target rate while the sim runs.
      // Mirrors the gripCapture mechanism. The frame loop (useLocomotion) fills the buffer and stamps
      // __nodeCaptureSpec (groupIds, segment lengths) on first sample.
      nodeCaptureStart: (opts?: { hz?: number; maxSamples?: number; events?: boolean; eventSnapshots?: boolean }) => {
        ;(window as Window).__nodeCaptureSpec = undefined
        ;(window as Window).__nodeCapture = {
          active: true,
          hz: opts?.hz ?? 4,
          buffer: [],
          startWallTime: performance.now(),
          lastSampleTime: -Infinity,
          maxSamples: opts?.maxSamples ?? 8000,
          events: opts?.events ?? false,
          eventSnapshots: opts?.eventSnapshots ?? false,
          eventBuffer: [],
        }
      },
      nodeCaptureStop: () => {
        const c = (window as Window).__nodeCapture
        ;(window as Window).__nodeCapture = undefined
        return {
          samples: c?.buffer ?? [],
          events: c?.eventBuffer ?? [],
          spec: (window as Window).__nodeCaptureSpec ?? null,
        }
      },
      gripCaptureStart: (maxSamples?: number) => {
        ;(window as Window).__gripCapture = {
          active: true,
          buffer: [],
          startWallTime: performance.now(),
          maxSamples: maxSamples ?? 4000,
        }
      },
      gripCaptureStop: () => {
        const c = (window as Window).__gripCapture
        const out = c?.buffer ?? []
        ;(window as Window).__gripCapture = undefined
        return {
          samples: out,
          gripShift: store().gripShift,
          gripDuration: store().gripDuration,
          gripEnabled: store().gripEnabled,
          gripFeet: store().gripFeet,
        }
      },
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
