"use client";

import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

interface StlModelProps {
  url: string;
  color?: string;
}

function splitGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const faceCount = positions.count / 3;
  const epsilon = 0.001;

  function hashVertex(x: number, y: number, z: number): string {
    const rx = Math.round(x / epsilon);
    const ry = Math.round(y / epsilon);
    const rz = Math.round(z / epsilon);
    return `${rx},${ry},${rz}`;
  }

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

export function StlModel({ url, color = "#c9b18c" }: StlModelProps) {
  const geometry = useLoader(STLLoader, url);

  const { centered, autoScale } = useMemo(() => {
    const geo = geometry.clone();
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    geo.boundingBox!.getCenter(center);
    geo.boundingBox!.getSize(size);
    geo.translate(-center.x, -center.y, -center.z);
    const maxDim = Math.max(size.x, size.y, size.z);
    return { centered: geo, autoScale: 2 / maxDim };
  }, [geometry]);

  return (
    <mesh geometry={centered} scale={autoScale} rotation={[Math.PI, 0, 0]}>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

export interface DragonPiece {
  geometry: THREE.BufferGeometry;
  label: string;
  center: THREE.Vector3;
}

export function useSplitStl(url: string): DragonPiece[] {
  const geometry = useLoader(STLLoader, url);

  return useMemo(() => {
    const parts = splitGeometry(geometry);

    const withCentroids = parts.map((geo) => {
      geo.computeBoundingBox();
      const center = new THREE.Vector3();
      geo.boundingBox!.getCenter(center);
      return { geo, center };
    });

    withCentroids.sort((a, b) => a.center.z - b.center.z);

    const labels = ["Tail", "Body", "Head"];
    const wholeCenter = new THREE.Vector3();
    const wholeSize = new THREE.Vector3();
    const wholeBBox = new THREE.Box3();
    withCentroids.forEach(({ geo }) => wholeBBox.union(geo.boundingBox!));
    wholeBBox.getCenter(wholeCenter);
    wholeBBox.getSize(wholeSize);
    const maxDim = Math.max(wholeSize.x, wholeSize.y, wholeSize.z);
    const scale = 2 / maxDim;

    return withCentroids.map(({ geo, center }, i) => {
      const centered = geo.clone();
      centered.translate(-wholeCenter.x, -wholeCenter.y, -wholeCenter.z);
      centered.scale(scale, scale, scale);
      centered.computeBoundingBox();

      const scaledCenter = center
        .clone()
        .sub(wholeCenter)
        .multiplyScalar(scale);

      return {
        geometry: centered,
        label: labels[i] ?? `Part ${i + 1}`,
        center: scaledCenter,
      };
    });
  }, [geometry]);
}
