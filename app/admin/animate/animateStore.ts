'use client'

import { create } from 'zustand'
import { CameraPreset } from '../_lib/types'

export type AnimateTab = 'simulate' | 'calibrate'

export interface PlaybackState {
  active: boolean
  playing: boolean
  frameIndex: number
  framesPerStep: number
}

export interface SolverFlags {
  timeScale: number
}

interface AnimateStore {
  attractor: { x: number; y: number; z: number } | null
  animateTab: AnimateTab
  calibratingGroupId: string | null
  calibratingYaw: number
  calibratingPitch: number
  legPairMirroredOverrides: Record<string, boolean>
  cameraPreset: CameraPreset | null
  modelOpacity: number
  playback: PlaybackState
  solver: SolverFlags

  setAttractor: (a: { x: number; y: number; z: number } | null) => void
  setAnimateTab: (tab: AnimateTab) => void
  setCalibratingGroup: (id: string | null) => void
  setCalibratingYaw: (yaw: number) => void
  setCalibratingPitch: (pitch: number) => void
  setLegPairMirrored: (pairKey: string, mirrored: boolean) => void
  setCameraPreset: (preset: CameraPreset | null) => void
  setModelOpacity: (opacity: number) => void
  setPlaybackActive: (active: boolean) => void
  setPlaybackPlaying: (playing: boolean) => void
  setPlaybackFrameIndex: (index: number) => void
  setFramesPerStep: (n: number) => void
  setTimeScale: (n: number) => void
}

const DEFAULT_SOLVER: SolverFlags = {
  timeScale: 1,
}

export const useAnimateStore = create<AnimateStore>()((set) => ({
  attractor: null,
  animateTab: 'simulate',
  calibratingGroupId: null,
  calibratingYaw: 0,
  calibratingPitch: 0,
  legPairMirroredOverrides: {},
  cameraPreset: null,
  modelOpacity: 1,
  playback: { active: false, playing: false, frameIndex: 0, framesPerStep: 1 },
  solver: { ...DEFAULT_SOLVER },

  setAttractor: (a) => set({ attractor: a }),

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

  setPlaybackActive: (active) =>
    set((state) => ({
      playback: active
        ? { ...state.playback, active: true }
        : { ...state.playback, active: false, playing: false },
    })),

  setPlaybackPlaying: (playing) =>
    set((state) => ({ playback: { ...state.playback, playing } })),

  setPlaybackFrameIndex: (index) =>
    set((state) => ({
      playback: { ...state.playback, frameIndex: Math.max(0, index) },
    })),

  setFramesPerStep: (n) =>
    set((state) => ({
      playback: { ...state.playback, framesPerStep: Math.max(1, Math.floor(n)) },
    })),

  setTimeScale: (n) =>
    set((state) => ({
      solver: { ...state.solver, timeScale: Math.max(0.01, Math.min(2, n)) },
    })),
}))
