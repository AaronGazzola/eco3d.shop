"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  gravity: number;
  onGravityChange: (v: number) => void;
  damping: number;
  onDampingChange: (v: number) => void;
  collisionPush: number;
  onCollisionPushChange: (v: number) => void;
  constraintIters: number;
  onConstraintItersChange: (v: number) => void;
  dragStrength: number;
  onDragStrengthChange: (v: number) => void;
  pickThreshold: number;
  onPickThresholdChange: (v: number) => void;
  floorPush: number;
  onFloorPushChange: (v: number) => void;
  yawLimitsOn: boolean;
  onYawLimitsToggle: () => void;
  collisionSkip: number;
  onCollisionSkipChange: (v: number) => void;
  headMoveSpeed: number;
  onHeadMoveSpeedChange: (v: number) => void;
  collapsed: boolean;
  onCollapsedToggle: () => void;
  copied: boolean;
  onCopy: () => void;
};

export function GameSlidersPanel({
  gravity, onGravityChange,
  damping, onDampingChange,
  collisionPush, onCollisionPushChange,
  constraintIters, onConstraintItersChange,
  dragStrength, onDragStrengthChange,
  pickThreshold, onPickThresholdChange,
  floorPush, onFloorPushChange,
  yawLimitsOn, onYawLimitsToggle,
  collisionSkip, onCollisionSkipChange,
  headMoveSpeed, onHeadMoveSpeedChange,
  collapsed, onCollapsedToggle,
  copied, onCopy,
}: Props) {
  return (
    <div className="absolute top-4 left-4 w-52 flex flex-col gap-2 pointer-events-auto bg-black/50 backdrop-blur-sm rounded-xl p-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onCollapsedToggle}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        {!collapsed && (
          <button
            onClick={onCopy}
            className={cn(
              "flex-1 px-3 h-7 rounded-lg text-xs font-medium transition-colors",
              copied ? "bg-green-500 text-white" : "bg-white/90 hover:bg-white text-black",
            )}
          >
            {copied ? "Copied!" : "Copy State"}
          </button>
        )}
      </div>

      {!collapsed && (<>
        <label className="flex items-center justify-between text-xs text-white/80">
          <span>Gravity</span>
          <span className="tabular-nums">{gravity.toFixed(1)}</span>
        </label>
        <input type="range" min={0} max={30} step={0.1} value={gravity} onChange={(e) => onGravityChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Damping</span>
          <span className="tabular-nums">{damping.toFixed(2)}</span>
        </label>
        <input type="range" min={0} max={1} step={0.005} value={damping} onChange={(e) => onDampingChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Collision Push</span>
          <span className="tabular-nums">{collisionPush.toFixed(2)}</span>
        </label>
        <input type="range" min={0} max={2} step={0.01} value={collisionPush} onChange={(e) => onCollisionPushChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Constraint Iters</span>
          <span className="tabular-nums">{constraintIters}</span>
        </label>
        <input type="range" min={1} max={50} step={1} value={constraintIters} onChange={(e) => onConstraintItersChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Drag Strength</span>
          <span className="tabular-nums">{dragStrength.toFixed(2)}</span>
        </label>
        <input type="range" min={0.05} max={1} step={0.05} value={dragStrength} onChange={(e) => onDragStrengthChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Pick Threshold</span>
          <span className="tabular-nums">{pickThreshold.toFixed(2)}</span>
        </label>
        <input type="range" min={0.1} max={1} step={0.05} value={pickThreshold} onChange={(e) => onPickThresholdChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Floor Push</span>
          <span className="tabular-nums">{floorPush.toFixed(2)}</span>
        </label>
        <input type="range" min={0} max={1} step={0.05} value={floorPush} onChange={(e) => onFloorPushChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <button
          onClick={onYawLimitsToggle}
          className={cn(
            "mt-1 px-3 h-7 rounded-lg text-xs font-medium transition-colors",
            yawLimitsOn ? "bg-white/90 text-black" : "bg-white/20 hover:bg-white/40 text-white/70",
          )}
        >
          {yawLimitsOn ? "Yaw Limits: On" : "Yaw Limits: Off"}
        </button>

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Head Speed (W/S)</span>
          <span className="tabular-nums">{headMoveSpeed.toFixed(1)}</span>
        </label>
        <input type="range" min={0} max={20} step={0.5} value={headMoveSpeed} onChange={(e) => onHeadMoveSpeedChange(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Skip Neighbors</span>
          <span className="tabular-nums">{collisionSkip}</span>
        </label>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => onCollisionSkipChange(n)}
              className={cn(
                "flex-1 h-7 rounded-lg text-xs font-medium transition-colors",
                collisionSkip === n ? "bg-white/90 text-black" : "bg-white/20 hover:bg-white/40 text-white/70",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </>)}
    </div>
  );
}
