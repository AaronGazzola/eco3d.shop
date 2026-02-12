import { create } from "zustand";
import type { SceneObject, EditorTool } from "./page.types";

type EditorStore = {
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  currentTool: EditorTool;
  transformMode: "translate" | "rotate" | "scale";
  setSceneObjects: (objects: SceneObject[]) => void;
  addObject: (object: SceneObject) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;
  setSelectedObjectId: (id: string | null) => void;
  setCurrentTool: (tool: EditorTool) => void;
  setTransformMode: (mode: "translate" | "rotate" | "scale") => void;
  clearScene: () => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  sceneObjects: [],
  selectedObjectId: null,
  currentTool: "select",
  transformMode: "translate",

  setSceneObjects: (objects) => set({ sceneObjects: objects }),

  addObject: (object) =>
    set((state) => ({
      sceneObjects: [...state.sceneObjects, object],
      selectedObjectId: object.id,
    })),

  updateObject: (id, updates) =>
    set((state) => ({
      sceneObjects: state.sceneObjects.map((obj) =>
        obj.id === id ? { ...obj, ...updates } : obj
      ),
    })),

  removeObject: (id) =>
    set((state) => ({
      sceneObjects: state.sceneObjects.filter((obj) => obj.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
    })),

  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

  setCurrentTool: (tool) => set({ currentTool: tool }),

  setTransformMode: (mode) => set({ transformMode: mode }),

  clearScene: () =>
    set({ sceneObjects: [], selectedObjectId: null, currentTool: "select" }),
}));
