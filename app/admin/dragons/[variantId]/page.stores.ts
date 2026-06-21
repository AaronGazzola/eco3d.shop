import { create } from 'zustand'

export type EditTarget =
  | { kind: 'role'; id: string | 'new' }
  | { kind: 'gene'; id: string | 'new' }
  | { kind: 'allele'; geneId: string; id: string | 'new' }
  | null

type DraftValue = string | number | null

type VariantEditorStore = {
  editing: EditTarget
  draft: Record<string, DraftValue>
  startEdit: (target: EditTarget, draft: Record<string, DraftValue>) => void
  setDraft: (patch: Record<string, DraftValue>) => void
  cancel: () => void
}

export const useVariantEditorStore = create<VariantEditorStore>((set) => ({
  editing: null,
  draft: {},
  startEdit: (editing, draft) => set({ editing, draft }),
  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  cancel: () => set({ editing: null, draft: {} }),
}))

export function isEditing(editing: EditTarget, target: EditTarget): boolean {
  if (!editing || !target) return false
  if (editing.kind !== target.kind) return false
  if (editing.kind === 'allele' && target.kind === 'allele') {
    return editing.geneId === target.geneId && editing.id === target.id
  }
  return editing.id === (target as { id: string | 'new' }).id
}
