import * as THREE from "three";

const SPLIT_EPSILON = 0.001;

export const DRAGON_PIECE_LABELS = ["Tail", "Body", "Head"] as const;
export const MODEL_NORMALIZED_SIZE = 2;

function hashVertex(x: number, y: number, z: number): string {
  const rx = Math.round(x / SPLIT_EPSILON);
  const ry = Math.round(y / SPLIT_EPSILON);
  const rz = Math.round(z / SPLIT_EPSILON);
  return `${rx},${ry},${rz}`;
}

export function splitGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const faceCount = positions.count / 3;

  const vertexToFaces = new Map<string, number[]>();
  for (let f = 0; f < faceCount; f++) {
    for (let v = 0; v < 3; v++) {
      const idx = f * 3 + v;
      const hash = hashVertex(
        positions.getX(idx),
        positions.getY(idx),
        positions.getZ(idx)
      );
      let faces = vertexToFaces.get(hash);
      if (!faces) {
        faces = [];
        vertexToFaces.set(hash, faces);
      }
      faces.push(f);
    }
  }

  const visited = new Set<number>();
  const components: number[][] = [];

  for (let f = 0; f < faceCount; f++) {
    if (visited.has(f)) continue;
    const component: number[] = [];
    const queue: number[] = [f];
    visited.add(f);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (let v = 0; v < 3; v++) {
        const idx = current * 3 + v;
        const hash = hashVertex(
          positions.getX(idx),
          positions.getY(idx),
          positions.getZ(idx)
        );
        const adjacent = vertexToFaces.get(hash);
        if (!adjacent) continue;
        for (const adj of adjacent) {
          if (!visited.has(adj)) {
            visited.add(adj);
            queue.push(adj);
          }
        }
      }
    }
    components.push(component);
  }

  return components.map((faceIndices) => {
    const vertCount = faceIndices.length * 3;
    const newPositions = new Float32Array(vertCount * 3);
    const newNormals = normals ? new Float32Array(vertCount * 3) : undefined;

    faceIndices.forEach((faceIdx, i) => {
      for (let v = 0; v < 3; v++) {
        const srcIdx = faceIdx * 3 + v;
        const dstIdx = (i * 3 + v) * 3;
        newPositions[dstIdx] = positions.getX(srcIdx);
        newPositions[dstIdx + 1] = positions.getY(srcIdx);
        newPositions[dstIdx + 2] = positions.getZ(srcIdx);
        if (normals && newNormals) {
          newNormals[dstIdx] = normals.getX(srcIdx);
          newNormals[dstIdx + 1] = normals.getY(srcIdx);
          newNormals[dstIdx + 2] = normals.getZ(srcIdx);
        }
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
    if (newNormals) {
      geo.setAttribute("normal", new THREE.BufferAttribute(newNormals, 3));
    }
    geo.computeBoundingBox();
    return geo;
  });
}
