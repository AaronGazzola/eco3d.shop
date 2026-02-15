import { create } from "zustand";

interface EditModeState {
  isEditMode: boolean;
  selectedLink: { animalType: string; linkIndex: number; linkName: string } | null;
  setEditMode: (enabled: boolean) => void;
  selectLink: (animalType: string, linkIndex: number, linkName: string) => void;
  clearSelection: () => void;
}

export const useEditModeStore = create<EditModeState>((set) => ({
  isEditMode: false,
  selectedLink: null,
  setEditMode: (enabled) =>
    set({
      isEditMode: enabled,
      selectedLink: enabled ? null : null,
    }),
  selectLink: (animalType, linkIndex, linkName) =>
    set({ selectedLink: { animalType, linkIndex, linkName } }),
  clearSelection: () => set({ selectedLink: null }),
}));
