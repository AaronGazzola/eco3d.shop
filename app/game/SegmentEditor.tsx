"use client";

import { Suspense, useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useSplitStl } from "./StlModel";
import { usePageStore, Sphere, ColumnShape } from "../page.stores";
import { cn } from "@/lib/utils";
import type { ConnectionLimits } from "../page.stores";

export type SegmentType = "head" | "body" | "tail";

const segmentToIndex: Record<SegmentType, number> = { tail: 0, body: 1, head: 2 };

type SelectedItem =
  | { type: "collision"; id: string }
  | { type: "frontConnection" }
  | { type: "backConnection" }
  | { type: "frontPoint"; id: string }
  | { type: "backPoint"; id: string }
  | null;

function makeTransformHandlers(orbitRef: React.RefObject<any>) {
  return {
    onMouseDown: () => { if (orbitRef.current) orbitRef.current.enabled = false; },
    onMouseUp:   () => { if (orbitRef.current) orbitRef.current.enabled = true; },
  };
}

function SliderRow({ label, value, min, max, step, onChange }: {
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

function LimitedSliderRow({ label, value, min, max, step, onChange, limitMin, limitMax, onSetMin, onSetMax }: {
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

function SphereObj({
  sphere, color, emissive, isSelected, onSelect, orbitRef, onMove,
}: {
  sphere: Sphere;
  color: string;
  emissive: string;
  isSelected: boolean;
  onSelect: () => void;
  orbitRef: React.RefObject<any>;
  onMove: (pos: [number, number, number]) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <>
      <mesh
        ref={meshRef}
        position={sphere.position}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[sphere.radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSelected ? 1.2 : 0.6}
          transparent
          opacity={isSelected ? 0.85 : 0.65}
          toneMapped={false}
        />
      </mesh>
      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"
          size={0.6}
          {...makeTransformHandlers(orbitRef)}
          onObjectChange={() => {
            if (!meshRef.current) return;
            const p = meshRef.current.position;
            onMove([p.x, p.y, p.z]);
          }}
        />
      )}
    </>
  );
}

function BackConnectionHandle({
  col, isSelected, onSelect, orbitRef, onCenterMove,
}: {
  col: ColumnShape;
  isSelected: boolean;
  onSelect: () => void;
  orbitRef: React.RefObject<any>;
  onCenterMove: (pos: [number, number, number]) => void;
}) {
  const centerRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(col.rotationX, col.rotationY, col.rotationZ, "XYZ"));
    const origin = new THREE.Vector3(col.center[0], col.center[1], col.center[2]);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16 - 0.5;
      pts.push(new THREE.Vector3(col.curve * (0.25 - t * t), t * col.height, 0).applyQuaternion(quat).add(origin));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, col.radius, 8, false);
  }, [col.center[0], col.center[1], col.center[2], col.height, col.radius, col.curve, col.rotationX, col.rotationY, col.rotationZ]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <mesh geometry={geometry} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <meshStandardMaterial
          color="#ff4466"
          emissive="#cc0022"
          emissiveIntensity={isSelected ? 1.2 : 0.6}
          transparent
          opacity={isSelected ? 0.85 : 0.65}
          toneMapped={false}
        />
      </mesh>

      <mesh
        ref={centerRef}
        position={col.center}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ff8800"
          emissiveIntensity={1.5}
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </mesh>

      {isSelected && centerRef.current && (
        <TransformControls
          object={centerRef.current}
          mode="translate"
          size={0.6}
          {...makeTransformHandlers(orbitRef)}
          onObjectChange={() => {
            if (!centerRef.current) return;
            const p = centerRef.current.position;
            onCenterMove([p.x, p.y, p.z]);
          }}
        />
      )}
    </>
  );
}

