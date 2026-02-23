"use client";

import { SliderRow } from "./SegmentEditor.sliders";
import type { Sphere, ColumnShape } from "../page.stores";
import type { SimDiagnostics } from "./SegmentEditor.simulate";

export function SpherePanel({
  sphere, label, onRadiusChange, onDelete,
}: {
  sphere: Sphere;
  label: string;
  onRadiusChange: (radius: number) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="bg-white/90 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-48">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-black">{label}</span>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-xs px-2 py-0.5 rounded text-red-600 hover:text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
      <SliderRow label="Radius" value={sphere.radius} min={0.01} max={0.5} step={0.005} onChange={onRadiusChange} />
    </div>
  );
}

export function ColumnPanel({ col, onUpdate, onDelete }: {
  col: ColumnShape;
  onUpdate: (updates: Partial<ColumnShape>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white/90 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-56">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-black">Rear Connection Column</span>
        <button
          onClick={onDelete}
          className="text-xs px-2 py-0.5 rounded text-red-600 hover:text-white hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
      <SliderRow label="Height"  value={col.height} min={0.01} max={2}    step={0.01}  onChange={(v) => onUpdate({ height: v })} />
      <SliderRow label="Radius"  value={col.radius} min={0.005} max={0.5} step={0.005} onChange={(v) => onUpdate({ radius: v })} />
      <SliderRow label="Curve"   value={col.curve}  min={-2}   max={2}    step={0.05}  onChange={(v) => onUpdate({ curve: v })} />
      <SliderRow label="Rot X"   value={col.rotationX}   min={-Math.PI} max={Math.PI} step={0.05} onChange={(v) => onUpdate({ rotationX: v })} />
      <SliderRow label="Rot Y"   value={col.rotationY}   min={-Math.PI} max={Math.PI} step={0.05} onChange={(v) => onUpdate({ rotationY: v })} />
      <SliderRow label="Rot Z"   value={col.rotationZ}   min={-Math.PI} max={Math.PI} step={0.05} onChange={(v) => onUpdate({ rotationZ: v })} />
    </div>
  );
}

function DiagRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex justify-between text-xs ${highlight ? "text-orange-600 font-medium" : "text-gray-700"}`}>
      <span>{label}</span>
      <span className="font-mono">{value.toFixed(3)}</span>
    </div>
  );
}

export function DiagnosticsPanel({ d, gravity, damping, onGravityChange, onDampingChange }: {
  d: SimDiagnostics;
  gravity: number;
  damping: number;
  onGravityChange: (v: number) => void;
  onDampingChange: (v: number) => void;
}) {
  const atYawMin   = Math.abs(d.yaw   - 0) < 0.001 || d.yawVel   === 0 && Math.abs(d.torqueYaw)   > 0.01;
  const atPitchMin = Math.abs(d.pitch - 0) < 0.001 || d.pitchVel === 0 && Math.abs(d.torquePitch) > 0.01;
  const atRollMin  = Math.abs(d.roll  - 0) < 0.001 || d.rollVel  === 0 && Math.abs(d.torqueRoll)  > 0.01;

  return (
    <div className="bg-white/90 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-56">
      <span className="text-sm font-medium text-black">Connection State</span>
      <SliderRow label="Damping" value={damping} min={0} max={8} step={0.1} onChange={onDampingChange} />
      <SliderRow label="Gravity" value={gravity} min={0} max={30} step={0.5} onChange={onGravityChange} />
      <div className="flex flex-col gap-0.5">
        <DiagRow label="Position" value={d.position} />
        <DiagRow label="Yaw"      value={d.yaw}   highlight={d.yawVel   === 0 && Math.abs(d.torqueYaw)   > 0.01} />
        <DiagRow label="Pitch"    value={d.pitch} highlight={d.pitchVel === 0 && Math.abs(d.torquePitch) > 0.01} />
        <DiagRow label="Roll"     value={d.roll}  highlight={d.rollVel  === 0 && Math.abs(d.torqueRoll)  > 0.01} />
      </div>
      <span className="text-xs font-medium text-gray-500 pt-1 border-t border-gray-100">Angular Velocity</span>
      <div className="flex flex-col gap-0.5">
        <DiagRow label="Yaw vel"   value={d.yawVel} />
        <DiagRow label="Pitch vel" value={d.pitchVel} />
        <DiagRow label="Roll vel"  value={d.rollVel} />
      </div>
      <span className="text-xs font-medium text-gray-500 pt-1 border-t border-gray-100">Gravity Torque</span>
      <div className="flex flex-col gap-0.5">
        <DiagRow label="Yaw"   value={d.torqueYaw} />
        <DiagRow label="Pitch" value={d.torquePitch} />
        <DiagRow label="Roll"  value={d.torqueRoll} />
      </div>
    </div>
  );
}
