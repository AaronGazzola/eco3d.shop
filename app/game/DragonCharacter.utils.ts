import * as THREE from "three";
import {
  DEFAULT_HEAD_FRONT, DEFAULT_HEAD_BACK,
  DEFAULT_BODY_FRONT, DEFAULT_BODY_BACK,
  DEFAULT_TAIL_FRONT, DEFAULT_TAIL_BACK,
} from "./DragonCharacter.constants";
import type { SegDef } from "./DragonCharacter.types";

export const _v  = new THREE.Vector3();
export const _v2 = new THREE.Vector3();
export const _v3 = new THREE.Vector3();
export const _v4 = new THREE.Vector3();
export const _q  = new THREE.Quaternion();

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
  let fl: [number, number, number];
  let bl: [number, number, number];

  if (index === 0) {
    fl = headFront ?? DEFAULT_HEAD_FRONT;
    bl = headBack ?? DEFAULT_HEAD_BACK;
  } else if (index === segCount - 1) {
    fl = tailFront ?? DEFAULT_TAIL_FRONT;
    bl = tailBack ?? DEFAULT_TAIL_BACK;
  } else {
    fl = bodyFront ?? DEFAULT_BODY_FRONT;
    bl = bodyBack ?? DEFAULT_BODY_BACK;
  }

  const frontLocal = new THREE.Vector3(...fl);
  const axis = new THREE.Vector3(...bl).sub(frontLocal);
  const restLength = axis.length();
  if (restLength > 0.0001) axis.divideScalar(restLength);

  return { frontLocal, localAxis: axis, restLength };
}
