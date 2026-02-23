"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSplitStl } from "./StlModel";
import { usePageStore } from "../page.stores";
import { buildAlignmentFrame } from "./DragonCharacter.math";
import type { BodyConnectionParams, ConnectionLimits } from "../page.stores";

export type SimDiagnostics = {
  position: number;
  yaw: number; pitch: number; roll: number;
  yawVel: number; pitchVel: number; rollVel: number;
  torqueYaw: number; torquePitch: number; torqueRoll: number;
};

function clampVel(val: number, vel: number, min: number, max: number): [number, number] {
  if (val < min) return [min, vel < 0 ? 0 : vel];
  if (val > max) return [max, vel > 0 ? 0 : vel];
  return [val, vel];
}

export function SimulateScene({
  mainPieceIndex,
  childPieceIndex,
  backColKey,
  frontConnKey,
  initialParams,
  limits,
  orbitRef,
  onDiagnostics,
  gravity,
  damping,
  yawFlip,
}: {
  mainPieceIndex: number;
  childPieceIndex: number;
  backColKey: string;
  frontConnKey: string;
  initialParams: BodyConnectionParams;
  limits: ConnectionLimits;
  orbitRef: React.RefObject<any>;
  onDiagnostics?: (d: SimDiagnostics) => void;
  gravity: number;
  damping: number;
  yawFlip: boolean;
}) {
  const pieces = useSplitStl("/models/Bone_Dragon-1.stl");
  const frameCount = useRef(0);
  const { backConnection, frontConnection } = usePageStore();

  const mainGroupRef = useRef<THREE.Group>(null);
  const childGroupRef = useRef<THREE.Group>(null);
  const mainQuat = useRef(new THREE.Quaternion());
  const sim = useRef({
    yaw: initialParams.yaw, pitch: initialParams.pitch, roll: initialParams.roll,
    yawVel: 0, pitchVel: 0, rollVel: 0,
  });

  const isDragging = useRef(false);
  const lastPtr = useRef({ x: 0, y: 0 });
  const { gl } = useThree();

  useEffect(() => {
    const orbit = orbitRef.current;
    if (orbit) orbit.enableRotate = false;
    return () => { if (orbitRef.current) orbitRef.current.enableRotate = true; };
  }, [orbitRef]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      lastPtr.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = (e.clientX - lastPtr.current.x) * 0.008;
      const dy = (e.clientY - lastPtr.current.y) * 0.008;
      lastPtr.current = { x: e.clientX, y: e.clientY };
      mainQuat.current
        .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -dx))
        .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -dy));
    };
    const onUp = (e: PointerEvent) => { if (e.button === 0) isDragging.current = false; };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const backCol = backConnection[backColKey];
    const frontConn = frontConnection[frontConnKey];
    if (!backCol || !frontConn || !mainGroupRef.current || !childGroupRef.current) return;

    const mq = mainQuat.current;
    const s = sim.current;
    const dt = Math.min(delta, 0.05);

    mainGroupRef.current.quaternion.copy(mq);

    const { normalWorld, tangentWorld, binormalWorld, qAlign } = buildAlignmentFrame(mq, backCol, frontConn);
    const childQuat = new THREE.Quaternion()
      .setFromAxisAngle(normalWorld,   s.roll)
      .multiply(new THREE.Quaternion().setFromAxisAngle(tangentWorld,  s.yaw))
      .multiply(new THREE.Quaternion().setFromAxisAngle(binormalWorld, s.pitch))
      .multiply(qAlign);

    const colQuat = mq.clone().multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(backCol.rotationX, backCol.rotationY, backCol.rotationZ))
    );
    const attachPt = new THREE.Vector3(0, (initialParams.position - 0.5) * backCol.height, 0)
      .applyQuaternion(colQuat)
      .add(new THREE.Vector3(...backCol.center).applyQuaternion(mq));
    const childPos = attachPt.clone().sub(new THREE.Vector3(...frontConn.position).applyQuaternion(childQuat));

    childGroupRef.current.position.copy(childPos);
    childGroupRef.current.quaternion.copy(childQuat);

    const r = new THREE.Vector3(...frontConn.position).applyQuaternion(childQuat).negate();
    const torque = new THREE.Vector3().crossVectors(r, new THREE.Vector3(0, -1, 0));

    const tYaw   = torque.dot(tangentWorld) * (yawFlip ? -1 : 1);
    const tPitch = torque.dot(binormalWorld);
    const tRoll  = torque.dot(normalWorld);

    s.yawVel   += tYaw   * gravity * dt;
    s.pitchVel += tPitch * gravity * dt;
    s.rollVel  += tRoll  * gravity * dt;

    const damp = Math.max(0, 1 - damping * dt);
    s.yawVel *= damp; s.pitchVel *= damp; s.rollVel *= damp;

    s.yaw   += s.yawVel   * dt;
    s.pitch += s.pitchVel * dt;
    s.roll  += s.rollVel  * dt;

    [s.yaw,   s.yawVel]   = clampVel(s.yaw,   s.yawVel,   limits.yawMin,   limits.yawMax);
    [s.pitch, s.pitchVel] = clampVel(s.pitch, s.pitchVel, limits.pitchMin, limits.pitchMax);
    [s.roll,  s.rollVel]  = clampVel(s.roll,  s.rollVel,  limits.rollMin,  limits.rollMax);

    frameCount.current++;
    if (onDiagnostics && frameCount.current % 6 === 0) {
      onDiagnostics({
        position: initialParams.position,
        yaw: s.yaw, pitch: s.pitch, roll: s.roll,
        yawVel: s.yawVel, pitchVel: s.pitchVel, rollVel: s.rollVel,
        torqueYaw: tYaw, torquePitch: tPitch, torqueRoll: tRoll,
      });
    }
  });

  const mainPiece = pieces[mainPieceIndex];
  const childPiece = pieces[childPieceIndex];
  if (!mainPiece || !childPiece) return null;

  return (
    <>
      <group ref={mainGroupRef}>
        <mesh geometry={mainPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} />
        </mesh>
      </group>
      <group ref={childGroupRef}>
        <mesh geometry={childPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} transparent opacity={0.75} />
        </mesh>
      </group>
    </>
  );
}
