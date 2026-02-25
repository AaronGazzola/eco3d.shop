import * as THREE from "three";

export interface Particle {
  pos: THREE.Vector3;
  prev: THREE.Vector3;
}

export interface SegDef {
  frontLocal: THREE.Vector3;
  localAxis: THREE.Vector3;
  restLength: number;
}
