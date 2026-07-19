'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CameraPreset } from '../_lib/types'

export type AnimateTab = 'simulate' | 'calibrate'

export type GripFoot = 'FL' | 'FR' | 'BL' | 'BR'

export interface ManualPose {
  rootX: number
  rootZ: number
  rootYawRad: number
  jointAnglesRad: Record<string, number>
}

export interface SimDiagnostics {
  kineticEnergy: number
  comX: number
  comZ: number
  comDriftFromStart: number
  maxJointFracOfCap: number
  comYDrift: number
  maxTiltDeg: number
}

export interface SimConfig {
  gravityEnabled: boolean
  landLegsEnabled: boolean
  landGroundEnabled: boolean
  limbCpgEnabled: boolean
  legsLocked: boolean
  environmentEnabled: boolean
  cpgDrive: number
  cpgExcitability: number
  frontDrive: number
  frontSegments: number
  turnBias: number
  limbDrive: number
  feedbackIpsi: number
  feedbackContra: number
  muscleAlpha: number
  muscleBeta: number
  muscleDamping: number
  bodyFriction: number
  legFriction: number
  gripEnabled: boolean
  gripClockCpg: boolean
  gripShift: number
  gripDuration: number
  gripSoftness: number
  gripSlideAxis: boolean
  girdleBoost: number
  releaseFriction: number
  gripGlowEnabled: boolean
  gripFeet: Record<GripFoot, boolean>
  stepEnabled: boolean
  stepFeet: Record<GripFoot, boolean>
  sweepAmount: number
  sweepSpeed: number
  liftAmount: number
  legStiffness: number
  legDamping: number
  // Physics engine for the coupled sim: 'rapier' (default, the maximal-coordinate path) or 'mujoco'
  // (the reduced-coordinate servo engine — MuJoCo-WASM built from the node skeleton). Additive and
  // defaulted so existing configs/links are unchanged.
  simEngine: SimEngine
}

export type SimEngine = 'rapier' | 'mujoco'

export const DEFAULT_SIM_CONFIG: SimConfig = {
  gravityEnabled: true,
  landLegsEnabled: true,
  landGroundEnabled: true,
  limbCpgEnabled: true,
  legsLocked: true,
  environmentEnabled: false,
  cpgDrive: 1.87,
  cpgExcitability: 0.24,
  frontDrive: 0.6,
  frontSegments: 0,
  turnBias: 0,
  limbDrive: 0,
  feedbackIpsi: 0,
  feedbackContra: 0,
  muscleAlpha: 3.95,
  muscleBeta: 13.3,
  muscleDamping: 11.3,
  bodyFriction: 0.05,
  legFriction: 0.05,
  gripEnabled: true,
  gripClockCpg: true,
  gripShift: 0.05,
  gripDuration: 0.5,
  gripSoftness: 0,
  gripSlideAxis: false,
  girdleBoost: 0,
  releaseFriction: 0,
  gripGlowEnabled: true,
  gripFeet: { FL: true, FR: true, BL: true, BR: true },
  stepEnabled: true,
  stepFeet: { FL: true, FR: true, BL: true, BR: true },
  sweepAmount: 0,
  sweepSpeed: 3000,
  liftAmount: 0.3,
  legStiffness: 3000,
  legDamping: 120,
  simEngine: 'rapier',
}

export const SIM_CONFIG_STORAGE_KEY = 'eco3d-animate-sim-config'

export const OVERLAY_NAMES = ['wave', 'stance'] as const
export type OverlayName = (typeof OVERLAY_NAMES)[number]

export function encodeSimConfig(config: SimConfig): string {
  const json = JSON.stringify(config)
  if (typeof btoa !== 'undefined') return btoa(json)
  return Buffer.from(json, 'utf8').toString('base64')
}

export function decodeSimConfig(str: string): Partial<SimConfig> {
  try {
    const json = typeof atob !== 'undefined' ? atob(str) : Buffer.from(str, 'base64').toString('utf8')
    const obj = JSON.parse(json)
    return obj && typeof obj === 'object' ? (obj as Partial<SimConfig>) : {}
  } catch (err) {
    console.error('decodeSimConfig failed', err)
    return {}
  }
}

