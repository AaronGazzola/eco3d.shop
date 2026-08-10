'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CameraPreset } from '../_lib/types'
import { useSharedStore } from '../_lib/sharedStore'

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
  // Foot thrust (roadmap Decision 10), replacing the retired grip pin. Each foot pushes BACKWARD along
  // its own hip segment's forward axis while it sweeps back, magnitude proportional to the sweep rate.
  // A force, not a constraint — it removes no DOF, so the axial wave is untouched. All three default to
  // off/zero, so an older config or link behaves byte-for-byte as before.
  footThrustEnabled: boolean
  // Signed peak force (N) per foot at maximum backward sweep. Positive propels, negative brakes — so
  // braking needs no second lever and no second code path.
  footThrustGain: number
  // Phase offset (cycles) locating the start of the back stroke on the limb-CPG girdle clock, for the
  // FRONT pair. 0.138 is the measured max-forward-reach phase of the approved MuJoCo base swim.
  footThrustShift: number
  // The same, for the HIND pair. The two girdles do NOT share a phase: at any given girdle-clock phase
  // the front feet are at max forward reach while the hind feet are at max BACKWARD reach, half a cycle
  // apart. Measured directly — with a single shared shift of 0.138 the front windows land on stance and
  // the hind windows land on swing, so the hind feet were pushing backward while sweeping forward.
  // Kept as a separate lever rather than a hard-coded half-cycle because the offset is a property of the
  // travelling wave between the girdles, so it moves when the wave does.
  footThrustShiftHind: number
  // Spine amplitude profile (roadmap Decision 11). Five drive multipliers at normalised arc positions
  // 0, 0.25, 0.5, 0.75 and 1.0 along the CPG chain, linearly interpolated between. The paper already
  // drives by region (front 3 segments at 0.6 against 1.0 for the rest); this is more regions, not a new
  // mechanism. Purpose: the swim envelope grows head→tail, so the two girdles rotate by different amounts
  // and no single body speed can plant both feet. Bringing the tail DOWN to the front is what evens it.
  // On the current rig control point 2 lands on the front girdle (arc 0.254) and point 3 on the hind
  // (arc 0.506), so the girdle pair is dialled directly by those two against each other.
  // Note the response is compressive: the Ekeberg equilibrium angle is a RATIO whose tonic γ term does
  // not scale, so halving a multiplier moves the resulting angle by less than half. Expect to overshoot.
  // All five default to 1.0, which reproduces the unshaped wave exactly.
  waveNose: number
  waveShoulder: number
  waveHip: number
  waveTailMid: number
  waveTailTip: number
  // Excludes the head from the wave OUTRIGHT rather than damping it: the head joint's servo target is
  // forced to zero, so the head adds no bend of its own and its oscillators stop pulling on their
  // neighbours. NOT a control point of the profile above — linear interpolation cannot hold a multiplier
  // at zero across the head segment, whose centre sits at arc 0.083 while the next control point is 0.25.
  // Does NOT hold the head steady in world space: the head is rigid to the neck and the neck still waves.
  // Aiming the head at a focal point is a separate, later layer. MuJoCo only.
  headIsolated: boolean
  // Plant hold. The legs stay rigid and never sweep; instead the BODY is shifted each step so the feet
  // whose plant window is open stay on the floor spots they were standing on when that window opened.
  // With rigid legs a foot is welded to the body, so one translation moves all feet together and several
  // planted feet can only be held on average, not each exactly. The window is CPG-clocked with separate
  // front and hind shifts, the same window foot thrust uses. MuJoCo only. Off by default.
  plantHoldEnabled: boolean
  // Fraction of the measured foot error corrected per step, 0 to 1. Below 1 the body is pulled toward
  // the correction rather than snapped to it, which is what keeps it from fighting the velocity the
  // solver just integrated. 0 disables the hold even when the toggle is on.
  plantHoldGain: number
  // --- Flight (roadmap Decisions 12-13, Phase T1) ---
  // Gravitational acceleration on Y. Flight is the base swim with this at zero: the wave still pushes
  // against anisotropic drag, and drag does not care whether the fluid is water or air. Defaults to
  // Earth's pull, so every preset and every previously shared link behaves exactly as it did.
  // MuJoCo bakes gravity into the model it generates, so changing this rebuilds the model.
  gravityY: number
  // The tank. Off by default, leaving the single infinite floor plane the walking work ran on. On, the
  // floor is replaced by six bounded planes and the trunk capsules become collidable, so a body under
  // no gravity is contained and rebounds from a wall through ordinary contact rather than through any
  // explicit reversal. Structural, so toggling it or resizing it rebuilds the model.
  tankEnabled: boolean
  // Interior dimensions in world units. Defaults hold the current rig (about 17.8 units nose to tail)
  // with room to cross the tank and turn around. Width is X, height is Y upward from the ground the
  // floor plane already used, depth is Z.
  tankWidth: number
  tankHeight: number
  tankDepth: number
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
  gripEnabled: false,
  gripClockCpg: true,
  gripShift: 0.05,
  gripDuration: 0.5,
  gripSoftness: 0,
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
  footThrustEnabled: false,
  footThrustGain: 0,
  footThrustShift: 0.36,
  footThrustShiftHind: 0.86,
  waveNose: 1,
  waveShoulder: 1,
  waveHip: 1,
  waveTailMid: 1,
  waveTailTip: 1,
  headIsolated: false,
  plantHoldEnabled: false,
  plantHoldGain: 0.5,
  gravityY: -9.81,
  tankEnabled: false,
  tankWidth: 60,
  tankHeight: 30,
  tankDepth: 40,
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
    footThrustEnabled: s.footThrustEnabled,
    footThrustGain: s.footThrustGain,
    footThrustShift: s.footThrustShift,
    footThrustShiftHind: s.footThrustShiftHind,
    waveNose: s.waveNose,
    waveShoulder: s.waveShoulder,
    waveHip: s.waveHip,
    waveTailMid: s.waveTailMid,
    waveTailTip: s.waveTailTip,
    headIsolated: s.headIsolated,
    plantHoldEnabled: s.plantHoldEnabled,
    plantHoldGain: s.plantHoldGain,
    gravityY: s.gravityY,
    tankEnabled: s.tankEnabled,
    tankWidth: s.tankWidth,
    tankHeight: s.tankHeight,
    tankDepth: s.tankDepth,
  }
}