function SegmentScene({
  segment, selectedItem, onSelect, orbitRef, ghostMesh, showGhostMesh,
  ghostPosition, ghostYaw, ghostPitch, ghostRoll, ghostPieceIndex, ghostFrontConnKey,
}: {
  segment: SegmentType;
  selectedItem: SelectedItem;
  onSelect: (item: SelectedItem) => void;
  orbitRef: React.RefObject<any>;
  ghostMesh: boolean;
  showGhostMesh: boolean;
  ghostPosition?: number;
  ghostYaw?: number;
  ghostPitch?: number;
  ghostRoll?: number;
  ghostPieceIndex?: number;
  ghostFrontConnKey?: string;
}) {
  const pieces = useSplitStl("/models/Bone_Dragon-1.stl");
  const linkIndex = segmentToIndex[segment];
  const piece = pieces[linkIndex];
  const segmentKey = `Dragon-${linkIndex}`;
  const {
    collisionSpheres, frontConnection, backConnection, frontPoints, backPoints,
    updateCollisionSphere, updateFrontConnection, updateBackConnection, updateFrontPoint, updateBackPoint,
  } = usePageStore();

  const colSpheres  = collisionSpheres[segmentKey] ?? [];
  const frtConn     = frontConnection[segmentKey];
  const bckConn     = backConnection[segmentKey];
  const frtPoints   = frontPoints[segmentKey] ?? [];
  const bckPoints   = backPoints[segmentKey] ?? [];

  const hasFrontConn = segment === "tail" || segment === "body";
  const hasBackConn  = segment === "head" || segment === "body";

  const ghostFrontConn = ghostFrontConnKey ? frontConnection[ghostFrontConnKey] : undefined;
  const ghostPiece = ghostPieceIndex !== undefined ? pieces[ghostPieceIndex] : undefined;

  const ghostPreview = useMemo(() => {
    if (ghostPosition === undefined || ghostPieceIndex === undefined || ghostFrontConnKey === undefined || !bckConn) return null;
    const t = ghostPosition - 0.5;
    const colQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(bckConn.rotationX, bckConn.rotationY, bckConn.rotationZ)
    );
    const attachPt = new THREE.Vector3(0, t * bckConn.height, 0)
      .applyQuaternion(colQuat)
      .add(new THREE.Vector3(...bckConn.center));
    const normalWorld = new THREE.Vector3(-bckConn.height, 0, 0)
      .normalize().applyQuaternion(colQuat);
    const tangentWorld = new THREE.Vector3(0, bckConn.height, 0)
      .normalize().applyQuaternion(colQuat);
    const binormalWorld = tangentWorld.clone().cross(normalWorld).normalize();

    const ap = [attachPt.x, attachPt.y, attachPt.z] as [number, number, number];
    const discRot = (axis: THREE.Vector3) => {
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis));
      return [e.x, e.y, e.z] as [number, number, number];
    };
    const cylRot = (axis: THREE.Vector3) => {
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis));
      return [e.x, e.y, e.z] as [number, number, number];
    };
    const axMid = (axis: THREE.Vector3) => {
      const p = attachPt.clone().add(axis.clone().multiplyScalar(0.125));
      return [p.x, p.y, p.z] as [number, number, number];
    };

    let bodyGhost: { pos: [number,number,number]; rotation: [number,number,number]; geo: THREE.BufferGeometry } | null = null;
    if (ghostFrontConn && ghostPiece) {
      const frontDir = new THREE.Vector3(...ghostFrontConn.position).normalize();
      const localUpRef = new THREE.Vector3(0, 1, 0);
      let localUp = localUpRef.clone().sub(frontDir.clone().multiplyScalar(localUpRef.dot(frontDir)));
      if (localUp.lengthSq() < 0.001) {
        const alt = new THREE.Vector3(0, 0, 1);
        localUp = alt.clone().sub(frontDir.clone().multiplyScalar(alt.dot(frontDir)));
      }
      localUp.normalize();
      const localRight = new THREE.Vector3().crossVectors(frontDir, localUp).normalize();
      const mLocal = new THREE.Matrix4().makeBasis(localRight, localUp, frontDir.clone().negate());
      const mWorld = new THREE.Matrix4().makeBasis(binormalWorld, tangentWorld, normalWorld.clone());
      const qAlign = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().multiplyMatrices(mWorld, mLocal.clone().transpose())
      );
      const qPitch = new THREE.Quaternion().setFromAxisAngle(binormalWorld, ghostPitch ?? 0);
      const qYaw   = new THREE.Quaternion().setFromAxisAngle(tangentWorld,  ghostYaw ?? 0);
      const qRoll  = new THREE.Quaternion().setFromAxisAngle(normalWorld,   ghostRoll ?? 0);
      const tailQuat = qRoll.clone().multiply(qYaw).multiply(qPitch).multiply(qAlign);
      const tailPos = attachPt.clone().sub(new THREE.Vector3(...ghostFrontConn.position).applyQuaternion(tailQuat));
      const euler = new THREE.Euler().setFromQuaternion(tailQuat);
      bodyGhost = {
        pos: [tailPos.x, tailPos.y, tailPos.z],
        rotation: [euler.x, euler.y, euler.z],
        geo: ghostPiece.geometry,
      };
    }

    return {
      attachPt: ap,
      yaw:   { discRot: discRot(tangentWorld),  axisMid: axMid(tangentWorld),  axisRot: cylRot(tangentWorld)  },
      pitch: { discRot: discRot(binormalWorld), axisMid: axMid(binormalWorld), axisRot: cylRot(binormalWorld) },
      roll:  { discRot: discRot(normalWorld),   axisMid: axMid(normalWorld),   axisRot: cylRot(normalWorld)   },
      bodyGhost,
    };
  }, [ghostPosition, ghostYaw, ghostRoll, ghostPitch, ghostPieceIndex, ghostFrontConnKey, bckConn, ghostFrontConn, ghostPiece]);

  if (!piece) return null;

  return (
    <>
    <group onClick={() => onSelect(null)}>
      <mesh geometry={piece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#c9b18c"
          metalness={0.3}
          roughness={0.6}
          transparent
          opacity={ghostMesh ? 0.25 : 1}
        />
      </mesh>

      {colSpheres.map((s) => (
        <SphereObj
          key={s.id}
          sphere={s}
          color="#44bbff"
          emissive="#1166ff"
          isSelected={selectedItem?.type === "collision" && selectedItem.id === s.id}
          onSelect={() => onSelect({ type: "collision", id: s.id })}
          orbitRef={orbitRef}
          onMove={(pos) => updateCollisionSphere(segmentKey, s.id, { position: pos })}
        />
      ))}

      {hasFrontConn && frtConn && (
        <SphereObj
          sphere={frtConn}
          color="#33ff88"
          emissive="#00cc44"
          isSelected={selectedItem?.type === "frontConnection"}
          onSelect={() => onSelect({ type: "frontConnection" })}
          orbitRef={orbitRef}
          onMove={(pos) => updateFrontConnection(segmentKey, { position: pos })}
        />
      )}

      {hasBackConn && bckConn && (
        <BackConnectionHandle
          col={bckConn}
          isSelected={selectedItem?.type === "backConnection"}
          onSelect={() => onSelect({ type: "backConnection" })}
          orbitRef={orbitRef}
          onCenterMove={(pos) => updateBackConnection(segmentKey, { center: pos })}
        />
      )}

      {segment === "head" && frtPoints.map((s) => (
        <SphereObj
          key={s.id}
          sphere={s}
          color="#ffee00"
          emissive="#cc9900"
          isSelected={selectedItem?.type === "frontPoint" && selectedItem.id === s.id}
          onSelect={() => onSelect({ type: "frontPoint", id: s.id })}
          orbitRef={orbitRef}
          onMove={(pos) => updateFrontPoint(segmentKey, s.id, { position: pos })}
        />
      ))}

      {segment === "tail" && bckPoints.map((s) => (
        <SphereObj
          key={s.id}
          sphere={s}
          color="#cc44ff"
          emissive="#8800cc"
          isSelected={selectedItem?.type === "backPoint" && selectedItem.id === s.id}
          onSelect={() => onSelect({ type: "backPoint", id: s.id })}
          orbitRef={orbitRef}
          onMove={(pos) => updateBackPoint(segmentKey, s.id, { position: pos })}
        />
      ))}
    </group>
    {ghostPreview && showGhostMesh && ghostPreview.bodyGhost && (
      <group position={ghostPreview.bodyGhost.pos} rotation={ghostPreview.bodyGhost.rotation}>
        <mesh geometry={ghostPreview.bodyGhost.geo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} transparent opacity={0.4} />
        </mesh>
      </group>
    )}
    {ghostPreview && (
      <>
        <mesh position={ghostPreview.attachPt} rotation={ghostPreview.yaw.discRot}>
          <circleGeometry args={[0.2, 48]} />
          <meshBasicMaterial color="#4499ff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={ghostPreview.yaw.axisMid} rotation={ghostPreview.yaw.axisRot}>
          <cylinderGeometry args={[0.008, 0.008, 0.25, 8]} />
          <meshBasicMaterial color="#4499ff" />
        </mesh>
        <mesh position={ghostPreview.attachPt} rotation={ghostPreview.pitch.discRot}>
          <circleGeometry args={[0.2, 48]} />
          <meshBasicMaterial color="#44ff88" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={ghostPreview.pitch.axisMid} rotation={ghostPreview.pitch.axisRot}>
          <cylinderGeometry args={[0.008, 0.008, 0.25, 8]} />
          <meshBasicMaterial color="#44ff88" />
        </mesh>
        <mesh position={ghostPreview.attachPt} rotation={ghostPreview.roll.discRot}>
          <circleGeometry args={[0.2, 48]} />
          <meshBasicMaterial color="#ff8844" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={ghostPreview.roll.axisMid} rotation={ghostPreview.roll.axisRot}>
          <cylinderGeometry args={[0.008, 0.008, 0.25, 8]} />
          <meshBasicMaterial color="#ff8844" />
        </mesh>
      </>
    )}
    </>
  );
}

