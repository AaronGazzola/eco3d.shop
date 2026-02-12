import type { SceneObject as LayoutSceneObject } from "@/app/layout.types";

export type SceneObject = LayoutSceneObject;

export type EditorTool =
  | "select"
  | "addCube"
  | "addSphere"
  | "addCylinder"
  | "translate"
  | "rotate"
  | "scale";

export type EditorState = {
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  currentTool: EditorTool;
  transformMode: "translate" | "rotate" | "scale";
};
