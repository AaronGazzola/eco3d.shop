'use client'

import { create } from 'zustand'
import { CameraPreset } from '../_lib/types'

export type AnimateTab = 'simulate' | 'calibrate'

export interface SimDiagnostics {
  kineticEnergy: number
  comDrift: number
  maxJointFractionOfCap: number
}

interface AnimateStore {
  animateTab: AnimateTab
  calibratingGroupId: string | null
  calibratingYaw: number
  calibratingPitch: number
  legPairMirroredOverrides: Record<string, boolean>
  cameraPreset: CameraPreset | null
  modelOpacity: number
  simRunning: boolean
  simResetSignal: number
  simPerturbSignal: number
  simDiagnostics: SimDiagnostics

  setAnimateTab: (tab: AnimateTab) => void
  setCalibratingGroup: (id: string | null) => void
  setCalibratingYaw: (yaw: number) => void
  setCalibratingPitch: (pitch: number) => void
  setLegPairMirrored: (pairKey: string, mirrored: boolean) => void
  setCameraPreset: (preset: CameraPreset | null) => void
  setModelOpacity: (opacity: number) => void
  setSimRunning: (running: boolean) => void
  requestSimReset: () => void
  requestSimPerturb: () => void
  setSimDiagnostics: (diagnostics: SimDiagnostics) => void
}

export const useAnimateStore = create<AnimateStore>()((set) => ({
  animateTab: 'simulate',
  calibratingGroupId: null,
  calibratingYaw: 0,
  calibratingPitch: 0,
  legPairMirroredOverrides: {},
  cameraPreset: null,
  modelOpacity: 1,
  simRunning: false,
  simResetSignal: 0,
  simPerturbSignal: 0,
  simDiagnostics: { kineticEnergy: 0, comDrift: 0, maxJointFractionOfCap: 0 },

  setAnimateTab: (tab) => {
    if (tab === 'simulate') {
      set({ animateTab: tab, calibratingGroupId: null, calibratingYaw: 0, calibratingPitch: 0 })
    } else {
      set({ animateTab: tab, simRunning: false })
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

  setSimRunning: (running) => set({ simRunning: running }),

  requestSimReset: () => set((state) => ({ simResetSignal: state.simResetSignal + 1 })),

  requestSimPerturb: () => set((state) => ({ simPerturbSignal: state.simPerturbSignal + 1 })),

  setSimDiagnostics: (diagnostics) => set({ simDiagnostics: diagnostics }),
}))
