'use client'

import { create } from 'zustand'
import type { Animations, Cycle, Pose } from '@/app/game/animation.types'
import { WALK_CYCLE } from '@/app/game/animation.types'
import type { BodyGroup, CameraPreset } from '../_lib/types'
import { buildDefaultWalkCycle } from '@/app/game/animation'

function emptyPose(): Pose {
  return { root: { x: 0, z: 0, yawRad: 0 }, joints: {} }
}

function clonePose(pose: Pose): Pose {
  return {
    root: { ...pose.root },
    joints: Object.fromEntries(Object.entries(pose.joints).map(([k, v]) => [k, { ...v }])),
  }
}

interface AnimateStore {
  cycles: Animations
  selectedCycle: string
  selectedKeyframeIndex: number
  playing: boolean
  scrubPhase: number
  dirty: boolean
  cameraPreset: CameraPreset | null

  loadFromRig: (animations: Animations, groups: BodyGroup[]) => void
  markSaved: () => void
  setSelectedCycle: (name: string) => void
  setSelectedKeyframeIndex: (index: number) => void
  setPlaying: (playing: boolean) => void
  setScrubPhase: (phase: number) => void
  setSpeed: (speed: number) => void
  setAmplitude: (amplitude: number) => void
  addKeyframe: () => void
  deleteKeyframe: (index: number) => void
  moveKeyframe: (index: number, direction: -1 | 1) => void
  setJointOffset: (groupId: string, axis: 'yawRad' | 'pitchRad', value: number) => void
  setRootOffset: (axis: 'x' | 'z' | 'yawRad', value: number) => void
  resetKeyframe: () => void
  setCameraPreset: (preset: CameraPreset | null) => void
}

function withCycle(state: AnimateStore, update: (cycle: Cycle) => Cycle): Partial<AnimateStore> {
  const current = state.cycles[state.selectedCycle]
  if (!current) return {}
  return {
    cycles: { ...state.cycles, [state.selectedCycle]: update(current) },
    dirty: true,
  }
}

export const useAnimateStore = create<AnimateStore>()((set) => ({
  cycles: {},
  selectedCycle: WALK_CYCLE,
  selectedKeyframeIndex: 0,
  playing: false,
  scrubPhase: 0,
  dirty: false,
  cameraPreset: null,

  loadFromRig: (animations, groups) => {
    const cycles: Animations = { ...animations }
    if (!cycles[WALK_CYCLE] || cycles[WALK_CYCLE].keyframes.length === 0) {
      cycles[WALK_CYCLE] = buildDefaultWalkCycle(groups)
    }
    set({
      cycles,
      selectedCycle: WALK_CYCLE,
      selectedKeyframeIndex: 0,
      playing: false,
      scrubPhase: 0,
      dirty: false,
    })
  },

  markSaved: () => set({ dirty: false }),

  setSelectedCycle: (name) => set({ selectedCycle: name, selectedKeyframeIndex: 0 }),

  setSelectedKeyframeIndex: (index) =>
    set((state) => {
      const cycle = state.cycles[state.selectedCycle]
      if (!cycle || cycle.keyframes.length === 0) return { selectedKeyframeIndex: 0 }
      const clamped = Math.max(0, Math.min(cycle.keyframes.length - 1, index))
      return {
        selectedKeyframeIndex: clamped,
        playing: false,
        scrubPhase: clamped / cycle.keyframes.length,
      }
    }),

  setPlaying: (playing) => set({ playing }),

  setScrubPhase: (phase) => set({ scrubPhase: phase }),

  setSpeed: (speed) => set((state) => withCycle(state, (c) => ({ ...c, speed }))),

  setAmplitude: (amplitude) => set((state) => withCycle(state, (c) => ({ ...c, amplitude }))),

  addKeyframe: () =>
    set((state) => {
      const cycle = state.cycles[state.selectedCycle]
      if (!cycle) return {}
      const source = cycle.keyframes[state.selectedKeyframeIndex]
      const next = source ? clonePose(source) : emptyPose()
      const keyframes = [...cycle.keyframes]
      const insertAt = Math.min(keyframes.length, state.selectedKeyframeIndex + 1)
      keyframes.splice(insertAt, 0, next)
      return {
        cycles: { ...state.cycles, [state.selectedCycle]: { ...cycle, keyframes } },
        selectedKeyframeIndex: insertAt,
        dirty: true,
      }
    }),

  deleteKeyframe: (index) =>
    set((state) => {
      const cycle = state.cycles[state.selectedCycle]
      if (!cycle || cycle.keyframes.length === 0) return {}
      const keyframes = cycle.keyframes.filter((_, i) => i !== index)
      return {
        cycles: { ...state.cycles, [state.selectedCycle]: { ...cycle, keyframes } },
        selectedKeyframeIndex: Math.max(0, Math.min(keyframes.length - 1, index - 1)),
        dirty: true,
      }
    }),

  moveKeyframe: (index, direction) =>
    set((state) => {
      const cycle = state.cycles[state.selectedCycle]
      if (!cycle) return {}
      const target = index + direction
      if (target < 0 || target >= cycle.keyframes.length) return {}
      const keyframes = [...cycle.keyframes]
      const [moved] = keyframes.splice(index, 1)
      keyframes.splice(target, 0, moved)
      return {
        cycles: { ...state.cycles, [state.selectedCycle]: { ...cycle, keyframes } },
        selectedKeyframeIndex: target,
        dirty: true,
      }
    }),

  setJointOffset: (groupId, axis, value) =>
    set((state) =>
      withCycle(state, (cycle) => {
        const keyframes = [...cycle.keyframes]
        const index = state.selectedKeyframeIndex
        const pose = keyframes[index]
        if (!pose) return cycle
        const joint = pose.joints[groupId] ?? { yawRad: 0, pitchRad: 0 }
        keyframes[index] = {
          root: { ...pose.root },
          joints: { ...pose.joints, [groupId]: { ...joint, [axis]: value } },
        }
        return { ...cycle, keyframes }
      }),
    ),

  setRootOffset: (axis, value) =>
    set((state) =>
      withCycle(state, (cycle) => {
        const keyframes = [...cycle.keyframes]
        const index = state.selectedKeyframeIndex
        const pose = keyframes[index]
        if (!pose) return cycle
        keyframes[index] = {
          root: { ...pose.root, [axis]: value },
          joints: { ...pose.joints },
        }
        return { ...cycle, keyframes }
      }),
    ),

  resetKeyframe: () =>
    set((state) =>
      withCycle(state, (cycle) => {
        const keyframes = [...cycle.keyframes]
        const index = state.selectedKeyframeIndex
        if (!keyframes[index]) return cycle
        keyframes[index] = emptyPose()
        return { ...cycle, keyframes }
      }),
    ),

  setCameraPreset: (preset) => set({ cameraPreset: preset }),
}))
