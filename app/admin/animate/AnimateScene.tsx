'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore, pickSimConfig, SimConfig, encodeSimConfig } from './animateStore'
import { findSimPreset } from './simPresets'
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
      // Apply a full/partial SimConfig in one call (used by the observation harness to load a named
      // preset without setting every knob individually). Only known SimConfig keys are written.
      applyConfig: (config: Record<string, unknown>) => store().applySimConfig(config),
      // Apply a named preset from app/admin/animate/simPresets.ts. Returns true if the name matched.
      preset: (name: string) => {
        const p = findSimPreset(name)
        if (!p) return false
        store().applySimConfig(p.config)
        return true
      },
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
      // Playback control (Increment A): freeze-frame, slow-motion, and forward single-stepping. `frozen`
      // halts sim advance while the render keeps drawing the held frame; `speed` scales slow-motion;
      // `step(n)` injects n exact fixed ticks (forward only in Increment A). All are pure view-state
      // changes — no physics is mutated here.
      pause: () => store().setFrozen(true),
      play: () => store().setFrozen(false),
      // Forward single-step by N fixed ticks (named frameStep to avoid the existing `step` locomotion
      // controller above). Freezes first so the stepped frame holds.
      frameStep: (n = 1) => { store().setFrozen(true); store().requestStep(Math.max(0, Math.round(n))) },
      speed: (x: number) => store().setPlaySpeed(x),
      getSimTime: () => store().simTime,
      // Overlay view-state (drawn by the overlay layer in Increment B): names is a subset of
      // OVERLAY_NAMES; isolateLimb dims all but the named limb.
      setOverlays: (names: string[]) => store().setOverlays(Array.isArray(names) ? names : []),
      isolateLimb: (id: string | null) => store().setIsolateLimb(id),
      // Build a shareable link that reproduces the current config + tab + overlays.
      buildLink: () => {
        const st = store()
        const params = new URLSearchParams()
        params.set('tab', st.animateTab)
        params.set('sim', encodeSimConfig(pickSimConfig(st as unknown as SimConfig)))
        if (st.overlays.length > 0) params.set('overlay', st.overlays.join(','))
        const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
        return `${base}?${params.toString()}`
      },
      copyLink: () => {
        const w2 = window as unknown as { __studio?: { buildLink?: () => string } }
        const link = w2.__studio?.buildLink?.() ?? ''
        if (link && typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(link).catch((err) => console.error(err))
        return link
      },
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
          reach: c?.reachAccum ?? null,
          reachLegs: c?.reachLegs ?? null,
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

// Read-only overlay layer (Increment B). Reads window.__locObs each frame (published by useLocomotion)
// and positions a small pool of marker meshes — no physics is touched. `stance` paints each foot green
// (grip/power-stroke) or red (swing); `wave` marks each girdle's max-forward-reach point, hue by phase.
// `isolateLimb` (handled together with body-ghosting in SceneContent) shows only the selected limb.
const MAX_OVERLAY_LEGS = 4
function LocomotionOverlays() {
  const footRefs = useRef<(THREE.Mesh | null)[]>([])
  const reachRefs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const st = useAnimateStore.getState()
    const obs = (window as Window).__locObs
    const showStance = st.overlays.includes('stance')
    const showWave = st.overlays.includes('wave')
    const iso = st.isolateLimb
    for (let i = 0; i < MAX_OVERLAY_LEGS; i++) {
      const footM = footRefs.current[i]
      const reachM = reachRefs.current[i]
      const has = !!obs && i < obs.legs.length
      const legShown = has && (!iso || obs!.legs[i] === iso)
      if (footM) {
        if (legShown && showStance) {
          const f = obs!.foot[i]
          footM.position.set(f.x, f.y, f.z)
          ;(footM.material as THREE.MeshBasicMaterial).color.set(obs!.stance[i] ? '#22c55e' : '#ef4444')
          footM.visible = true
        } else footM.visible = false
      }
      if (reachM) {
        if (legShown && showWave) {
          const r = obs!.reach[i]
          reachM.position.set(r.x, r.y, r.z)
          ;(reachM.material as THREE.MeshBasicMaterial).color.setHSL(((obs!.phase[i] % 1) + 1) % 1, 0.9, 0.6)
          reachM.visible = true
        } else reachM.visible = false
      }
    }
  })
  return (
    <>
      {Array.from({ length: MAX_OVERLAY_LEGS }).map((_, i) => (
        <mesh key={`foot-${i}`} ref={(m) => { footRefs.current[i] = m }} visible={false}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#22c55e" toneMapped={false} depthTest={false} transparent opacity={0.9} />
        </mesh>
      ))}
      {Array.from({ length: MAX_OVERLAY_LEGS }).map((_, i) => (
        <mesh key={`reach-${i}`} ref={(m) => { reachRefs.current[i] = m }} visible={false}>
          <octahedronGeometry args={[0.42, 0]} />
          <meshBasicMaterial color="#00e5ff" toneMapped={false} depthTest={false} transparent opacity={0.9} />
        </mesh>
      ))}
    </>
  )
}

function SceneContent() {
  const segments = useSharedStore((s) => s.segments)
  const groups = useSharedStore((s) => s.groups)
  const stlKey = useSharedStore((s) => s.stlKey)
  const configId = useSharedStore((s) => s.configId)
  const configName = useSharedStore((s) => s.configName)
  const modelRotation = useSharedStore((s) => s.modelRotation)
  const modelOpacity = useAnimateStore((s) => s.modelOpacity)
  const isolateLimb = useAnimateStore((s) => s.isolateLimb)
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
        opacity={isolateLimb ? 0.12 : modelOpacity}
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
      <LocomotionOverlays />
      <CameraController preset={cameraPreset} onConsumed={() => setCameraPreset(null)} />
    </StudioCanvas>
  )
}