export function pickSimConfig(s: SimConfig): SimConfig {
  return {
    gravityEnabled: s.gravityEnabled,
    landLegsEnabled: s.landLegsEnabled,
    landGroundEnabled: s.landGroundEnabled,
    limbCpgEnabled: s.limbCpgEnabled,
    legsLocked: s.legsLocked,
    environmentEnabled: s.environmentEnabled,
    cpgDrive: s.cpgDrive,
    cpgExcitability: s.cpgExcitability,
    frontDrive: s.frontDrive,
    frontSegments: s.frontSegments,
    turnBias: s.turnBias,
    limbDrive: s.limbDrive,
    feedbackIpsi: s.feedbackIpsi,
    feedbackContra: s.feedbackContra,
    muscleAlpha: s.muscleAlpha,
    muscleBeta: s.muscleBeta,
    muscleDamping: s.muscleDamping,
    bodyFriction: s.bodyFriction,
    legFriction: s.legFriction,
    gripEnabled: s.gripEnabled,
    gripClockCpg: s.gripClockCpg,
    gripShift: s.gripShift,
    gripDuration: s.gripDuration,
    gripSoftness: s.gripSoftness,
    gripSlideAxis: s.gripSlideAxis,
    girdleBoost: s.girdleBoost,
    releaseFriction: s.releaseFriction,
    gripGlowEnabled: s.gripGlowEnabled,
    gripFeet: { ...s.gripFeet },
    stepEnabled: s.stepEnabled,
    stepFeet: { ...s.stepFeet },
    sweepAmount: s.sweepAmount,
    sweepSpeed: s.sweepSpeed,
    liftAmount: s.liftAmount,
    legStiffness: s.legStiffness,
    legDamping: s.legDamping,
    simEngine: s.simEngine,
  }
}

interface AnimateStore extends SimConfig {
  animateTab: AnimateTab
  calibratingGroupId: string | null
  calibratingYaw: number
  calibratingPitch: number
  legPairMirroredOverrides: Record<string, boolean>
  cameraPreset: CameraPreset | null
  modelOpacity: number
  manualPose: ManualPose
  simDiagnostics: SimDiagnostics
  simRecording: boolean
  lastCapturePath: string | null
  coupledRunning: boolean

  frozen: boolean
  simTime: number
  playSpeed: number
  overlays: string[]
  isolateLimb: string | null
  stepRequest: number

  setFrozen: (v: boolean) => void
  setSimTime: (t: number) => void
  setPlaySpeed: (v: number) => void
  setOverlays: (names: string[]) => void
  toggleOverlay: (name: string) => void
  setIsolateLimb: (id: string | null) => void
  requestStep: (n: number) => void
  consumeStepRequest: () => number

  setAnimateTab: (tab: AnimateTab) => void
  setCalibratingGroup: (id: string | null) => void
  setCalibratingYaw: (yaw: number) => void
  setCalibratingPitch: (pitch: number) => void
  setLegPairMirrored: (pairKey: string, mirrored: boolean) => void
  setCameraPreset: (preset: CameraPreset | null) => void
  setModelOpacity: (opacity: number) => void
  setManualPoseRootX: (x: number) => void
  setManualPoseRootZ: (z: number) => void
  setManualPoseRootYaw: (rad: number) => void
  setManualPoseJointAngle: (groupId: string, rad: number) => void
  resetManualPose: () => void
  setSimDiagnostics: (d: SimDiagnostics) => void
  setSimRecording: (recording: boolean) => void
  setLastCapturePath: (path: string | null) => void
  setCpgDrive: (v: number) => void
  setCpgExcitability: (v: number) => void
  setFrontDrive: (v: number) => void
  setFrontSegments: (v: number) => void
  setTurnBias: (v: number) => void
  setLimbDrive: (v: number) => void
  setFeedbackIpsi: (v: number) => void
  setFeedbackContra: (v: number) => void
  setCoupledRunning: (v: boolean) => void
  setEnvironmentEnabled: (v: boolean) => void
  setMuscleAlpha: (v: number) => void
  setMuscleBeta: (v: number) => void
  setMuscleDamping: (v: number) => void
  setBodyFriction: (v: number) => void
  setLegFriction: (v: number) => void
  setGravityEnabled: (v: boolean) => void
  setLandLegsEnabled: (v: boolean) => void
  setLandGroundEnabled: (v: boolean) => void
  setLimbCpgEnabled: (v: boolean) => void
  setLegsLocked: (v: boolean) => void
  setGripEnabled: (v: boolean) => void
  setGripShift: (v: number) => void
  setGripDuration: (v: number) => void
  setGripSoftness: (v: number) => void
  setGripSlideAxis: (v: boolean) => void
  setGirdleBoost: (v: number) => void
  setReleaseFriction: (v: number) => void
  setGripGlowEnabled: (v: boolean) => void
  setGripFoot: (foot: GripFoot, on: boolean) => void
  setStepEnabled: (v: boolean) => void
  setStepFoot: (foot: GripFoot, on: boolean) => void
  setSweepAmount: (v: number) => void
  setSweepSpeed: (v: number) => void
  setLiftAmount: (v: number) => void
  setLegStiffness: (v: number) => void
  setLegDamping: (v: number) => void
  setSimEngine: (v: SimEngine) => void
  resetSimConfig: () => void
  applySimConfig: (partial: Partial<SimConfig>) => void
}

