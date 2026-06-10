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
  coupledMode: 'swim' | 'land'
  stepEnabled: boolean
  stepFreqHz: number
  stepPhase: number
  bodyFriction: number
  legFriction: number
  gravityEnabled: boolean
  landLegsEnabled: boolean
  landGroundEnabled: boolean
  limbCpgEnabled: boolean
  legsLocked: boolean
  gripEnabled: boolean
  gripShift: number
  gripDuration: number
  gripStrength: number
  releaseFriction: number
  gripGlowEnabled: boolean
  gripLegs: 'front' | 'back' | 'both'

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
  setCoupledMode: (v: 'swim' | 'land') => void
  setStepEnabled: (v: boolean) => void
  setStepFreqHz: (v: number) => void
  setStepPhase: (v: number) => void
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
  setGripStrength: (v: number) => void
  setReleaseFriction: (v: number) => void
  setGripGlowEnabled: (v: boolean) => void
  setGripLegs: (v: 'front' | 'back' | 'both') => void
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
  coupledMode: 'swim',
  stepEnabled: false,
  stepFreqHz: 0.6,
  stepPhase: Math.PI, // half-cycle offset: steps the foot contralateral to the body wave (walks ~2x farther)
  bodyFriction: 0, // all ground contact is frictionless — base motion matches swim; grip pins instead
  legFriction: 0, // grip works by pinning the foot (a joint), not friction, so this stays 0 too
  gravityEnabled: true, // land-mode gravity; off = land rig (legs+floor) with no downward pull
  landLegsEnabled: true, // build the 4 legs as physics bodies + render them from physics; off = no legs
  landGroundEnabled: true, // build the ground plane; off = no floor (toward swim)
  limbCpgEnabled: true, // add the 4 limb oscillators to the CPG (the legs' driver; Walk needs them)
  legsLocked: true, // hold the hips stiff at rest (rigid struts); off = free/passive (legs dangle)
  gripEnabled: false, // legs held stiff; each foot grips the floor on its backward (power) stroke
  gripShift: 0, // slides the grip window vs the CPG cycle (0 = start gripping at CPG phase 0)
  gripDuration: 0.5, // fraction of the CPG cycle the foot grips (window width)
  gripStrength: 1, // 0 = grip is physically off (timing/glow still tick); >0 = plant + traction engage
  releaseFriction: 0, // feet are frictionless; grip provides traction by pinning, not friction
  gripGlowEnabled: false, // debug: light up each foot node bright while it is gripping the floor
  gripLegs: 'both', // which legs grip: front pair, back pair, or all four

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
  setCoupledMode: (v) => set({ coupledMode: v }),
  setStepEnabled: (v) => set({ stepEnabled: v }),
  setStepFreqHz: (v) => set({ stepFreqHz: v }),
  setStepPhase: (v) => set({ stepPhase: v }),
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
  setGripStrength: (v) => set({ gripStrength: v }),
  setReleaseFriction: (v) => set({ releaseFriction: v }),
  setGripGlowEnabled: (v) => set({ gripGlowEnabled: v }),
  setGripLegs: (v) => set({ gripLegs: v }),
}))
