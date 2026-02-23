"use client";

import { useRef } from "react";

export function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs text-gray-700">
        <span>{label}</span>
        <span className="font-mono">{step < 1 ? value.toFixed(2) : value.toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function LimitedSliderRow({ label, value, min, max, step, onChange, limitMin, limitMax, onSetMin, onSetMax }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  limitMin: number; limitMax: number;
  onSetMin: (v: number) => void; onSetMax: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ value, limitMin, limitMax, onChange, onSetMin, onSetMax });
  stateRef.current = { value, limitMin, limitMax, onChange, onSetMin, onSetMax };

  const toPercent = (v: number) => Math.max(0, Math.min(100, (v - min) / (max - min) * 100));

  const startDrag = (which: "value" | "limitMin" | "limitMax") => (e: React.PointerEvent) => {
    e.preventDefault();
    const onMove = (ev: PointerEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const snapped = Math.round((ratio * (max - min) + min) / step) * step;
      const s = stateRef.current;
      if (which === "value") s.onChange(Math.max(s.limitMin, Math.min(s.limitMax, snapped)));
      else if (which === "limitMin") s.onSetMin(Math.min(snapped, s.limitMax));
      else s.onSetMax(Math.max(snapped, s.limitMin));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs text-gray-700">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(2)}</span>
      </div>
      <div ref={trackRef} className="relative h-5 flex items-center mx-1.5 select-none">
        <div className="absolute inset-x-0 h-1 bg-gray-200 rounded-full" />
        <div
          className="absolute h-1 bg-gray-300 rounded-full pointer-events-none"
          style={{ left: `${toPercent(limitMin)}%`, right: `${100 - toPercent(limitMax)}%` }}
        />
        <div
          className="absolute w-1 h-4 bg-gray-500 rounded-full cursor-ew-resize -translate-x-1/2 hover:bg-gray-700 z-10"
          style={{ left: `${toPercent(limitMin)}%` }}
          onPointerDown={startDrag("limitMin")}
        />
        <div
          className="absolute w-1 h-4 bg-gray-500 rounded-full cursor-ew-resize -translate-x-1/2 hover:bg-gray-700 z-10"
          style={{ left: `${toPercent(limitMax)}%` }}
          onPointerDown={startDrag("limitMax")}
        />
        <div
          className="absolute w-3 h-3 bg-black rounded-full cursor-ew-resize -translate-x-1/2 z-20 hover:bg-gray-700"
          style={{ left: `${toPercent(value)}%` }}
          onPointerDown={startDrag("value")}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
        <span>{limitMin.toFixed(2)}</span>
        <span>{limitMax.toFixed(2)}</span>
      </div>
    </div>
  );
}
