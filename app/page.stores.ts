'use client'

import { create } from 'zustand'
import { CreatureConfig } from './page.types'
import { CREATURE_DEFAULTS } from './page.constants'

interface CreatureStore {
  config: CreatureConfig
  showAttractor: boolean
  setSegmentCount: (n: number) => void
  setSegmentLength: (s: number) => void
  setAngleConstraint: (a: number) => void
  toggleLimbNode: (index: number, side: 1 | -1) => void
  setConfigField: (key: keyof CreatureConfig, value: number) => void
  setShowAttractor: (v: boolean) => void
}

export const useCreatureStore = create<CreatureStore>((set) => ({
  config: CREATURE_DEFAULTS.lizard,
  showAttractor: true,

  setSegmentCount: (n) =>
    set((state) => ({
      config: {
        ...state.config,
        segmentCount: n,
        limbNodes: state.config.limbNodes.filter((l) => l.index < n),
      },
    })),

  setSegmentLength: (s) =>
    set((state) => ({ config: { ...state.config, segmentLength: s } })),

  setAngleConstraint: (a) =>
    set((state) => ({ config: { ...state.config, angleConstraint: a } })),

  toggleLimbNode: (index, side) =>
    set((state) => {
      const has = state.config.limbNodes.some((l) => l.index === index && l.side === side)
      const limbNodes = has
        ? state.config.limbNodes.filter((l) => !(l.index === index && l.side === side))
        : [...state.config.limbNodes, { index, side }].sort((a, b) => a.index - b.index || a.side - b.side)
      return { config: { ...state.config, limbNodes } }
    }),

  setConfigField: (key, value) =>
    set((state) => ({ config: { ...state.config, [key]: value } })),

  setShowAttractor: (v) => set({ showAttractor: v }),
}))
