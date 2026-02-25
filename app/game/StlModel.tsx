"use client";

import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { splitGeometry, DRAGON_PIECE_LABELS, MODEL_NORMALIZED_SIZE } from "./StlModel.utils";

interface StlModelProps {
  url: string;
  color?: string;
}

export interface DragonPiece {
  geometry: THREE.BufferGeometry;
  label: string;
  center: THREE.Vector3;
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
    return { centered: geo, autoScale: MODEL_NORMALIZED_SIZE / maxDim };
  }, [geometry]);

  return (
    <mesh geometry={centered} scale={autoScale} rotation={[Math.PI, 0, 0]}>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
    </mesh>
  );
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

    const wholeCenter = new THREE.Vector3();
    const wholeSize = new THREE.Vector3();
    const wholeBBox = new THREE.Box3();
    withCentroids.forEach(({ geo }) => wholeBBox.union(geo.boundingBox!));
    wholeBBox.getCenter(wholeCenter);
    wholeBBox.getSize(wholeSize);
    const maxDim = Math.max(wholeSize.x, wholeSize.y, wholeSize.z);
    const scale = MODEL_NORMALIZED_SIZE / maxDim;

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
        label: DRAGON_PIECE_LABELS[i] ?? `Part ${i + 1}`,
        center: scaledCenter,
      };
    });
  }, [geometry]);
}
