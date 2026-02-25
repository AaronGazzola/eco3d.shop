"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useSplitStl } from "./StlModel";
import { usePageStore } from "../page.stores";
import type { SegmentType, SelectedItem } from "./SegmentEditor.types";
import { SphereObj, BackConnectionHandle } from "./SegmentEditor.objects";
import { DRAGON_MODEL_URL } from "./DragonCharacter.constants";

const segmentToIndex: Record<SegmentType, number> = { tail: 0, body: 1, head: 2 };

export function SegmentScene({
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
  const pieces = useSplitStl(DRAGON_MODEL_URL);
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
    const normalWorld = new THREE.Vector3(-bckConn.height, 0, 0).normalize().applyQuaternion(colQuat);
    const tangentWorld = new THREE.Vector3(0, bckConn.height, 0).normalize().applyQuaternion(colQuat);
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
      bodyGhost = { pos: [tailPos.x, tailPos.y, tailPos.z], rotation: [euler.x, euler.y, euler.z], geo: ghostPiece.geometry };
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
          <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} transparent opacity={ghostMesh ? 0.25 : 1} />
        </mesh>

        {colSpheres.map((s) => (
          <SphereObj key={s.id} sphere={s} color="#44bbff" emissive="#1166ff"
            isSelected={selectedItem?.type === "collision" && selectedItem.id === s.id}
            onSelect={() => onSelect({ type: "collision", id: s.id })}
            orbitRef={orbitRef} onMove={(pos) => updateCollisionSphere(segmentKey, s.id, { position: pos })} />
        ))}

        {hasFrontConn && frtConn && (
          <SphereObj sphere={frtConn} color="#33ff88" emissive="#00cc44"
            isSelected={selectedItem?.type === "frontConnection"}
            onSelect={() => onSelect({ type: "frontConnection" })}
            orbitRef={orbitRef} onMove={(pos) => updateFrontConnection(segmentKey, { position: pos })} />
        )}

        {hasBackConn && bckConn && (
          <BackConnectionHandle col={bckConn}
            isSelected={selectedItem?.type === "backConnection"}
            onSelect={() => onSelect({ type: "backConnection" })}
            orbitRef={orbitRef} onCenterMove={(pos) => updateBackConnection(segmentKey, { center: pos })} />
        )}

        {segment === "head" && frtPoints.map((s) => (
          <SphereObj key={s.id} sphere={s} color="#ffee00" emissive="#cc9900"
            isSelected={selectedItem?.type === "frontPoint" && selectedItem.id === s.id}
            onSelect={() => onSelect({ type: "frontPoint", id: s.id })}
            orbitRef={orbitRef} onMove={(pos) => updateFrontPoint(segmentKey, s.id, { position: pos })} />
        ))}

        {segment === "tail" && bckPoints.map((s) => (
          <SphereObj key={s.id} sphere={s} color="#cc44ff" emissive="#8800cc"
            isSelected={selectedItem?.type === "backPoint" && selectedItem.id === s.id}
            onSelect={() => onSelect({ type: "backPoint", id: s.id })}
            orbitRef={orbitRef} onMove={(pos) => updateBackPoint(segmentKey, s.id, { position: pos })} />
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
            <circleGeometry args={[0.2, 48]} /><meshBasicMaterial color="#4499ff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={ghostPreview.yaw.axisMid} rotation={ghostPreview.yaw.axisRot}>
            <cylinderGeometry args={[0.008, 0.008, 0.25, 8]} /><meshBasicMaterial color="#4499ff" />
          </mesh>
          <mesh position={ghostPreview.attachPt} rotation={ghostPreview.pitch.discRot}>
            <circleGeometry args={[0.2, 48]} /><meshBasicMaterial color="#44ff88" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={ghostPreview.pitch.axisMid} rotation={ghostPreview.pitch.axisRot}>
            <cylinderGeometry args={[0.008, 0.008, 0.25, 8]} /><meshBasicMaterial color="#44ff88" />
          </mesh>
          <mesh position={ghostPreview.attachPt} rotation={ghostPreview.roll.discRot}>
            <circleGeometry args={[0.2, 48]} /><meshBasicMaterial color="#ff8844" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={ghostPreview.roll.axisMid} rotation={ghostPreview.roll.axisRot}>
            <cylinderGeometry args={[0.008, 0.008, 0.25, 8]} /><meshBasicMaterial color="#ff8844" />
          </mesh>
        </>
      )}
    </>
  );
}
