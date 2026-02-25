"use client";

import { cn } from "@/lib/utils";
import type { SegmentType } from "./SegmentEditor.types";

type Props = {
  segment: SegmentType;
  simulateMode: boolean;
  showBodyOnHead: boolean;
  bodyActiveGhost: "none" | "body" | "tail";
  ghostMesh: boolean;
  hasBckConn: boolean;
  onAddCollision: () => void;
  onAddRearColumn: () => void;
  onAddFrontPoint: () => void;
  onAddBackPoint: () => void;
  onToggleShowBodyOnHead: () => void;
  onSetBodyActiveGhost: (val: "none" | "body" | "tail") => void;
  onToggleGhostMesh: () => void;
  onToggleSimulate: () => void;
};

export function SegmentEditorToolbar({
  segment, simulateMode, showBodyOnHead, bodyActiveGhost, ghostMesh, hasBckConn,
  onAddCollision, onAddRearColumn, onAddFrontPoint, onAddBackPoint,
  onToggleShowBodyOnHead, onSetBodyActiveGhost, onToggleGhostMesh, onToggleSimulate,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {!simulateMode && (
        <>
          <button
            onClick={onAddCollision}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium shadow-lg transition-colors text-sm"
          >
            + Collision
          </button>
          {(segment === "head" || segment === "body") && !hasBckConn && (
            <button
              onClick={onAddRearColumn}
              className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium shadow-lg transition-colors text-sm"
            >
              + Rear Column
            </button>
          )}
          {segment === "head" && (
            <button
              onClick={onAddFrontPoint}
              className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-medium shadow-lg transition-colors text-sm"
            >
              + Front Point
            </button>
          )}
          {segment === "tail" && (
            <button
              onClick={onAddBackPoint}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium shadow-lg transition-colors text-sm"
            >
              + Back Point
            </button>
          )}
        </>
      )}
      {segment === "head" && !simulateMode && (
        <button
          onClick={onToggleShowBodyOnHead}
          className={cn(
            "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
            showBodyOnHead ? "bg-black text-white" : "bg-white/90 hover:bg-white text-black"
          )}
        >
          {showBodyOnHead ? "Hide Body" : "Show Body"}
        </button>
      )}
      {segment === "body" && (
        <>
          <button
            onClick={() => onSetBodyActiveGhost(bodyActiveGhost === "body" ? "none" : "body")}
            className={cn(
              "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
              bodyActiveGhost === "body" ? "bg-black text-white" : "bg-white/90 hover:bg-white text-black"
            )}
          >
            {bodyActiveGhost === "body" ? "Hide Body" : "Show Body"}
          </button>
          <button
            onClick={() => onSetBodyActiveGhost(bodyActiveGhost === "tail" ? "none" : "tail")}
            className={cn(
              "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
              bodyActiveGhost === "tail" ? "bg-black text-white" : "bg-white/90 hover:bg-white text-black"
            )}
          >
            {bodyActiveGhost === "tail" ? "Hide Tail" : "Show Tail"}
          </button>
        </>
      )}
      {!simulateMode && (
        <button
          onClick={onToggleGhostMesh}
          className={cn(
            "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
            ghostMesh ? "bg-black text-white" : "bg-white/90 hover:bg-white text-black"
          )}
        >
          Ghost
        </button>
      )}
      {segment !== "tail" && (
        <button
          onClick={onToggleSimulate}
          className={cn(
            "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
            simulateMode ? "bg-orange-500 text-white" : "bg-white/90 hover:bg-white text-black"
          )}
        >
          {simulateMode ? "Stop" : "Simulate"}
        </button>
      )}
    </div>
  );
}
