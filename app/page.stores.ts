import { create } from "zustand";

interface ConnectionOffsets {
  front: [number, number, number];
  back: [number, number, number];
  tipFront?: [number, number, number];
  tipBack?: [number, number, number];
}

interface RotationLimitPair {
  positive: number;
  negative: number;
}

interface RotationLimit {
  front?: RotationLimitPair;
  back?: RotationLimitPair;
  tipFront?: RotationLimitPair;
  tipBack?: RotationLimitPair;
}

interface EditModeState {
  isEditMode: boolean;
  selectedLink: { animalType: string; linkIndex: number; linkName: string } | null;
  selectedConnectionPoint: "front" | "back" | "tipFront" | "tipBack" | null;
  connectionOffsets: Record<string, ConnectionOffsets>;
  rotationLimits: Record<string, RotationLimit>;
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
  setRotationLimit: (
    animalType: string,
    linkIndex: number,
    point: "front" | "back" | "tipFront" | "tipBack",
    side: "positive" | "negative",
    angle: number
  ) => void;
  getRotationLimit: (
    animalType: string,
    linkIndex: number,
    point: "front" | "back" | "tipFront" | "tipBack",
    side: "positive" | "negative"
  ) => number;
}

export const useEditModeStore = create<EditModeState>((set, get) => ({
  isEditMode: false,
  selectedLink: null,
  selectedConnectionPoint: null,
  connectionOffsets: {},
  rotationLimits: {},
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
  setRotationLimit: (animalType, linkIndex, point, side, angle) =>
    set((state) => {
      const key = `${animalType}-${linkIndex}`;
      const existing = state.rotationLimits[key] ?? {};
      const existingPoint = existing[point] ?? { positive: Math.PI / 4, negative: Math.PI / 4 };
      return {
        rotationLimits: {
          ...state.rotationLimits,
          [key]: {
            ...existing,
            [point]: {
              ...existingPoint,
              [side]: angle,
            },
          },
        },
      };
    }),
  getRotationLimit: (animalType, linkIndex, point, side) => {
    const key = `${animalType}-${linkIndex}`;
    const limits = get().rotationLimits[key];

    if (limits?.[point]?.[side] !== undefined) {
      return limits[point][side];
    }

    const defaults: Record<string, Record<string, { positive: number; negative: number }>> = {
      "Dragon-0": {
        front: { positive: 2.5656340004316647, negative: 1.9373154697137058 }
      },
      "Dragon-1": {
        front: { positive: 2.1467549799530254, negative: 1.902408884673819 },
        back: { positive: 1.7627825445142729, negative: 1.4835298641951802 }
      },
      "Dragon-2": {
        back: { positive: 1.5184364492350666, negative: 1.6929693744344996 }
      }
    };

    return defaults[key]?.[point]?.[side] ?? Math.PI / 4;
  },
}));
