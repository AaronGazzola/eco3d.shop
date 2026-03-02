'use client'

import { create } from 'zustand'
import { SegmentData, BodyGroup, BodyGroupType } from './page.types'

const SEGMENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308',
]

export type CameraPreset = 'reset' | 'front' | 'top' | 'side'

interface StudioStore {
  stlKey: string | null
  segments: SegmentData[]
  selectedSegmentId: string | null
  pendingSegmentIds: string[]
  groups: BodyGroup[]
  step: 1 | 2
  cameraPreset: CameraPreset | null
  modelRotation: [number, number, number]

  setStlKey: (key: string) => void
  setSegments: (segments: SegmentData[]) => void
  setSelectedSegmentId: (id: string | null) => void
  setStep: (step: 1 | 2) => void
  setCameraPreset: (preset: CameraPreset | null) => void
  rotateModel: (axis: 'x' | 'y' | 'z', delta: number) => void
  togglePendingSegment: (id: string) => void
  clearPending: () => void
  createGroup: (name: string, type: BodyGroupType, attachedToSpineId?: string) => void
  deleteGroup: (id: string) => void
  reorderSpineGroups: (newOrderIds: string[]) => void
  setGroupAttachment: (groupId: string, spineGroupId: string) => void
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  stlKey: null,
  segments: [],
  selectedSegmentId: null,
  pendingSegmentIds: [],
  groups: [],
  step: 1,
  cameraPreset: null,
  modelRotation: [0, 0, 0],

  setStlKey: (key) => set({ stlKey: key }),

  setSegments: (raw) =>
    set({
      segments: raw.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] })),
      selectedSegmentId: null,
      pendingSegmentIds: [],
      groups: [],
      step: 2,
      modelRotation: [0, 0, 0],
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
}))