function SpherePanel({
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

function ColumnPanel({ col, onUpdate, onDelete }: {
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

export function SegmentEditor({ segment }: { segment: SegmentType }) {
  const orbitRef = useRef<any>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [ghostMesh, setGhostMesh] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBodyOnHead, setShowBodyOnHead] = useState(false);
  const [bodyActiveGhost, setBodyActiveGhost] = useState<"none" | "body" | "tail">("none");

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

  const linkIndex = segmentToIndex[segment];
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
    const data: Record<string, unknown> = {
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
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [segment, colSpheres, frtConn, bckConn, frtPoints, bckPoints, bodyConnectionParams, bodyToBodyConnectionParams, bodyToTailConnectionParams, headBodyLimits, bodyBodyLimits, bodyTailLimits]);

  const sel = selectedItem;
  const selectedCollision  = sel?.type === "collision"  ? colSpheres.find((s) => s.id === sel.id) : undefined;
  const selectedFrontPoint = sel?.type === "frontPoint" ? frtPoints.find((s) => s.id === sel.id)  : undefined;
  const selectedBackPoint  = sel?.type === "backPoint"  ? bckPoints.find((s) => s.id === sel.id)  : undefined;

  return (
    <div className="h-full w-full relative">
      <Canvas camera={{ position: [0, 2, 4], fov: 50 }} className="h-full w-full">
        <color attach="background" args={["#87ceeb"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <OrbitControls ref={orbitRef} makeDefault />
        <Suspense fallback={null}>
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
          {segment === "head" && (
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
          <button
            onClick={() => setGhostMesh((v) => !v)}
            className={cn(
              "px-3 py-2 rounded-lg font-medium shadow-lg transition-colors text-sm",
              ghostMesh ? "bg-black text-white" : "bg-white/90 hover:bg-white text-black"
            )}
          >
            Ghost
          </button>
        </div>

        {selectedCollision && (
          <SpherePanel
            sphere={selectedCollision}
            label="Collision"
            onRadiusChange={(r) => updateCollisionSphere(segmentKey, selectedCollision.id, { radius: r })}
            onDelete={() => { removeCollisionSphere(segmentKey, selectedCollision.id); setSelectedItem(null); }}
          />
        )}
        {sel?.type === "frontConnection" && frtConn && (
          <SpherePanel
            sphere={frtConn}
            label="Front Connection"
            onRadiusChange={(r) => updateFrontConnection(segmentKey, { radius: r })}
          />
        )}
        {sel?.type === "backConnection" && bckConn && (
          <ColumnPanel
            col={bckConn}
            onUpdate={(updates) => updateBackConnection(segmentKey, updates)}
            onDelete={() => { removeBackConnection(segmentKey); setSelectedItem(null); }}
          />
        )}
        {selectedFrontPoint && (
          <SpherePanel
            sphere={selectedFrontPoint}
            label="Front Point"
            onRadiusChange={(r) => updateFrontPoint(segmentKey, selectedFrontPoint.id, { radius: r })}
            onDelete={() => { removeFrontPoint(segmentKey, selectedFrontPoint.id); setSelectedItem(null); }}
          />
        )}
        {selectedBackPoint && (
          <SpherePanel
            sphere={selectedBackPoint}
            label="Back Point"
            onRadiusChange={(r) => updateBackPoint(segmentKey, selectedBackPoint.id, { radius: r })}
            onDelete={() => { removeBackPoint(segmentKey, selectedBackPoint.id); setSelectedItem(null); }}
          />
        )}
        {segment === "head" && (
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
        {segment === "body" && bodyActiveGhost !== "none" && activeBodyParams && setActiveBodyParams && (
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
