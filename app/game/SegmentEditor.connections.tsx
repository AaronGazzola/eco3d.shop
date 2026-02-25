"use client";

import { LimitedSliderRow } from "./SegmentEditor.sliders";
import type { BodyConnectionParams, ConnectionLimits } from "../page.stores";

type HeadBodyConnectionPanelProps = {
  bodyConnectionParams: BodyConnectionParams;
  setBodyConnectionParams: (params: Partial<BodyConnectionParams>) => void;
  headBodyLimits: ConnectionLimits;
  setHeadBodyLimits: (limits: Partial<ConnectionLimits>) => void;
};

export function HeadBodyConnectionPanel({
  bodyConnectionParams, setBodyConnectionParams, headBodyLimits, setHeadBodyLimits,
}: HeadBodyConnectionPanelProps) {
  return (
    <div className="bg-white/90 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-56">
      <span className="text-sm font-medium text-black">Body Connection</span>
      <LimitedSliderRow label="Position" value={bodyConnectionParams.position} min={0} max={1} step={0.01}
        onChange={(v) => setBodyConnectionParams({ position: v })}
        limitMin={headBodyLimits.positionMin} limitMax={headBodyLimits.positionMax}
        onSetMin={(v) => setHeadBodyLimits({ positionMin: v })}
        onSetMax={(v) => setHeadBodyLimits({ positionMax: v })}
      />
      <LimitedSliderRow label="Yaw" value={bodyConnectionParams.yaw} min={-Math.PI} max={Math.PI} step={0.05}
        onChange={(v) => setBodyConnectionParams({ yaw: v })}
        limitMin={headBodyLimits.yawMin} limitMax={headBodyLimits.yawMax}
        onSetMin={(v) => setHeadBodyLimits({ yawMin: v })}
        onSetMax={(v) => setHeadBodyLimits({ yawMax: v })}
      />
      <LimitedSliderRow label="Pitch" value={bodyConnectionParams.pitch} min={-Math.PI} max={Math.PI} step={0.05}
        onChange={(v) => setBodyConnectionParams({ pitch: v })}
        limitMin={headBodyLimits.pitchMin} limitMax={headBodyLimits.pitchMax}
        onSetMin={(v) => setHeadBodyLimits({ pitchMin: v })}
        onSetMax={(v) => setHeadBodyLimits({ pitchMax: v })}
      />
      <LimitedSliderRow label="Roll" value={bodyConnectionParams.roll} min={-Math.PI} max={Math.PI} step={0.05}
        onChange={(v) => setBodyConnectionParams({ roll: v })}
        limitMin={headBodyLimits.rollMin} limitMax={headBodyLimits.rollMax}
        onSetMin={(v) => setHeadBodyLimits({ rollMin: v })}
        onSetMax={(v) => setHeadBodyLimits({ rollMax: v })}
      />
    </div>
  );
}

type BodyConnectionPanelProps = {
  bodyActiveGhost: "body" | "tail";
  activeBodyParams: BodyConnectionParams;
  setActiveBodyParams: (params: Partial<BodyConnectionParams>) => void;
  bodyBodyLimits: ConnectionLimits;
  bodyTailLimits: ConnectionLimits;
  setBodyBodyLimits: (limits: Partial<ConnectionLimits>) => void;
  setBodyTailLimits: (limits: Partial<ConnectionLimits>) => void;
};

export function BodyConnectionPanel({
  bodyActiveGhost, activeBodyParams, setActiveBodyParams,
  bodyBodyLimits, bodyTailLimits, setBodyBodyLimits, setBodyTailLimits,
}: BodyConnectionPanelProps) {
  const limits: ConnectionLimits = bodyActiveGhost === "body" ? bodyBodyLimits : bodyTailLimits;
  const setLimits = bodyActiveGhost === "body" ? setBodyBodyLimits : setBodyTailLimits;
  const yawOffset = bodyActiveGhost === "tail" ? Math.PI : 0;

  return (
    <div className="bg-white/90 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-56">
      <span className="text-sm font-medium text-black">
        {bodyActiveGhost === "body" ? "Body Connection" : "Tail Connection"}
      </span>
      <LimitedSliderRow label="Position" value={activeBodyParams.position} min={0} max={1} step={0.01}
        onChange={(v) => setActiveBodyParams({ position: v })}
        limitMin={limits.positionMin} limitMax={limits.positionMax}
        onSetMin={(v) => setLimits({ positionMin: v })}
        onSetMax={(v) => setLimits({ positionMax: v })}
      />
      <LimitedSliderRow label="Yaw" value={activeBodyParams.yaw - yawOffset} min={-Math.PI} max={Math.PI} step={0.05}
        onChange={(v) => setActiveBodyParams({ yaw: v + yawOffset })}
        limitMin={limits.yawMin - yawOffset} limitMax={limits.yawMax - yawOffset}
        onSetMin={(v) => setLimits({ yawMin: v + yawOffset })}
        onSetMax={(v) => setLimits({ yawMax: v + yawOffset })}
      />
      <LimitedSliderRow label="Pitch" value={activeBodyParams.pitch} min={-Math.PI} max={Math.PI} step={0.05}
        onChange={(v) => setActiveBodyParams({ pitch: v })}
        limitMin={limits.pitchMin} limitMax={limits.pitchMax}
        onSetMin={(v) => setLimits({ pitchMin: v })}
        onSetMax={(v) => setLimits({ pitchMax: v })}
      />
      <LimitedSliderRow label="Roll" value={activeBodyParams.roll} min={-Math.PI} max={Math.PI} step={0.05}
        onChange={(v) => setActiveBodyParams({ roll: v })}
        limitMin={limits.rollMin} limitMax={limits.rollMax}
        onSetMin={(v) => setLimits({ rollMin: v })}
        onSetMax={(v) => setLimits({ rollMax: v })}
      />
    </div>
  );
}
