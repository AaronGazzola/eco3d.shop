'use client'

import { create } from 'zustand'
import type { CameraPreset } from '../_lib/types'

interface LocomotionStore {
  drive: number
  bendGain: number
  thrustGain: number
  drag: number
  running: boolean
  cameraPreset: CameraPreset | null

  setDrive: (drive: number) => void
  setBendGain: (gain: number) => void
  setThrustGain: (gain: number) => void
  setDrag: (drag: number) => void
  setRunning: (running: boolean) => void
  setCameraPreset: (preset: CameraPreset | null) => void
}

export const useLocomotionStore = create<LocomotionStore>()((set) => ({
  drive: 1,
  bendGain: 0.1,
  thrustGain: 1,
  drag: 20,
  running: false,
  cameraPreset: null,

  setDrive: (drive) => set({ drive }),
  setBendGain: (bendGain) => set({ bendGain }),
  setThrustGain: (thrustGain) => set({ thrustGain }),
  setDrag: (drag) => set({ drag }),
  setRunning: (running) => set({ running }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
}))
