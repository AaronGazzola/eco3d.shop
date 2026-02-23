"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { usePageStore } from "../page.stores";
import type { ConnectionLimits } from "../page.stores";
import { cn } from "@/lib/utils";
import { LimitedSliderRow } from "./SegmentEditor.sliders";
import { SpherePanel, ColumnPanel, DiagnosticsPanel } from "./SegmentEditor.panels";
import { SegmentScene } from "./SegmentEditor.scene";
import { SimulateScene } from "./SegmentEditor.simulate";
import type { SimDiagnostics } from "./SegmentEditor.simulate";

export type SegmentType = "head" | "body" | "tail";

export type SelectedItem =
  | { type: "collision"; id: string }
  | { type: "frontConnection" }
  | { type: "backConnection" }
  | { type: "frontPoint"; id: string }
  | { type: "backPoint"; id: string }
  | null;

export function SegmentEditor({ segment }: { segment: SegmentType }) {
  const orbitRef = useRef<any>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [ghostMesh, setGhostMesh] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBodyOnHead, setShowBodyOnHead] = useState(false);
  const [bodyActiveGhost, setBodyActiveGhost] = useState<"none" | "body" | "tail">("none");
  const [simulateMode, setSimulateMode] = useState(false);
  const [simDiagnostics, setSimDiagnostics] = useState<SimDiagnostics | null>(null);
  const [simGravity, setSimGravity] = useState(9.8);
  const [simDamping, setSimDamping] = useState(0);

  const {
    bodyConnectionParams, setBodyConnectionParams,
    bodyToBodyConnectionParams, setBodyToBodyConnectionParams,
    bodyToTailConnectionParams, setBodyToTailConnectionParams,
    headBodyLimits, setHeadBodyLimits,
    bodyBodyLimits, setBodyBodyLimits,
    bodyTailLimits, setBodyTailLimits,
  } = usePageStore();

  const {
    collisionSpheres, addCollisionSphere, updateCollisionSphere, removeCollisionSphere,
    frontConnection, updateFrontConnection,
    backConnection, addBackConnection, updateBackConnection, removeBackConnection,
    frontPoints, addFrontPoint, updateFrontPoint, removeFrontPoint,
    backPoints, addBackPoint, updateBackPoint, removeBackPoint,
  } = usePageStore();

  const linkIndex = segment === "tail" ? 0 : segment === "body" ? 1 : 2;
  const segmentKey = `Dragon-${linkIndex}`;

  const colSpheres = collisionSpheres[segmentKey] ?? [];
  const frtConn    = frontConnection[segmentKey];
  const bckConn    = backConnection[segmentKey];
  const frtPoints  = frontPoints[segmentKey] ?? [];
  const bckPoints  = backPoints[segmentKey] ?? [];

  const activeBodyParams =
    bodyActiveGhost === "body" ? bodyToBodyConnectionParams :
    bodyActiveGhost === "tail" ? bodyToTailConnectionParams :
    null;
  const setActiveBodyParams =
    bodyActiveGhost === "body" ? setBodyToBodyConnectionParams :
    bodyActiveGhost === "tail" ? setBodyToTailConnectionParams :
    null;

  let ghostPosition: number | undefined;
  let ghostYaw: number | undefined;
  let ghostPitch: number | undefined;
  let ghostRoll: number | undefined;
  let ghostPieceIndex: number | undefined;
  let ghostFrontConnKey: string | undefined;
  let showGhostMesh = false;

  if (segment === "head") {
    ghostPieceIndex = 1;
    ghostFrontConnKey = "Dragon-1";
    ghostPosition = bodyConnectionParams.position;
    ghostYaw = bodyConnectionParams.yaw;
    ghostPitch = bodyConnectionParams.pitch;
    ghostRoll = bodyConnectionParams.roll;
    showGhostMesh = showBodyOnHead;
  } else if (segment === "body" && bodyActiveGhost !== "none" && activeBodyParams) {
    ghostPieceIndex = bodyActiveGhost === "body" ? 1 : 0;
    ghostFrontConnKey = bodyActiveGhost === "body" ? "Dragon-1" : "Dragon-0";
    ghostPosition = activeBodyParams.position;
    ghostYaw = activeBodyParams.yaw;
    ghostPitch = activeBodyParams.pitch;
    ghostRoll = activeBodyParams.roll;
    showGhostMesh = true;
  }

  const handleCopy = useCallback(() => {
    let data: Record<string, unknown>;
    if (simulateMode && simDiagnostics) {
      data = { ...simDiagnostics };
    } else {
      data = {
        segment,
        collisionSpheres: colSpheres.map(({ position, radius }) => ({ position, radius })),
      };
      if (segment === "tail" || segment === "body") data.frontConnection = frtConn ? { position: frtConn.position, radius: frtConn.radius } : null;
      if (segment === "head" || segment === "body") data.backConnection = bckConn ?? null;
      if (segment === "head") data.frontPoints = frtPoints.map(({ position, radius }) => ({ position, radius }));
      if (segment === "tail") data.backPoints  = bckPoints.map(({ position, radius }) => ({ position, radius }));
      if (segment === "head") {
        data.bodyConnection = { position: bodyConnectionParams.position, yaw: bodyConnectionParams.yaw, pitch: bodyConnectionParams.pitch, roll: bodyConnectionParams.roll };
        data.headBodyLimits = headBodyLimits;
      }
      if (segment === "body") {
        data.bodyConnection = { position: bodyToBodyConnectionParams.position, yaw: bodyToBodyConnectionParams.yaw, pitch: bodyToBodyConnectionParams.pitch, roll: bodyToBodyConnectionParams.roll };
        data.bodyBodyLimits = bodyBodyLimits;
        data.tailConnection = { position: bodyToTailConnectionParams.position, yaw: bodyToTailConnectionParams.yaw, pitch: bodyToTailConnectionParams.pitch, roll: bodyToTailConnectionParams.roll };
        data.bodyTailLimits = bodyTailLimits;
      }
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [simulateMode, simDiagnostics, segment, colSpheres, frtConn, bckConn, frtPoints, bckPoints, bodyConnectionParams, bodyToBodyConnectionParams, bodyToTailConnectionParams, headBodyLimits, bodyBodyLimits, bodyTailLimits]);

  const sel = selectedItem;
  const selectedCollision  = sel?.type === "collision"  ? colSpheres.find((s) => s.id === sel.id) : undefined;
  const selectedFrontPoint = sel?.type === "frontPoint" ? frtPoints.find((s) => s.id === sel.id)  : undefined;
  const selectedBackPoint  = sel?.type === "backPoint"  ? bckPoints.find((s) => s.id === sel.id)  : undefined;

  const simulateChildType = bodyActiveGhost === "tail" ? "tail" : "body";
  const simulateProps = segment === "head"
    ? { mainPieceIndex: 2, childPieceIndex: 1, backColKey: "Dragon-2", frontConnKey: "Dragon-1", initialParams: bodyConnectionParams, limits: headBodyLimits, yawFlip: false }
    : simulateChildType === "tail"
      ? { mainPieceIndex: 1, childPieceIndex: 0, backColKey: "Dragon-1", frontConnKey: "Dragon-0", initialParams: bodyToTailConnectionParams, limits: bodyTailLimits, yawFlip: true }
      : { mainPieceIndex: 1, childPieceIndex: 1, backColKey: "Dragon-1", frontConnKey: "Dragon-1", initialParams: bodyToBodyConnectionParams, limits: bodyBodyLimits, yawFlip: false };

  return (
    <div className="h-full w-full relative">
      <Canvas camera={{ position: [0, 2, 4], fov: 50 }} className="h-full w-full">
        <color attach="background" args={["#87ceeb"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <OrbitControls ref={orbitRef} makeDefault mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.DOLLY }} />
        <Suspense fallback={null}>
          {simulateMode && segment !== "tail" ? (
            <SimulateScene {...simulateProps} orbitRef={orbitRef} onDiagnostics={setSimDiagnostics} gravity={simGravity} damping={simDamping} />
          ) : (
            <SegmentScene
              segment={segment}
              selectedItem={selectedItem}
              onSelect={setSelectedItem}
              orbitRef={orbitRef}
              ghostMesh={ghostMesh}
              showGhostMesh={showGhostMesh}
              ghostPosition={ghostPosition}
              ghostYaw={ghostYaw}
              ghostPitch={ghostPitch}
              ghostRoll={ghostRoll}
              ghostPieceIndex={ghostPieceIndex}
              ghostFrontConnKey={ghostFrontConnKey}
            />
          )}
        </Suspense>
      </Canvas>

      <button
        onClick={handleCopy}
        className={cn(
          "absolute top-4 left-4 z-50 px-4 py-2 rounded-lg font-medium shadow-lg transition-colors pointer-events-auto",
          copied ? "bg-green-600 text-white" : "bg-white/90 hover:bg-white text-black"
        )}
      >
        {copied ? "Copied!" : "Copy Data"}
      </button>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-auto">
        <div className="flex flex-wrap gap-2">
          {!simulateMode && (
            <>
              <button
                onClick={() => addCollisionSphere(segmentKey)}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium shadow-lg transition-colors text-sm"
              >
                + Collision
              </button>
              {(segment === "head" || segment === "body") && !bckConn && (
                <button
                  onClick={() => addBackConnection(segmentKey)}
                  className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium shadow-lg transition-colors text-sm"
                >
                  + Rear Column
                </button>
              )}
              {segment === "head" && (
                <button
                  onClick={() => addFrontPoint(segmentKey)}
                  className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-medium shadow-lg transition-colors text-sm"
                >
                  + Front Point
                </button>
              )}
              {segment === "tail" && (
                <button
                  onClick={() => addBackPoint(segmentKey)}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium shadow-lg transition-colors text-sm"
                >
                  + Back Point
                </button>
              )}
            </>
          )}
          {segment === "head" && !simulateMode && (
            <button
              onClick={() => setShowBodyOnHead((v) => !v)}
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
                onClick={() => setBodyActiveGhost((v) => v === "body" ? "none" : "body")}
                className={cn(
                  "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
                  bodyActiveGhost === "body" ? "bg-black text-white" : "bg-white/90 hover:bg-white text-black"
                )}
              >
                {bodyActiveGhost === "body" ? "Hide Body" : "Show Body"}
              </button>
              <button
                onClick={() => setBodyActiveGhost((v) => v === "tail" ? "none" : "tail")}
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
              onClick={() => setGhostMesh((v) => !v)}
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
              onClick={() => { setSimulateMode((v) => !v); setSimDiagnostics(null); }}
              className={cn(
                "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
                simulateMode ? "bg-orange-500 text-white" : "bg-white/90 hover:bg-white text-black"
              )}
            >
              {simulateMode ? "Stop" : "Simulate"}
            </button>
          )}
        </div>

        {simulateMode && simDiagnostics && (
          <DiagnosticsPanel
            d={simDiagnostics}
            gravity={simGravity}
            damping={simDamping}
            onGravityChange={setSimGravity}
            onDampingChange={setSimDamping}
          />
        )}
        {!simulateMode && selectedCollision && (
          <SpherePanel
            sphere={selectedCollision}
            label="Collision"
            onRadiusChange={(r) => updateCollisionSphere(segmentKey, selectedCollision.id, { radius: r })}
            onDelete={() => { removeCollisionSphere(segmentKey, selectedCollision.id); setSelectedItem(null); }}
          />
        )}
        {!simulateMode && sel?.type === "frontConnection" && frtConn && (
          <SpherePanel
            sphere={frtConn}
            label="Front Connection"
            onRadiusChange={(r) => updateFrontConnection(segmentKey, { radius: r })}
          />
        )}
        {!simulateMode && sel?.type === "backConnection" && bckConn && (
          <ColumnPanel
            col={bckConn}
            onUpdate={(updates) => updateBackConnection(segmentKey, updates)}
            onDelete={() => { removeBackConnection(segmentKey); setSelectedItem(null); }}
          />
        )}
        {!simulateMode && selectedFrontPoint && (
          <SpherePanel
            sphere={selectedFrontPoint}
            label="Front Point"
            onRadiusChange={(r) => updateFrontPoint(segmentKey, selectedFrontPoint.id, { radius: r })}
            onDelete={() => { removeFrontPoint(segmentKey, selectedFrontPoint.id); setSelectedItem(null); }}
          />
        )}
        {!simulateMode && selectedBackPoint && (
          <SpherePanel
            sphere={selectedBackPoint}
            label="Back Point"
            onRadiusChange={(r) => updateBackPoint(segmentKey, selectedBackPoint.id, { radius: r })}
            onDelete={() => { removeBackPoint(segmentKey, selectedBackPoint.id); setSelectedItem(null); }}
          />
        )}
        {!simulateMode && segment === "head" && (
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
        )}
        {!simulateMode && segment === "body" && bodyActiveGhost !== "none" && activeBodyParams && setActiveBodyParams && (
          <div className="bg-white/90 rounded-lg p-3 shadow-lg flex flex-col gap-2 min-w-56">
            <span className="text-sm font-medium text-black">
              {bodyActiveGhost === "body" ? "Body Connection" : "Tail Connection"}
            </span>
            {(() => {
              const limits: ConnectionLimits = bodyActiveGhost === "body" ? bodyBodyLimits : bodyTailLimits;
              const setLimits = bodyActiveGhost === "body" ? setBodyBodyLimits : setBodyTailLimits;
              const yawOffset = bodyActiveGhost === "tail" ? Math.PI : 0;
              return (
                <>
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
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
