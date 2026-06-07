'use client'

import { create } from 'zustand'
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

interface AnimateStore {
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
  cpgDrive: number
  cpgExcitability: number
  cpgRunning: boolean
  cpgRecording: boolean
  coupledRunning: boolean
  environmentEnabled: boolean
  muscleAlpha: number
  muscleBeta: number
  muscleDamping: number
  planarConstraint: boolean
  coupledMode: 'swim' | 'walk'

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
  setCpgRunning: (v: boolean) => void
  setCpgRecording: (v: boolean) => void
  setCoupledRunning: (v: boolean) => void
  setEnvironmentEnabled: (v: boolean) => void
  setMuscleAlpha: (v: number) => void
  setMuscleBeta: (v: number) => void
  setMuscleDamping: (v: number) => void
  setPlanarConstraint: (v: boolean) => void
  setCoupledMode: (v: 'swim' | 'walk') => void
}

export const useAnimateStore = create<AnimateStore>()((set) => ({
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
  cpgDrive: 2.0,
  cpgExcitability: 0.15,
  cpgRunning: false,
  cpgRecording: false,
  coupledRunning: false,
  environmentEnabled: false,
  muscleAlpha: 1.0,
  muscleBeta: 1.2,
  muscleDamping: 0.1,
  planarConstraint: true,
  coupledMode: 'swim',

  setAnimateTab: (tab) => {
    if (tab === 'simulate') {
      set({ animateTab: tab, calibratingGroupId: null, calibratingYaw: 0, calibratingPitch: 0 })
    } else {
      set({
        animateTab: tab,
        simRecording: false,
        cpgRunning: false,
        cpgRecording: false,
        coupledRunning: false,
      })
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

  setCpgRunning: (v) =>
    set(v ? { cpgRunning: true, coupledRunning: false } : { cpgRunning: false }),

  setCpgRecording: (v) =>
    set(v ? { cpgRecording: true, lastCapturePath: null } : { cpgRecording: false }),

  setCoupledRunning: (v) =>
    set(v ? { coupledRunning: true, cpgRunning: false } : { coupledRunning: false }),

  setEnvironmentEnabled: (v) => set({ environmentEnabled: v }),

  setMuscleAlpha: (v) => set({ muscleAlpha: v }),
  setMuscleBeta: (v) => set({ muscleBeta: v }),
  setMuscleDamping: (v) => set({ muscleDamping: v }),
  setPlanarConstraint: (v) => set({ planarConstraint: v }),
  setCoupledMode: (v) => set({ coupledMode: v }),
}))
