'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SegmentData, BodyGroup, BodyGroupType, ModelConfigRow, NodeType, AnimationConfig } from './page.types'
import { CREATURE_DEFAULTS } from '../page.constants'

const ANIMATION_DEFAULTS: AnimationConfig = {
  angleConstraint: CREATURE_DEFAULTS.lizard.angleConstraint,
  limbAngleOffset: CREATURE_DEFAULTS.lizard.limbAngleOffset,
  stepThreshold: CREATURE_DEFAULTS.lizard.stepThreshold,
  stepSmoothing: CREATURE_DEFAULTS.lizard.stepSmoothing,
  wanderRadius: CREATURE_DEFAULTS.lizard.wanderRadius,
  wanderSpeed: CREATURE_DEFAULTS.lizard.wanderSpeed,
  maxSpeed: CREATURE_DEFAULTS.lizard.maxSpeed,
  followDistance: CREATURE_DEFAULTS.lizard.followDistance,
}

const SEGMENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308',
]

export type CameraPreset = 'reset' | 'front' | 'top' | 'side'

interface StudioStore {
  stlKey: string | null
  configId: string | null
  configName: string
  segments: SegmentData[]
  selectedSegmentId: string | null
  pendingSegmentIds: string[]
  groups: BodyGroup[]
  step: 1 | 2 | 3
  cameraPreset: CameraPreset | null
  modelRotation: [number, number, number]
  selectionMode: 'click' | 'sphere' | 'node'
  sphere: { x: number; y: number; z: number; radius: number } | null
  selectedNodeId: { groupId: string; nodeType: NodeType } | null
  animationConfig: AnimationConfig
  showAttractor: boolean

