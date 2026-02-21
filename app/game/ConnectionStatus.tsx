"use client";

import { Fragment, useState } from "react";
import { usePageStore } from "../page.stores";
import type { BodyConnectionParams, ConnectionLimits } from "../page.stores";

function fmt(v: number) {
  return v.toFixed(3);
}

function fmtShort(v: number) {
  return v.toFixed(2);
}

function ValueRow({
  label,
  value,
  min,
  max,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
}) {
  const ok = value >= min && value <= max;
  return (
    <Fragment>
      <span className="text-white/40">{label}</span>
      <span className={ok ? "text-green-400" : "text-red-400"}>{fmt(value)}</span>
      <span className="text-white/25 text-[10px]">[{fmtShort(min)},{fmtShort(max)}]</span>
    </Fragment>
  );
}

function ConnectionBlock({
  label,
  params,
  limits,
}: {
  label: string;
  params: BodyConnectionParams;
  limits: ConnectionLimits;
}) {
  return (
    <div>
      <div className="mb-1 text-white/50">{label}</div>
      <div className="grid grid-cols-[3rem_4rem_auto] gap-x-2 gap-y-0.5">
        <ValueRow label="pos"   value={params.position} min={limits.positionMin} max={limits.positionMax} />
        <ValueRow label="yaw"   value={params.yaw}      min={limits.yawMin}      max={limits.yawMax} />
        <ValueRow label="pitch" value={params.pitch}    min={limits.pitchMin}    max={limits.pitchMax} />
        <ValueRow label="roll"  value={params.roll}     min={limits.rollMin}     max={limits.rollMax} />
      </div>
    </div>
  );
}

export function ConnectionStatus() {
  const [open, setOpen] = useState(true);
  const {
    liveJointValues,
    bodyConnectionParams,
    bodyToBodyConnectionParams,
    bodyToTailConnectionParams,
    headBodyLimits,
    bodyBodyLimits,
    bodyTailLimits,
  } = usePageStore();

  const headBody = liveJointValues?.headBody ?? bodyConnectionParams;
  const bodyBody = liveJointValues?.bodyBody ?? bodyToBodyConnectionParams;
  const bodyTail = liveJointValues?.bodyTail ?? bodyToTailConnectionParams;

  const handleCopy = () => {
    const data = {
      headBody: { params: headBody, limits: headBodyLimits },
      bodyBody: { params: bodyBody, limits: bodyBodyLimits },
      bodyTail: { params: bodyTail, limits: bodyTailLimits },
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="pointer-events-auto absolute top-4 left-4 z-10 min-w-[210px] rounded-lg bg-black/60 font-mono text-xs text-white shadow-lg">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-white/60">{open ? "▾" : "▸"}</span>
          <span className="font-medium">Connections</span>
        </button>
        <button
          onClick={handleCopy}
          className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/20"
        >
          Copy
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-white/20 px-3 pb-3 pt-2">
          <ConnectionBlock label="Head → Body" params={headBody} limits={headBodyLimits} />
          <ConnectionBlock label="Body → Body" params={bodyBody} limits={bodyBodyLimits} />
          <ConnectionBlock label="Body → Tail" params={bodyTail} limits={bodyTailLimits} />
        </div>
      )}
    </div>
  );
}
