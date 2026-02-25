import * as THREE from "three";
import type { SegDef, Segment } from "./DragonCharacter.types";
import type { ConnectionLimits } from "../page.stores";

export function pieceKey(i: number, total: number): string {
  if (i === 0) return "Dragon-2";
  if (i === total - 1) return "Dragon-0";
  return "Dragon-1";
}

export function buildSegDef(
  index: number,
  segCount: number,
  headFront?: [number, number, number],
  headBack?: [number, number, number],
  bodyFront?: [number, number, number],
  bodyBack?: [number, number, number],
  tailFront?: [number, number, number],
  tailBack?: [number, number, number],
): SegDef {
  const isHead = index === 0;
  const isTail = index === segCount - 1;

  const fl: [number, number, number] = isHead
    ? (headFront ?? [0.96, -0.12, 0.07])
    : isTail
    ? (tailFront ?? [-0.15, -0.19, 0.03])
    : (bodyFront ?? [0.12, -0.17, -0.01]);

  const bl: [number, number, number] = isHead
    ? (headBack ?? [0.15, -0.14, -0.01])
    : isTail
    ? (tailBack ?? [-0.9, -0.26, 0.3])
    : (bodyBack ?? [-0.13, -0.15, 0.02]);

  const frontLocal = new THREE.Vector3(...fl);
  const axis = new THREE.Vector3(...bl).sub(frontLocal);
  const restLength = axis.length();
  if (restLength > 0.0001) axis.divideScalar(restLength);

  return { frontLocal, localAxis: axis, restLength };
}

export function getLimits(
  i: number,
  segCount: number,
  headBodyLimits: ConnectionLimits,
  bodyBodyLimits: ConnectionLimits,
  bodyTailLimits: ConnectionLimits,
): ConnectionLimits {
  if (i === 1) return headBodyLimits;
  if (i === segCount - 1) return bodyTailLimits;
  return bodyBodyLimits;
}

const _euler = new THREE.Euler();

export function clampRelQuat(quat: THREE.Quaternion, limits: ConnectionLimits): void {
  _euler.setFromQuaternion(quat, "YXZ");
  _euler.y = Math.max(limits.yawMin, Math.min(limits.yawMax, _euler.y));
  _euler.x = Math.max(limits.pitchMin, Math.min(limits.pitchMax, _euler.x));
  _euler.z = Math.max(limits.rollMin, Math.min(limits.rollMax, _euler.z));
  quat.setFromEuler(_euler);
}

export function initSegments(
  segments: Segment[],
  defs: SegDef[],
  segCount: number,
  headY: number,
): void {
  segments[0].worldQuat.identity();
  segments[0].frontPos.set(0, headY, 0);
  for (let i = 0; i < segCount - 1; i++) {
    segments[i + 1].worldQuat.identity();
    segments[i + 1].frontPos.set(
      segments[i].frontPos.x + defs[i].localAxis.x * defs[i].restLength,
      segments[i].frontPos.y + defs[i].localAxis.y * defs[i].restLength,
      segments[i].frontPos.z + defs[i].localAxis.z * defs[i].restLength,
    );
  }
}
