'use client'

import { create } from 'zustand'
import { NodeType, CameraPreset } from '../_lib/types'

type SelectionMode = 'click' | 'sphere' | 'node'

interface GroupStore {
  pendingSegmentIds: string[]
  selectionMode: SelectionMode
  sphere: { x: number; y: number; z: number; radius: number } | null
  selectedNodeId: { groupId: string; nodeType: NodeType } | null
  cameraPreset: CameraPreset | null

  setPendingSegmentIds: (ids: string[]) => void
  togglePendingSegment: (id: string) => void
  clearPending: () => void
  setSelectionMode: (mode: SelectionMode) => void
  setSphere: (sphere: { x: number; y: number; z: number; radius: number } | null) => void
  setSphereRadius: (radius: number) => void
  setSelectedNodeId: (id: { groupId: string; nodeType: NodeType } | null) => void
  setCameraPreset: (preset: CameraPreset | null) => void
}

export const useGroupStore = create<GroupStore>()((set) => ({
  pendingSegmentIds: [],
  selectionMode: 'click',
  sphere: null,
  selectedNodeId: null,
  cameraPreset: null,

  setPendingSegmentIds: (ids) => set({ pendingSegmentIds: ids }),

  togglePendingSegment: (id) =>
    set((state) => ({
      pendingSegmentIds: state.pendingSegmentIds.includes(id)
        ? state.pendingSegmentIds.filter((s) => s !== id)
        : [...state.pendingSegmentIds, id],
    })),

  clearPending: () => set({ pendingSegmentIds: [] }),

  setSelectionMode: (mode) => {
    if (mode === 'click') set({ selectionMode: mode, sphere: null, selectedNodeId: null })
    else if (mode === 'sphere') set({ selectionMode: mode, selectedNodeId: null })
    else set({ selectionMode: mode, sphere: null, pendingSegmentIds: [] })
  },

  setSphere: (sphere) => set({ sphere }),

  setSphereRadius: (radius) =>
    set((state) => ({ sphere: state.sphere ? { ...state.sphere, radius } : null })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setCameraPreset: (preset) => set({ cameraPreset: preset }),
}))
