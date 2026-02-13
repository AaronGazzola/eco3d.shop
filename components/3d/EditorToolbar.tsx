"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditorTool =
  | "select"
  | "addCube"
  | "addSphere"
  | "addCylinder"
  | "translate"
  | "rotate"
  | "scale";

type EditorToolbarProps = {
  currentTool: EditorTool;
  transformMode: "translate" | "rotate" | "scale";
  onToolChange: (tool: EditorTool) => void;
  onTransformModeChange: (mode: "translate" | "rotate" | "scale") => void;
  onSave: () => void;
  onSubmit: () => void;
  onExport: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
};

export function EditorToolbar({
  currentTool,
  transformMode,
  onToolChange,
  onTransformModeChange,
  onSave,
  onSubmit,
  onExport,
  isSaving = false,
  isSubmitting = false,
}: EditorToolbarProps) {
  const tools = [
    {
      id: "select" as const,
      label: "Select",
      shortcut: "Q",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
        </svg>
      ),
    },
    {
      id: "addCube" as const,
      label: "Cube",
      shortcut: null,
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
        </svg>
      ),
    },
    {
      id: "addSphere" as const,
      label: "Sphere",
      shortcut: null,
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
        </svg>
      ),
    },
    {
      id: "addCylinder" as const,
      label: "Cylinder",
      shortcut: null,
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M9 2a1 1 0 011-1h4a1 1 0 011 1v20a1 1 0 01-1 1h-4a1 1 0 01-1-1V2z"></path>
        </svg>
      ),
    },
  ];

  const transformModes = [
    { id: "translate" as const, label: "Move", shortcut: "W" },
    { id: "rotate" as const, label: "Rotate", shortcut: "E" },
    { id: "scale" as const, label: "Scale", shortcut: "R" },
  ];

  return (
    <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 mr-2">Tools:</span>
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={currentTool === tool.id ? "default" : "outline"}
            size="sm"
            onClick={() => onToolChange(tool.id)}
            className="gap-2"
            title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
            {tool.shortcut && (
              <kbd className="hidden sm:inline text-[10px] opacity-50 ml-0.5">
                {tool.shortcut}
              </kbd>
            )}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 mr-2">Transform:</span>
        {transformModes.map((mode) => (
          <Button
            key={mode.id}
            variant={transformMode === mode.id ? "default" : "outline"}
            size="sm"
            onClick={() => onTransformModeChange(mode.id)}
            title={`${mode.label} (${mode.shortcut})`}
          >
            {mode.label}
            <kbd className="hidden sm:inline text-[10px] opacity-50 ml-1">
              {mode.shortcut}
            </kbd>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onExport}>
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit for Review"}
        </Button>
      </div>
    </div>
  );
}
