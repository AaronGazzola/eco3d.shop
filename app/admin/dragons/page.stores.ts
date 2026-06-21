import { create } from 'zustand'
import type { FilamentColorInput } from './page.types'

type FilamentDraft = FilamentColorInput

const EMPTY_FILAMENT: FilamentDraft = { name: '', hex: '#cccccc', brand: null, sku: null }

type DragonsPageStore = {
  filamentEditing: string | 'new' | null
  filamentDraft: FilamentDraft
  startNewFilament: () => void
  startEditFilament: (id: string, draft: FilamentDraft) => void
  setFilamentDraft: (patch: Partial<FilamentDraft>) => void
  cancelFilament: () => void
}

export const useDragonsPageStore = create<DragonsPageStore>((set) => ({
  filamentEditing: null,
  filamentDraft: EMPTY_FILAMENT,
  startNewFilament: () => set({ filamentEditing: 'new', filamentDraft: EMPTY_FILAMENT }),
  startEditFilament: (id, draft) => set({ filamentEditing: id, filamentDraft: draft }),
  setFilamentDraft: (patch) =>
    set((s) => ({ filamentDraft: { ...s.filamentDraft, ...patch } })),
  cancelFilament: () => set({ filamentEditing: null, filamentDraft: EMPTY_FILAMENT }),
}))
