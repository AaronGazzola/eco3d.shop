'use client'

import { create } from 'zustand'
import { CameraPreset } from '../_lib/types'

export type AnimateTab = 'simulate' | 'calibrate'

interface AnimateStore {
  animateTab: AnimateTab
  calibratingGroupId: string | null
  calibratingYaw: number
  calibratingPitch: number
  legPairMirroredOverrides: Record<string, boolean>
  cameraPreset: CameraPreset | null
  modelOpacity: number

  setAnimateTab: (tab: AnimateTab) => void
  setCalibratingGroup: (id: string | null) => void
  setCalibratingYaw: (yaw: number) => void
  setCalibratingPitch: (pitch: number) => void
  setLegPairMirrored: (pairKey: string, mirrored: boolean) => void
  setCameraPreset: (preset: CameraPreset | null) => void
  setModelOpacity: (opacity: number) => void
}

export const useAnimateStore = create<AnimateStore>()((set) => ({
  animateTab: 'simulate',
  calibratingGroupId: null,
  calibratingYaw: 0,
  calibratingPitch: 0,
  legPairMirroredOverrides: {},
  cameraPreset: null,
  modelOpacity: 1,

  setAnimateTab: (tab) => {
    if (tab === 'simulate') {
      set({ animateTab: tab, calibratingGroupId: null, calibratingYaw: 0, calibratingPitch: 0 })
    } else {
      set({ animateTab: tab })
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
}))
