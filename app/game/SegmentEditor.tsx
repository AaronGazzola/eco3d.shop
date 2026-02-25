"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { usePageStore } from "../page.stores";
import type { ConnectionLimits } from "../page.stores";
import { cn } from "@/lib/utils";
import { SpherePanel, ColumnPanel, DiagnosticsPanel } from "./SegmentEditor.panels";
import { SegmentScene } from "./SegmentEditor.scene";
import { SimulateScene } from "./SegmentEditor.simulate";
import type { SimDiagnostics } from "./SegmentEditor.simulate";
import { SegmentEditorToolbar } from "./SegmentEditor.toolbar";
import { HeadBodyConnectionPanel, BodyConnectionPanel } from "./SegmentEditor.connections";
import type { SegmentType, SelectedItem } from "./SegmentEditor.types";

export type { SegmentType, SelectedItem };

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
        <SegmentEditorToolbar
          segment={segment}
          simulateMode={simulateMode}
          showBodyOnHead={showBodyOnHead}
          bodyActiveGhost={bodyActiveGhost}
          ghostMesh={ghostMesh}
          hasBckConn={!!bckConn}
          onAddCollision={() => addCollisionSphere(segmentKey)}
          onAddRearColumn={() => addBackConnection(segmentKey)}
          onAddFrontPoint={() => addFrontPoint(segmentKey)}
          onAddBackPoint={() => addBackPoint(segmentKey)}
          onToggleShowBodyOnHead={() => setShowBodyOnHead((v) => !v)}
          onSetBodyActiveGhost={setBodyActiveGhost}
          onToggleGhostMesh={() => setGhostMesh((v) => !v)}
          onToggleSimulate={() => { setSimulateMode((v) => !v); setSimDiagnostics(null); }}
        />

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
          <HeadBodyConnectionPanel
            bodyConnectionParams={bodyConnectionParams}
            setBodyConnectionParams={setBodyConnectionParams}
            headBodyLimits={headBodyLimits}
            setHeadBodyLimits={setHeadBodyLimits}
          />
        )}
        {!simulateMode && segment === "body" && bodyActiveGhost !== "none" && activeBodyParams && setActiveBodyParams && (
          <BodyConnectionPanel
            bodyActiveGhost={bodyActiveGhost as "body" | "tail"}
            activeBodyParams={activeBodyParams}
            setActiveBodyParams={setActiveBodyParams}
            bodyBodyLimits={bodyBodyLimits}
            bodyTailLimits={bodyTailLimits}
            setBodyBodyLimits={setBodyBodyLimits}
            setBodyTailLimits={setBodyTailLimits}
          />
        )}
      </div>
    </div>
  );
}
