import { create } from "zustand";

type UIState = {
  isDrawerOpen: boolean;
  toggleDrawer: (open?: boolean) => void;
};

export const useUIStore = create<UIState>(set => ({
  isDrawerOpen: false,
  toggleDrawer: open =>
    set(state => ({ isDrawerOpen: open ?? !state.isDrawerOpen })),
}));