  setStlKey: (key: string) => void
  setConfigId: (id: string | null) => void
  setConfigName: (name: string) => void
  loadConfig: (config: ModelConfigRow) => void
  setSegments: (segments: SegmentData[]) => void
  restoreSegments: (segments: SegmentData[]) => void
  setSelectedSegmentId: (id: string | null) => void
  setStep: (step: 1 | 2 | 3) => void
  setAnimationField: (key: keyof AnimationConfig, value: number) => void
  setShowAttractor: (v: boolean) => void
  setCameraPreset: (preset: CameraPreset | null) => void
  rotateModel: (axis: 'x' | 'y' | 'z', delta: number) => void
  togglePendingSegment: (id: string) => void
  clearPending: () => void
  createGroup: (name: string, type: BodyGroupType, attachedToSpineId?: string) => void
  addToGroup: (id: string) => void
  deleteGroup: (id: string) => void
  reorderSpineGroups: (newOrderIds: string[]) => void
  setGroupAttachment: (groupId: string, spineGroupId: string) => void
  setSelectionMode: (mode: 'click' | 'sphere' | 'node') => void
  setSphere: (sphere: { x: number; y: number; z: number; radius: number } | null) => void
  setSphereRadius: (radius: number) => void
  setPendingSegmentIds: (ids: string[]) => void
  setSelectedNodeId: (id: { groupId: string; nodeType: NodeType } | null) => void
  setGroupNode: (groupId: string, nodeType: NodeType, x: number, z: number) => void
}

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      stlKey: null,
      configId: null,
      configName: '',
      segments: [],
      selectedSegmentId: null,
      pendingSegmentIds: [],
      groups: [],
      step: 1,
      cameraPreset: null,
      modelRotation: [0, 0, 0],
      selectionMode: 'click',
      sphere: null,
      selectedNodeId: null,
      animationConfig: ANIMATION_DEFAULTS,
      showAttractor: true,

      setStlKey: (key) => set({ stlKey: key }),

      setConfigId: (id) => set({ configId: id }),

      setConfigName: (name) => set({ configName: name }),

      loadConfig: (config) =>
        set({
          stlKey: config.stl_key,
          configId: config.id,
          configName: config.name,
          groups: config.groups,
          modelRotation: config.model_rotation,
          step: 2,
          pendingSegmentIds: [],
          selectionMode: 'click',
          sphere: null,
          selectedNodeId: null,
        }),


      setSegments: (raw) =>
        set({
          segments: raw.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] })),
          selectedSegmentId: null,
          pendingSegmentIds: [],
          groups: [],
          step: 2,
          modelRotation: [0, 0, 0],
          selectionMode: 'click',
          sphere: null,
        }),

      restoreSegments: (raw) =>
        set({
          segments: raw.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] })),
          pendingSegmentIds: [],
          selectionMode: 'click',
        }),

      setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),

      setStep: (step) => set({ step }),

      setCameraPreset: (preset) => set({ cameraPreset: preset }),

      rotateModel: (axis, delta) =>
        set((state) => {
          const r = [...state.modelRotation] as [number, number, number]
          if (axis === 'x') r[0] += delta
          else if (axis === 'y') r[1] += delta
          else r[2] += delta
          return { modelRotation: r }
        }),

      togglePendingSegment: (id) =>
        set((state) => ({
          pendingSegmentIds: state.pendingSegmentIds.includes(id)
            ? state.pendingSegmentIds.filter((s) => s !== id)
            : [...state.pendingSegmentIds, id],
        })),

      clearPending: () => set({ pendingSegmentIds: [] }),

      createGroup: (name, type, attachedToSpineId) => {
        const { pendingSegmentIds, groups } = get()
        if (pendingSegmentIds.length === 0) return
        const color = SEGMENT_COLORS[groups.length % SEGMENT_COLORS.length]
        const newGroup: BodyGroup = {
          id: `group-${Date.now()}`,
          name,
          segmentIds: [...pendingSegmentIds],
          color,
          type,
          attachedToSpineId,
        }
        set({ groups: [...groups, newGroup], pendingSegmentIds: [] })
      },

      addToGroup: (id) =>
        set((state) => {
          const { pendingSegmentIds } = state
          if (pendingSegmentIds.length === 0) return state
          return {
            groups: state.groups.map((g) =>
              g.id === id
                ? { ...g, segmentIds: [...new Set([...g.segmentIds, ...pendingSegmentIds])] }
                : g
            ),
            pendingSegmentIds: [],
          }
        }),

      deleteGroup: (id) =>
        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

      reorderSpineGroups: (newOrderIds) =>
        set((state) => {
          const spineMap = new Map(state.groups.filter((g) => g.type === 'spine').map((g) => [g.id, g]))
          const nonSpine = state.groups.filter((g) => g.type !== 'spine')
          const reordered = newOrderIds.map((id) => spineMap.get(id)).filter(Boolean) as BodyGroup[]
          return { groups: [...nonSpine, ...reordered] }
        }),

      setGroupAttachment: (groupId, spineGroupId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, attachedToSpineId: spineGroupId } : g
          ),
        })),

      setSelectionMode: (mode) => {
        if (mode === 'click') set({ selectionMode: mode, sphere: null, selectedNodeId: null })
        else if (mode === 'sphere') set({ selectionMode: mode, selectedNodeId: null })
        else set({ selectionMode: mode, sphere: null, pendingSegmentIds: [] })
      },

      setSphere: (sphere) => set({ sphere }),

      setSphereRadius: (radius) =>
        set((state) => ({ sphere: state.sphere ? { ...state.sphere, radius } : null })),

      setPendingSegmentIds: (ids) => set({ pendingSegmentIds: ids }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),

      setAnimationField: (key, value) =>
        set((state) => ({ animationConfig: { ...state.animationConfig, [key]: value } })),

      setShowAttractor: (v) => set({ showAttractor: v }),

      setGroupNode: (groupId, nodeType, x, z) =>
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g
            switch (nodeType) {
              case 'front': return { ...g, nodeFront: { x, z } }
              case 'back': return { ...g, nodeBack: { x, z } }
              case 'hipLeft': return { ...g, nodeHipLeft: { x, z } }
              case 'hipRight': return { ...g, nodeHipRight: { x, z } }
              case 'hip': return { ...g, nodeHip: { x, z } }
              case 'foot': return { ...g, nodeFoot: { x, z } }
            }
          }),
        })),
    }),
    {
      name: 'studio-store',
      partialize: (state) => ({
        stlKey: state.stlKey,
        configId: state.configId,
        configName: state.configName,
        groups: state.groups,
        step: state.step,
        modelRotation: state.modelRotation,
        animationConfig: state.animationConfig,
        showAttractor: state.showAttractor,
      }),
    }
  )
)
