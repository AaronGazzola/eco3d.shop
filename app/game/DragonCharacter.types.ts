import * as THREE from "three";

export interface SegDef {
  frontLocal: THREE.Vector3;
  localAxis: THREE.Vector3;
  restLength: number;
}

export interface Segment {
  worldQuat: THREE.Quaternion;
  frontPos: THREE.Vector3;
}
