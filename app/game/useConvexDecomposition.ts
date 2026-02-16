import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function useConvexDecomposition(scale: number) {
  return useMemo(() => {
    const config = {
      radius: 0.16 * scale,
      flattenDepth: 0.065 * scale,
      torusRadius: 0.11 * scale,
      tubeRadius: 0.038 * scale,
      donutOffset: 0.13 * scale,
    };

    const sphereGeo = new THREE.SphereGeometry(config.radius, 32, 32);
    const positions = sphereGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      if (z < -config.flattenDepth) positions.setZ(i, -config.flattenDepth);
      else if (z > config.flattenDepth) positions.setZ(i, config.flattenDepth);
    }
    positions.needsUpdate = true;
    sphereGeo.computeVertexNormals();

    const torus1 = new THREE.TorusGeometry(config.torusRadius, config.tubeRadius, 12, 24);
    torus1.translate(0, 0, -config.donutOffset);
    torus1.rotateX(Math.PI / 2);

    const torus2 = new THREE.TorusGeometry(config.torusRadius, config.tubeRadius, 12, 24);
    torus2.translate(0, 0, config.donutOffset);
    torus2.rotateX(Math.PI / 2);
    torus2.rotateZ(Math.PI / 2);

    const mergedGeometry = mergeGeometries([sphereGeo, torus1, torus2]);

    if (!mergedGeometry) {
      return { shapes: [], mergedGeometry: new THREE.BufferGeometry() };
    }

    const convexHulls = approximateConvexHulls(mergedGeometry, config);

    return { shapes: convexHulls, mergedGeometry };
  }, [scale]);
}

function approximateConvexHulls(geometry: THREE.BufferGeometry, config: any) {
  const sphereGeo = new THREE.SphereGeometry(config.radius, 16, 16);
  const positions = sphereGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const z = positions.getZ(i);
    if (z < -config.flattenDepth) positions.setZ(i, -config.flattenDepth);
    else if (z > config.flattenDepth) positions.setZ(i, config.flattenDepth);
  }
  sphereGeo.computeVertexNormals();

  const torus1Geo = new THREE.TorusGeometry(config.torusRadius, config.tubeRadius, 8, 16);
  const torus2Geo = new THREE.TorusGeometry(config.torusRadius, config.tubeRadius, 8, 16);

  const shapes: Array<{
    type: "ConvexPolyhedron";
    args: [number[][], number[][]];
    position: [number, number, number];
    rotation?: [number, number, number];
  }> = [];

  shapes.push({
    type: "ConvexPolyhedron",
    args: [
      getVertices(sphereGeo),
      getFaces(sphereGeo)
    ],
    position: [0, 0, 0],
  });

  shapes.push({
    type: "ConvexPolyhedron",
    args: [
      getVertices(torus1Geo),
      getFaces(torus1Geo)
    ],
    position: [0, 0, -config.donutOffset],
    rotation: [Math.PI / 2, 0, 0],
  });

  shapes.push({
    type: "ConvexPolyhedron",
    args: [
      getVertices(torus2Geo),
      getFaces(torus2Geo)
    ],
    position: [0, 0, config.donutOffset],
    rotation: [Math.PI / 2, Math.PI / 2, 0],
  });

  return shapes;
}

function getVertices(geometry: THREE.BufferGeometry): number[][] {
  const positions = geometry.attributes.position;
  const vertices: number[][] = [];
  for (let i = 0; i < positions.count; i++) {
    vertices.push([
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    ]);
  }
  return vertices;
}

function getFaces(geometry: THREE.BufferGeometry): number[][] {
  const index = geometry.index;
  const faces: number[][] = [];

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      faces.push([
        index.getX(i),
        index.getX(i + 1),
        index.getX(i + 2)
      ]);
    }
  } else {
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 3) {
      faces.push([i, i + 1, i + 2]);
    }
  }

  return faces;
}
