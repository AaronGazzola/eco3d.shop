'use client'

import { create } from 'zustand'
import { SegmentData } from './page.types'

const SEGMENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308',
]

interface StudioStore {
  stlKey: string | null
  segments: SegmentData[]
  selectedSegmentId: string | null

  setStlKey: (key: string) => void
  setSegments: (segments: SegmentData[]) => void
  setSelectedSegmentId: (id: string | null) => void
}

export const useStudioStore = create<StudioStore>((set) => ({
  stlKey: null,
  segments: [],
  selectedSegmentId: null,

  setStlKey: (key) => set({ stlKey: key }),

  setSegments: (raw) =>
    set({
      segments: raw.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] })),
      selectedSegmentId: null,
    }),

  setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),
}))
