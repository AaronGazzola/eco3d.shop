'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SegmentData, BodyGroup, BodyGroupType, ModelConfigRow } from './page.types'

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
  step: 1 | 2
  cameraPreset: CameraPreset | null
  modelRotation: [number, number, number]
  selectionMode: 'click' | 'sphere' | 'node'
  sphere: { x: number; y: number; z: number; radius: number } | null
  selectedNodeGroupId: string | null
  nodeTransformMode: 'translate' | 'rotate'

  setStlKey: (key: string) => void
  setConfigId: (id: string | null) => void
  setConfigName: (name: string) => void
  loadConfig: (config: ModelConfigRow) => void
  setSegments: (segments: SegmentData[]) => void
  restoreSegments: (segments: SegmentData[]) => void
  setSelectedSegmentId: (id: string | null) => void
  setStep: (step: 1 | 2) => void
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
  setSelectedNodeGroupId: (id: string | null) => void
  setNodeTransformMode: (mode: 'translate' | 'rotate') => void
  setNodeGroupPosition: (groupId: string, x: number, z: number) => void
  setNodeGroupAngle: (groupId: string, angle: number) => void
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
      selectedNodeGroupId: null,
      nodeTransformMode: 'translate',

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
          selectedNodeGroupId: null,
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
        if (mode === 'click') set({ selectionMode: mode, sphere: null, selectedNodeGroupId: null })
        else if (mode === 'sphere') set({ selectionMode: mode, selectedNodeGroupId: null })
        else set({ selectionMode: mode, sphere: null, pendingSegmentIds: [] })
      },

      setSphere: (sphere) => set({ sphere }),

      setSphereRadius: (radius) =>
        set((state) => ({ sphere: state.sphere ? { ...state.sphere, radius } : null })),

      setPendingSegmentIds: (ids) => set({ pendingSegmentIds: ids }),

      setSelectedNodeGroupId: (id) => set({ selectedNodeGroupId: id }),

      setNodeTransformMode: (mode) => set({ nodeTransformMode: mode }),

      setNodeGroupPosition: (groupId, x, z) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, nodePosition: { x, z } } : g
          ),
        })),

      setNodeGroupAngle: (groupId, angle) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, nodeAngle: angle } : g
          ),
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
      }),
    }
  )
)
