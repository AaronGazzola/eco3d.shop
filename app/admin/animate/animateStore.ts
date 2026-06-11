'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CameraPreset } from '../_lib/types'

export type AnimateTab = 'simulate' | 'calibrate'

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
  muscleAlpha: number
  muscleBeta: number
  muscleDamping: number
  bodyFriction: number
  gripEnabled: boolean
  gripShift: number
  gripDuration: number
  gripStrength: number
  releaseFriction: number
  gripGlowEnabled: boolean
  gripLegs: 'front' | 'back' | 'both'
}

export const DEFAULT_SIM_CONFIG: SimConfig = {
  gravityEnabled: true,
  landLegsEnabled: true,
  landGroundEnabled: true,
  limbCpgEnabled: true,
  legsLocked: true,
  environmentEnabled: false,
  cpgDrive: 1.87,
  cpgExcitability: 0.24,
  muscleAlpha: 3.95,
  muscleBeta: 13.3,
  muscleDamping: 11.3,
  bodyFriction: 0.05,
  gripEnabled: true,
  gripShift: 0.27,
  gripDuration: 0.41,
  gripStrength: 0,
  releaseFriction: 0,
  gripGlowEnabled: true,
  gripLegs: 'both',
}

const SIM_CONFIG_STORAGE_KEY = 'eco3d-animate-sim-config'

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
    muscleAlpha: s.muscleAlpha,
    muscleBeta: s.muscleBeta,
    muscleDamping: s.muscleDamping,
    bodyFriction: s.bodyFriction,
    gripEnabled: s.gripEnabled,
    gripShift: s.gripShift,
    gripDuration: s.gripDuration,
    gripStrength: s.gripStrength,
    releaseFriction: s.releaseFriction,
    gripGlowEnabled: s.gripGlowEnabled,
    gripLegs: s.gripLegs,
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
  setCoupledRunning: (v: boolean) => void
  setEnvironmentEnabled: (v: boolean) => void
  setMuscleAlpha: (v: number) => void
  setMuscleBeta: (v: number) => void
  setMuscleDamping: (v: number) => void
  setBodyFriction: (v: number) => void
  setGravityEnabled: (v: boolean) => void
  setLandLegsEnabled: (v: boolean) => void
  setLandGroundEnabled: (v: boolean) => void
  setLimbCpgEnabled: (v: boolean) => void
  setLegsLocked: (v: boolean) => void
  setGripEnabled: (v: boolean) => void
  setGripShift: (v: number) => void
  setGripDuration: (v: number) => void
  setGripStrength: (v: number) => void
  setReleaseFriction: (v: number) => void
  setGripGlowEnabled: (v: boolean) => void
  setGripLegs: (v: 'front' | 'back' | 'both') => void
  resetSimConfig: () => void
}

export const useAnimateStore = create<AnimateStore>()(
  persist(
    (set) => ({
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
      ...DEFAULT_SIM_CONFIG,

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

      setCoupledRunning: (v) => set({ coupledRunning: v }),

      setEnvironmentEnabled: (v) => set({ environmentEnabled: v }),

      setMuscleAlpha: (v) => set({ muscleAlpha: v }),
      setMuscleBeta: (v) => set({ muscleBeta: v }),
      setMuscleDamping: (v) => set({ muscleDamping: v }),
      setBodyFriction: (v) => set({ bodyFriction: v }),
      setGravityEnabled: (v) => set({ gravityEnabled: v }),
      setLandLegsEnabled: (v) => set({ landLegsEnabled: v }),
      setLandGroundEnabled: (v) => set({ landGroundEnabled: v }),
      setLimbCpgEnabled: (v) => set({ limbCpgEnabled: v }),
      setLegsLocked: (v) => set({ legsLocked: v }),
      setGripEnabled: (v) => set({ gripEnabled: v }),
      setGripShift: (v) => set({ gripShift: v }),
      setGripDuration: (v) => set({ gripDuration: v }),
      setGripStrength: (v) => set({ gripStrength: v }),
      setReleaseFriction: (v) => set({ releaseFriction: v }),
      setGripGlowEnabled: (v) => set({ gripGlowEnabled: v }),
      setGripLegs: (v) => set({ gripLegs: v }),
      resetSimConfig: () => set({ ...DEFAULT_SIM_CONFIG }),
    }),
    {
      name: SIM_CONFIG_STORAGE_KEY,
      version: 1,
      skipHydration: true,
      partialize: (s) => pickSimConfig(s),
    }
  )
)
