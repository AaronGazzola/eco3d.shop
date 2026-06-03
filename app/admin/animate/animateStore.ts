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
  simRunning: boolean
  simResetSignal: number
  simKickSignal: number
  simPerturbSignal: number
  simDiagnostics: SimDiagnostics
  simRecording: boolean
  lastCapturePath: string | null
  cpgDrive: number
  cpgExcitability: number
  cpgRunning: boolean
  cpgRecording: boolean
  muscleTestRunning: boolean
  muscleTestFreq: number
  muscleTestAmplitude: number
  muscleTestPhasePerSeg: number
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
  setSimRunning: (running: boolean) => void
  requestSimReset: () => void
  requestSimKick: () => void
  requestSimPerturb: () => void
  setSimDiagnostics: (d: SimDiagnostics) => void
  setSimRecording: (recording: boolean) => void
  setLastCapturePath: (path: string | null) => void
  setCpgDrive: (v: number) => void
  setCpgExcitability: (v: number) => void
  setCpgRunning: (v: boolean) => void
  setCpgRecording: (v: boolean) => void
  setMuscleTestRunning: (v: boolean) => void
  setMuscleTestFreq: (v: number) => void
  setMuscleTestAmplitude: (v: number) => void
  setMuscleTestPhasePerSeg: (v: number) => void
  setCoupledRunning: (v: boolean) => void
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
  simRunning: false,
  simResetSignal: 0,
  simKickSignal: 0,
  simPerturbSignal: 0,
  simDiagnostics: { kineticEnergy: 0, comX: 0, comZ: 0, comDriftFromStart: 0, maxJointFracOfCap: 0 },
  simRecording: false,
  lastCapturePath: null,
  cpgDrive: 1.0,
  cpgExcitability: 1.0,
  cpgRunning: false,
  cpgRecording: false,
  muscleTestRunning: false,
  muscleTestFreq: 0.8,
  muscleTestAmplitude: 20,
  muscleTestPhasePerSeg: 0,
  coupledRunning: false,

  setAnimateTab: (tab) => {
    if (tab === 'simulate') {
      set({ animateTab: tab, calibratingGroupId: null, calibratingYaw: 0, calibratingPitch: 0 })
    } else {
      set({
        animateTab: tab,
        simRunning: false,
        simRecording: false,
        cpgRunning: false,
        cpgRecording: false,
        muscleTestRunning: false,
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

  setSimRunning: (running) =>
    set(
      running
        ? { simRunning: true, cpgRunning: false, muscleTestRunning: false, coupledRunning: false }
        : { simRunning: false }
    ),

  requestSimReset: () => set((state) => ({ simResetSignal: state.simResetSignal + 1 })),

  requestSimKick: () => set((state) => ({ simKickSignal: state.simKickSignal + 1 })),

  requestSimPerturb: () => set((state) => ({ simPerturbSignal: state.simPerturbSignal + 1 })),

  setSimDiagnostics: (d) => set({ simDiagnostics: d }),

  setSimRecording: (recording) =>
    set(recording ? { simRecording: true, lastCapturePath: null } : { simRecording: false }),

  setLastCapturePath: (path) => set({ lastCapturePath: path }),

  setCpgDrive: (v) => set({ cpgDrive: v }),

  setCpgExcitability: (v) => set({ cpgExcitability: v }),

  setCpgRunning: (v) =>
    set(
      v
        ? { cpgRunning: true, simRunning: false, muscleTestRunning: false, coupledRunning: false }
        : { cpgRunning: false }
    ),

  setCpgRecording: (v) =>
    set(v ? { cpgRecording: true, lastCapturePath: null } : { cpgRecording: false }),

  setMuscleTestRunning: (v) =>
    set(
      v
        ? { muscleTestRunning: true, simRunning: false, cpgRunning: false, coupledRunning: false }
        : { muscleTestRunning: false }
    ),

  setMuscleTestFreq: (v) => set({ muscleTestFreq: v }),

  setMuscleTestAmplitude: (v) => set({ muscleTestAmplitude: v }),

  setMuscleTestPhasePerSeg: (v) => set({ muscleTestPhasePerSeg: v }),

  setCoupledRunning: (v) =>
    set(
      v
        ? { coupledRunning: true, simRunning: false, cpgRunning: false, muscleTestRunning: false }
        : { coupledRunning: false }
    ),
}))