// The subset of SimConfig that MuJoCo bakes into the model it generates rather than reading each step.
// A change to any of these needs a rebuild; a change to anything else must NOT trigger one, or every
// slider drag would throw away the running simulation. Kept as one function so the rebuild check and
// the model build cannot drift apart about which levers are structural.
export function mujocoStructuralKey(s: SimConfig): string {
  return [s.gravityY, s.tankEnabled, s.tankWidth, s.tankHeight, s.tankDepth].join('|')
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
  // The tank the physics is actually enclosing, in world units, published by the runtime once the model
  // is built. Null when no tank is in force. The overlay camera has to frame exactly this volume, and it
  // cannot derive it from the config alone: the tank is centred on the creature's own start position,
  // which depends on where the rig's nodes put it.
  tankBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null
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
  setTankBounds: (b: AnimateStore['tankBounds']) => void
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
  setFootThrustEnabled: (v: boolean) => void
  setFootThrustGain: (v: number) => void
  setFootThrustShift: (v: number) => void
  setFootThrustShiftHind: (v: number) => void
  setWaveNose: (v: number) => void
  setWaveShoulder: (v: number) => void
  setWaveHip: (v: number) => void
  setWaveTailMid: (v: number) => void
  setWaveTailTip: (v: number) => void
  setHeadIsolated: (v: boolean) => void
  setPlantHoldEnabled: (v: boolean) => void
  setPlantHoldGain: (v: number) => void
  setGravityY: (v: number) => void
  setTankEnabled: (v: boolean) => void
  setTankWidth: (v: number) => void
  setTankHeight: (v: number) => void
  setTankDepth: (v: number) => void
  resetSimConfig: () => void
  applySimConfig: (partial: Partial<SimConfig>) => void
  applySimConfigAbsolute: (config: Partial<SimConfig>) => void
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
      tankBounds: null,
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
      setTankBounds: (b) => set({ tankBounds: b }),

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
      setFootThrustEnabled: (v) => set({ footThrustEnabled: v }),
      setFootThrustGain: (v) => set({ footThrustGain: v }),
      setFootThrustShift: (v) => set({ footThrustShift: v }),
      setFootThrustShiftHind: (v) => set({ footThrustShiftHind: v }),
      setWaveNose: (v) => set({ waveNose: v }),
      setWaveShoulder: (v) => set({ waveShoulder: v }),
      setWaveHip: (v) => set({ waveHip: v }),
      setWaveTailMid: (v) => set({ waveTailMid: v }),
      setWaveTailTip: (v) => set({ waveTailTip: v }),
      setHeadIsolated: (v) => set({ headIsolated: v }),
      setPlantHoldEnabled: (v) => set({ plantHoldEnabled: v }),
      setPlantHoldGain: (v) => set({ plantHoldGain: v }),
      setGravityY: (v) => set({ gravityY: v }),
      setTankEnabled: (v) => set({ tankEnabled: v }),
      setTankWidth: (v) => set({ tankWidth: v }),
      setTankHeight: (v) => set({ tankHeight: v }),
      setTankDepth: (v) => set({ tankDepth: v }),
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
      // Absolute apply: every key the caller omits falls back to the DEFAULT, not to whatever happens to
      // be loaded. This is what makes a preset reproducible — with a merge, preset B applied after preset
      // A is not preset B, and the human ends up looking at a state nobody recorded. Presets and the
      // `sim=` link both come through here; only the persisted-config rehydrate uses the merging path.
      applySimConfigAbsolute: (config) => {
        const keys = Object.keys(DEFAULT_SIM_CONFIG) as Array<keyof SimConfig>
        const next: Partial<SimConfig> = {}
        for (const k of keys) {
          const v = k in config ? (config as Record<string, unknown>)[k] : (DEFAULT_SIM_CONFIG as unknown as Record<string, unknown>)[k]
          ;(next as Record<string, unknown>)[k] = v
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

export const EMBED_PATH = '/game/embed'

// The one link builder. Params ride in the URL hash so the browser never sends them to the server: a
// large ?sim= query rode along on every Server Action POST (e.g. the auth profile check) and could be
// rejected, bouncing the studio to the login screen. `rig` is what lets a link render somewhere that has
// no saved studio state of its own — without it the recipient sees their own rig under the sender's
// config. Pass EMBED_PATH for an overlay link; omit `path` to point at the current page.
export function buildConfigLink(path?: string): string {
  const st = useAnimateStore.getState()
  const shared = useSharedStore.getState()
  const params = new URLSearchParams()
  params.set('tab', st.animateTab)
  params.set('sim', encodeSimConfig(pickSimConfig(st as unknown as SimConfig)))
  if (st.overlays.length > 0) params.set('overlay', st.overlays.join(','))
  if (shared.configId) params.set('rig', shared.configId)
  const leg = shared.groups.find((g) => g.type === 'leg-left' || g.type === 'leg-right')
  if (leg?.nodeWeight != null) params.set('legw', String(leg.nodeWeight))
  const base = typeof window !== 'undefined' ? window.location.origin + (path ?? window.location.pathname) : ''
  return `${base}#${params.toString()}`
}