export const useAnimateStore = create<AnimateStore>()(
  persist(
    (set, get) => ({
      animateTab: 'simulate',
      calibratingGroupId: null,
      calibratingYaw: 0,
      calibratingPitch: 0,
      legPairMirroredOverrides: {},
      cameraPreset: null,
      modelOpacity: 1,
      manualPose: { rootX: 0, rootZ: 0, rootYawRad: 0, jointAnglesRad: {} },
      simDiagnostics: { kineticEnergy: 0, comX: 0, comZ: 0, comDriftFromStart: 0, maxJointFracOfCap: 0, comYDrift: 0, maxTiltDeg: 0 },
      simRecording: false,
      lastCapturePath: null,
      coupledRunning: false,
      frozen: false,
      simTime: 0,
      playSpeed: 1,
      overlays: [],
      isolateLimb: null,
      stepRequest: 0,
      ...DEFAULT_SIM_CONFIG,

      setFrozen: (v) => set({ frozen: v }),
      setSimTime: (t) => set({ simTime: t }),
      setPlaySpeed: (v) => set({ playSpeed: Math.max(0.1, Math.min(1, v)) }),
      setOverlays: (names) => set({ overlays: [...names] }),
      toggleOverlay: (name) =>
        set((state) => ({
          overlays: state.overlays.includes(name)
            ? state.overlays.filter((n) => n !== name)
            : [...state.overlays, name],
        })),
      setIsolateLimb: (id) => set({ isolateLimb: id }),
      requestStep: (n) => set((state) => ({ stepRequest: state.stepRequest + n })),
      consumeStepRequest: () => {
        const n = get().stepRequest
        if (n !== 0) set({ stepRequest: 0 })
        return n
      },

      setAnimateTab: (tab) => {
        if (tab === 'simulate') {
          set({ animateTab: tab, calibratingGroupId: null, calibratingYaw: 0, calibratingPitch: 0 })
        } else {
          set({ animateTab: tab, simRecording: false, coupledRunning: false })
        }
      },

      setCalibratingGroup: (id) =>
        set({ calibratingGroupId: id, calibratingYaw: 0, calibratingPitch: 0 }),

      setCalibratingYaw: (yaw) => set({ calibratingYaw: yaw }),

      setCalibratingPitch: (pitch) => set({ calibratingPitch: pitch }),

      setLegPairMirrored: (pairKey, mirrored) =>
        set((state) => ({
          legPairMirroredOverrides: { ...state.legPairMirroredOverrides, [pairKey]: mirrored },
        })),

      setCameraPreset: (preset) => set({ cameraPreset: preset }),

      setModelOpacity: (opacity) => set({ modelOpacity: Math.max(0, Math.min(1, opacity)) }),

      setManualPoseRootX: (x) =>
        set((state) => ({ manualPose: { ...state.manualPose, rootX: x } })),

      setManualPoseRootZ: (z) =>
        set((state) => ({ manualPose: { ...state.manualPose, rootZ: z } })),

      setManualPoseRootYaw: (rad) =>
        set((state) => ({ manualPose: { ...state.manualPose, rootYawRad: rad } })),

      setManualPoseJointAngle: (groupId, rad) =>
        set((state) => ({
          manualPose: {
            ...state.manualPose,
            jointAnglesRad: { ...state.manualPose.jointAnglesRad, [groupId]: rad },
          },
        })),

      resetManualPose: () =>
        set({ manualPose: { rootX: 0, rootZ: 0, rootYawRad: 0, jointAnglesRad: {} } }),

      setSimDiagnostics: (d) => set({ simDiagnostics: d }),

      setSimRecording: (recording) =>
        set(recording ? { simRecording: true, lastCapturePath: null } : { simRecording: false }),

      setLastCapturePath: (path) => set({ lastCapturePath: path }),

      setCpgDrive: (v) => set({ cpgDrive: v }),

      setCpgExcitability: (v) => set({ cpgExcitability: v }),

      setFrontDrive: (v) => set({ frontDrive: v }),

      setFrontSegments: (v) => set({ frontSegments: Math.max(0, Math.round(v)) }),

      setTurnBias: (v) => set({ turnBias: Math.max(-1, Math.min(1, v)) }),

      setLimbDrive: (v) => set({ limbDrive: Math.max(0, v) }),

      setFeedbackIpsi: (v) => set({ feedbackIpsi: v }),
      setFeedbackContra: (v) => set({ feedbackContra: v }),

      setCoupledRunning: (v) =>
        set(v ? { coupledRunning: true, frozen: false, simTime: 0, stepRequest: 0 } : { coupledRunning: false }),

      setEnvironmentEnabled: (v) => set({ environmentEnabled: v }),

      setMuscleAlpha: (v) => set({ muscleAlpha: v }),
      setMuscleBeta: (v) => set({ muscleBeta: v }),
      setMuscleDamping: (v) => set({ muscleDamping: v }),
      setBodyFriction: (v) => set({ bodyFriction: v }),
      setLegFriction: (v) => set({ legFriction: v }),
      setGravityEnabled: (v) => set({ gravityEnabled: v }),
      setLandLegsEnabled: (v) => set({ landLegsEnabled: v }),
      setLandGroundEnabled: (v) => set({ landGroundEnabled: v }),
      setLimbCpgEnabled: (v) => set({ limbCpgEnabled: v }),
      setLegsLocked: (v) => set({ legsLocked: v }),
      setGripEnabled: (v) => set({ gripEnabled: v }),
      setGripShift: (v) => set({ gripShift: v }),
      setGripDuration: (v) => set({ gripDuration: v }),
      setGripSoftness: (v) => set({ gripSoftness: v }),
      setGripSlideAxis: (v) => set({ gripSlideAxis: v }),
      setGirdleBoost: (v) => set({ girdleBoost: v }),
      setReleaseFriction: (v) => set({ releaseFriction: v }),
      setGripGlowEnabled: (v) => set({ gripGlowEnabled: v }),
      setGripFoot: (foot, on) =>
        set((state) => ({ gripFeet: { ...state.gripFeet, [foot]: on } })),
      setStepEnabled: (v) => set({ stepEnabled: v }),
      setStepFoot: (foot, on) =>
        set((state) => ({ stepFeet: { ...state.stepFeet, [foot]: on } })),
      setSweepAmount: (v) => set({ sweepAmount: v }),
      setSweepSpeed: (v) => set({ sweepSpeed: v }),
      setLiftAmount: (v) => set({ liftAmount: v }),
      setLegStiffness: (v) => set({ legStiffness: v }),
      setLegDamping: (v) => set({ legDamping: v }),
      setSimEngine: (v) => set({ simEngine: v }),
      resetSimConfig: () =>
        set({
          ...DEFAULT_SIM_CONFIG,
          gripFeet: { ...DEFAULT_SIM_CONFIG.gripFeet },
          stepFeet: { ...DEFAULT_SIM_CONFIG.stepFeet },
        }),
      applySimConfig: (partial) => {
        const keys = Object.keys(DEFAULT_SIM_CONFIG) as Array<keyof SimConfig>
        const next: Partial<SimConfig> = {}
        for (const k of keys) {
          if (k in partial) (next as Record<string, unknown>)[k] = (partial as Record<string, unknown>)[k]
        }
        if (next.gripFeet) next.gripFeet = { ...next.gripFeet }
        if (next.stepFeet) next.stepFeet = { ...next.stepFeet }
        set(next as Partial<AnimateStore>)
      },
    }),
    {
      name: SIM_CONFIG_STORAGE_KEY,
      version: 1,
      skipHydration: true,
      partialize: (s) => pickSimConfig(s),
    }
  )
)
