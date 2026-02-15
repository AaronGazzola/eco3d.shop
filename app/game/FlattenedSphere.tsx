import * as THREE from "three";
import { useMemo } from "react";

interface FlattenedSphereProps {
  radius: number;
  flattenDepth: number;
}

export function FlattenedSphere({ radius, flattenDepth }: FlattenedSphereProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);

      if (z < -flattenDepth) {
        positions.setZ(i, -flattenDepth);
      } else if (z > flattenDepth) {
        positions.setZ(i, flattenDepth);
      }
    }

    positions.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, [radius, flattenDepth]);

  return <primitive object={geometry} attach="geometry" />;
}
