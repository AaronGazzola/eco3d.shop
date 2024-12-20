// hooks/useProductStore.ts
import { ImageSize } from "@/types/product.types";
import { create } from "zustand";

interface ProductState {
  size: ImageSize;
  colors: string[];
  primaryMessage: string;
  secondaryMessage: string;
  setSize: (size: ImageSize) => void;
  setColors: (colors: string[]) => void;
  setPrimaryMessage: (message: string) => void;
  setSecondaryMessage: (message: string) => void;
  resetState: () => void;
}

const DEFAULT_COLORS = ["Natural", "Black"];

const initialState = {
  size: "Small" as ImageSize,
  colors: DEFAULT_COLORS,
  primaryMessage: "",
  secondaryMessage: "",
};

export const useProductStore = create<ProductState>((set) => ({
  ...initialState,
  setSize: (size) => set({ size }),
  setColors: (colors) => set({ colors }),
  setPrimaryMessage: (primaryMessage) => set({ primaryMessage }),
  setSecondaryMessage: (secondaryMessage) => set({ secondaryMessage }),
  resetState: () => set(initialState),
}));
