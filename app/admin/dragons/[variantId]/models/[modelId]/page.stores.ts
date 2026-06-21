import { create } from 'zustand'
import type { RoleTagDraft } from './page.types'

type TagEditorStore = {
  roleTags: RoleTagDraft
  activeRole: string | null
  selection: string[]
  dirty: boolean
  init: (roleTags: RoleTagDraft, firstRole: string | null) => void
  setActiveRole: (roleKey: string) => void
  toggleSegment: (segId: string) => void
  clearSelection: () => void
  assignSelectionToActiveRole: () => void
  untagSelection: () => void
  markSaved: () => void
}

export const useTagEditorStore = create<TagEditorStore>((set) => ({
  roleTags: {},
  activeRole: null,
  selection: [],
  dirty: false,
  init: (roleTags, firstRole) =>
    set({ roleTags: { ...roleTags }, activeRole: firstRole, selection: [], dirty: false }),
  setActiveRole: (roleKey) => set({ activeRole: roleKey }),
  toggleSegment: (segId) =>
    set((s) => ({
      selection: s.selection.includes(segId)
        ? s.selection.filter((id) => id !== segId)
        : [...s.selection, segId],
    })),
  clearSelection: () => set({ selection: [] }),
  assignSelectionToActiveRole: () =>
    set((s) => {
      if (!s.activeRole || s.selection.length === 0) return s
      const roleTags = { ...s.roleTags }
      for (const id of s.selection) roleTags[id] = s.activeRole
      return { roleTags, selection: [], dirty: true }
    }),
  untagSelection: () =>
    set((s) => {
      if (s.selection.length === 0) return s
      const roleTags = { ...s.roleTags }
      for (const id of s.selection) delete roleTags[id]
      return { roleTags, selection: [], dirty: true }
    }),
  markSaved: () => set({ dirty: false }),
}))
