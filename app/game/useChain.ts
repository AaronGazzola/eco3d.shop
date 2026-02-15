import { useRef } from "react";
import * as THREE from "three";

interface ChainOptions {
  segmentCount: number;
  segmentLength: number;
  stiffness?: number;
}

export function useChain({ segmentCount, segmentLength, stiffness = 0.3 }: ChainOptions) {
  const positions = useRef<THREE.Vector3[]>(
    Array.from({ length: segmentCount }, (_, i) => new THREE.Vector3(0, 0.5, i * segmentLength))
  );

  const update = (targetPosition: THREE.Vector3) => {
    const segments = positions.current;

    segments[0].lerp(targetPosition, stiffness);

    for (let i = 1; i < segments.length; i++) {
      const direction = new THREE.Vector3().subVectors(segments[i - 1], segments[i]);
      const distance = direction.length();

      if (distance > 0) {
        direction.normalize();
        segments[i].copy(segments[i - 1]).sub(direction.multiplyScalar(segmentLength));
      }
    }
  };

  return { positions: positions.current, update };
}
