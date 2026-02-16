import { create } from "zustand";

interface ConnectionOffsets {
  front: [number, number, number];
  back: [number, number, number];
  tipFront?: [number, number, number];
  tipBack?: [number, number, number];
}

interface EditModeState {
  isEditMode: boolean;
  selectedLink: { animalType: string; linkIndex: number; linkName: string } | null;
  selectedConnectionPoint: "front" | "back" | "tipFront" | "tipBack" | null;
  connectionOffsets: Record<string, ConnectionOffsets>;
  setEditMode: (enabled: boolean) => void;
  selectLink: (animalType: string, linkIndex: number, linkName: string) => void;
  clearSelection: () => void;
  selectConnectionPoint: (point: "front" | "back" | "tipFront" | "tipBack" | null) => void;
  setConnectionOffset: (
    animalType: string,
    linkIndex: number,
    point: "front" | "back" | "tipFront" | "tipBack",
    position: [number, number, number]
  ) => void;
  getConnectionOffsets: (animalType: string, linkIndex: number) => ConnectionOffsets | undefined;
}

export const useEditModeStore = create<EditModeState>((set, get) => ({
  isEditMode: false,
  selectedLink: null,
  selectedConnectionPoint: null,
  connectionOffsets: {},
  setEditMode: (enabled) =>
    set({
      isEditMode: enabled,
      selectedLink: null,
      selectedConnectionPoint: null,
    }),
  selectLink: (animalType, linkIndex, linkName) =>
    set({ selectedLink: { animalType, linkIndex, linkName }, selectedConnectionPoint: null }),
  clearSelection: () => set({ selectedLink: null, selectedConnectionPoint: null }),
  selectConnectionPoint: (point) => set({ selectedConnectionPoint: point }),
  setConnectionOffset: (animalType, linkIndex, point, position) =>
    set((state) => {
      const key = `${animalType}-${linkIndex}`;
      const existing = state.connectionOffsets[key] ?? {
        front: [0, 0, -0.2],
        back: [0, 0, 0.2],
      };
      return {
        connectionOffsets: {
          ...state.connectionOffsets,
          [key]: { ...existing, [point]: position },
        },
      };
    }),
  getConnectionOffsets: (animalType, linkIndex) => {
    const key = `${animalType}-${linkIndex}`;
    return get().connectionOffsets[key];
  },
}));
