'use client'

import { create } from 'zustand'
import { EggSlot, GamePhase } from './page.types'
import { ModelConfigRow } from './studio/page.types'

interface GameStore {
  phase: GamePhase
  eggs: EggSlot[]
  selectedEggId: string | null
  dragon: ModelConfigRow | null
  hatchStartedAt: number | null
  crackStartedAt: number | null
  emergeStartedAt: number | null
  setEggs: (eggs: EggSlot[]) => void
  selectEgg: (id: string) => void
  cancelSelection: () => void
  beginHatching: (dragon: ModelConfigRow) => void
  beginCracking: () => void
  beginEmerging: () => void
  goLive: () => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  phase: 'choosing',
  eggs: [],
  selectedEggId: null,
  dragon: null,
  hatchStartedAt: null,
  crackStartedAt: null,
  emergeStartedAt: null,

  setEggs: (eggs) => set({ eggs }),

  selectEgg: (id) =>
    set((state) =>
      state.phase === 'choosing'
        ? { selectedEggId: id, phase: 'confirming' }
        : state
    ),

  cancelSelection: () =>
    set((state) =>
      state.phase === 'confirming'
        ? { selectedEggId: null, phase: 'choosing' }
        : state
    ),

  beginHatching: (dragon) =>
    set({ phase: 'shaking', dragon, hatchStartedAt: performance.now() }),

  beginCracking: () =>
    set((state) =>
      state.phase === 'shaking'
        ? { phase: 'cracking', crackStartedAt: performance.now() }
        : state
    ),

  beginEmerging: () =>
    set((state) =>
      state.phase === 'cracking'
        ? { phase: 'emerging', emergeStartedAt: performance.now() }
        : state
    ),

  goLive: () =>
    set((state) => (state.phase === 'emerging' ? { phase: 'live' } : state)),

  reset: () =>
    set({
      phase: 'choosing',
      selectedEggId: null,
      dragon: null,
      hatchStartedAt: null,
      crackStartedAt: null,
      emergeStartedAt: null,
    }),
}))
