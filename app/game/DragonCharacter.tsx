"use client";

import { Suspense, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { usePageStore } from "../page.stores";
import { useSplitStl } from "./StlModel";
import type { DragonPiece } from "./StlModel";
import type { Segment, SegDef } from "./DragonCharacter.types";
import {
  MAX_SEGMENTS,
  DEFAULT_MOVE_SPEED,
  DEFAULT_ROLL_SPEED,
  DEFAULT_PITCH_SPEED,
  DEFAULT_FOLLOW_SPEED,
  BANK_TURN_STRENGTH,
  THROTTLE_ACCEL_MULT,
  THROTTLE_DECAY,
  INIT_HEAD_Y,
} from "./DragonCharacter.constants";
import { buildSegDef, getLimits, clampRelQuat, initSegments, pieceKey } from "./DragonCharacter.utils";

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _identity = new THREE.Quaternion();
const _worldUp = new THREE.Vector3(0, 1, 0);

function DragonString({
  pieces,
  ghost,
  moveSpeed,
  rollSpeed,
  pitchSpeed,
  followSpeed,
}: {
  pieces: DragonPiece[];
  ghost: boolean;
  moveSpeed: number;
  rollSpeed: number;
  pitchSpeed: number;
  followSpeed: number;
}) {
  const {
    bodyLinkCount,
    frontConnection,
    backConnection,
    frontPoints,
    backPoints,
    headBodyLimits,
    bodyBodyLimits,
    bodyTailLimits,
  } = usePageStore();

  const segCount = Math.min(bodyLinkCount, 50) + 2;

  const headFront = frontPoints["Dragon-2"]?.[0]?.position;
  const headBack = backConnection["Dragon-2"]?.center;
  const bodyFront = frontConnection["Dragon-1"]?.position;
  const bodyBack = backConnection["Dragon-1"]?.center;
  const tailFront = frontConnection["Dragon-0"]?.position;
  const tailBack = backPoints["Dragon-0"]?.[0]?.position;

  const defs: SegDef[] = [];
  for (let i = 0; i < segCount; i++) {
    defs.push(buildSegDef(i, segCount, headFront, headBack, bodyFront, bodyBack, tailFront, tailBack));
  }
  const segDefs = useRef(defs);
  segDefs.current = defs;

  const segments = useRef<Segment[]>(
    Array.from({ length: MAX_SEGMENTS }, () => ({
      worldQuat: new THREE.Quaternion(),
      frontPos: new THREE.Vector3(),
    }))
  );
  const segGroupRefs = useRef<(THREE.Group | null)[]>(Array(MAX_SEGMENTS).fill(null));
  const segPositions = useRef<THREE.Vector3[]>(Array.from({ length: MAX_SEGMENTS }, () => new THREE.Vector3()));
  const segQuats = useRef<THREE.Quaternion[]>(Array.from({ length: MAX_SEGMENTS }, () => new THREE.Quaternion()));

  const initialized = useRef(false);
  const prevSegCount = useRef(-1);
  const throttle = useRef(0);
  const keys = useRef<Set<string>>(new Set());

  if (!initialized.current || segCount !== prevSegCount.current) {
    initSegments(segments.current, defs, segCount, INIT_HEAD_Y);
    throttle.current = 0;
    initialized.current = true;
    prevSegCount.current = segCount;
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const segs = segments.current;
    const sd = segDefs.current;
    const k = keys.current;

    const rollInput = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
    const pitchInput = (k.has("arrowup") ? 1 : 0) - (k.has("arrowdown") ? 1 : 0);
    const throttleInput = (k.has("w") ? 1 : 0) - (k.has("s") ? 1 : 0);

    if (rollInput !== 0) {
      _q2.setFromAxisAngle(_v.set(1, 0, 0), -rollInput * rollSpeed * dt);
      segs[0].worldQuat.multiply(_q2).normalize();
    }
    if (pitchInput !== 0) {
      _q2.setFromAxisAngle(_v.set(0, 0, 1), pitchInput * pitchSpeed * dt);
      segs[0].worldQuat.multiply(_q2).normalize();
    }

    _v.set(0, 0, 1).applyQuaternion(segs[0].worldQuat);
    _q2.setFromAxisAngle(_worldUp, -_v.y * BANK_TURN_STRENGTH * dt);
    segs[0].worldQuat.premultiply(_q2).normalize();

    throttle.current = throttleInput !== 0
      ? Math.max(-moveSpeed, Math.min(moveSpeed, throttle.current + throttleInput * moveSpeed * THROTTLE_ACCEL_MULT * dt))
      : throttle.current * THROTTLE_DECAY;

    _v.set(1, 0, 0).applyQuaternion(segs[0].worldQuat);
    segs[0].frontPos.addScaledVector(_v, throttle.current * dt);

    for (let i = 1; i < segCount; i++) {
      const parent = segs[i - 1];
      const seg = segs[i];
      const psd = sd[i - 1];

      _q.copy(parent.worldQuat).invert();
      _q2.copy(_q).multiply(seg.worldQuat);
      _q2.slerp(_identity, followSpeed * dt);
      clampRelQuat(_q2, getLimits(i, segCount, headBodyLimits, bodyBodyLimits, bodyTailLimits));

      seg.worldQuat.copy(parent.worldQuat).multiply(_q2);
      _v.copy(psd.localAxis).multiplyScalar(psd.restLength).applyQuaternion(parent.worldQuat);
      seg.frontPos.copy(parent.frontPos).add(_v);
    }

    for (let i = 0; i < segCount; i++) {
      const seg = segs[i];
      const psd = sd[i];
      _v.copy(psd.frontLocal).applyQuaternion(seg.worldQuat);
      segPositions.current[i].copy(seg.frontPos).sub(_v);
      segQuats.current[i].copy(seg.worldQuat);
    }

    for (let i = 0; i < segCount; i++) {
      const g = segGroupRefs.current[i];
      if (!g) continue;
      g.position.copy(segPositions.current[i]);
      g.quaternion.copy(segQuats.current[i]);
    }
  });

  const headPiece = pieces.find((p) => p.label === "Head")!;
  const bodyPiece = pieces.find((p) => p.label === "Body")!;
  const tailPiece = pieces.find((p) => p.label === "Tail")!;
  const effectiveLinkCount = segCount - 2;
  const mat = (
    <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} transparent={ghost} opacity={ghost ? 0.35 : 1} />
  );

  return (
    <>
      <group ref={(el) => { segGroupRefs.current[0] = el; }}>
        <mesh geometry={headPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>{mat}</mesh>
      </group>

      {Array.from({ length: effectiveLinkCount }, (_, i) => (
        <group key={pieceKey(i + 1, segCount)} ref={(el) => { segGroupRefs.current[i + 1] = el; }}>
          <mesh geometry={bodyPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>{mat}</mesh>
        </group>
      ))}

      <group ref={(el) => { segGroupRefs.current[effectiveLinkCount + 1] = el; }}>
        <mesh geometry={tailPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>{mat}</mesh>
      </group>
    </>
  );
}

export function DragonCharacter({
  ghost = true,
  moveSpeed = DEFAULT_MOVE_SPEED,
  rollSpeed = DEFAULT_ROLL_SPEED,
  pitchSpeed = DEFAULT_PITCH_SPEED,
  followSpeed = DEFAULT_FOLLOW_SPEED,
}: {
  ghost?: boolean;
  moveSpeed?: number;
  rollSpeed?: number;
  pitchSpeed?: number;
  followSpeed?: number;
}) {
  const pieces = useSplitStl("/models/Bone_Dragon-1.stl");
  if (pieces.length < 3) return null;
  return (
    <Suspense fallback={null}>
      <DragonString
        pieces={pieces}
        ghost={ghost}
        moveSpeed={moveSpeed}
        rollSpeed={rollSpeed}
        pitchSpeed={pitchSpeed}
        followSpeed={followSpeed}
      />
    </Suspense>
  );
}
