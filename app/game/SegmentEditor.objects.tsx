"use client";

import { useRef, useMemo, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import type { Sphere, ColumnShape } from "../page.stores";

export function makeTransformHandlers(orbitRef: React.RefObject<any>) {
  return {
    onMouseDown: () => { if (orbitRef.current) orbitRef.current.enabled = false; },
    onMouseUp:   () => { if (orbitRef.current) orbitRef.current.enabled = true; },
  };
}

export function SphereObj({
  sphere, color, emissive, isSelected, onSelect, orbitRef, onMove,
}: {
  sphere: Sphere;
  color: string;
  emissive: string;
  isSelected: boolean;
  onSelect: () => void;
  orbitRef: React.RefObject<any>;
  onMove: (pos: [number, number, number]) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <>
      <mesh
        ref={meshRef}
        position={sphere.position}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[sphere.radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSelected ? 1.2 : 0.6}
          transparent
          opacity={isSelected ? 0.85 : 0.65}
          toneMapped={false}
        />
      </mesh>
      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"
          size={0.6}
          {...makeTransformHandlers(orbitRef)}
          onObjectChange={() => {
            if (!meshRef.current) return;
            const p = meshRef.current.position;
            onMove([p.x, p.y, p.z]);
          }}
        />
      )}
    </>
  );
}

export function BackConnectionHandle({
  col, isSelected, onSelect, orbitRef, onCenterMove,
}: {
  col: ColumnShape;
  isSelected: boolean;
  onSelect: () => void;
  orbitRef: React.RefObject<any>;
  onCenterMove: (pos: [number, number, number]) => void;
}) {
  const centerRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(col.rotationX, col.rotationY, col.rotationZ, "XYZ"));
    const origin = new THREE.Vector3(col.center[0], col.center[1], col.center[2]);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16 - 0.5;
      pts.push(new THREE.Vector3(col.curve * (0.25 - t * t), t * col.height, 0).applyQuaternion(quat).add(origin));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, col.radius, 8, false);
  }, [col.center[0], col.center[1], col.center[2], col.height, col.radius, col.curve, col.rotationX, col.rotationY, col.rotationZ]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <mesh geometry={geometry} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <meshStandardMaterial
          color="#ff4466"
          emissive="#cc0022"
          emissiveIntensity={isSelected ? 1.2 : 0.6}
          transparent
          opacity={isSelected ? 0.85 : 0.65}
          toneMapped={false}
        />
      </mesh>

      <mesh
        ref={centerRef}
        position={col.center}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ff8800"
          emissiveIntensity={1.5}
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </mesh>

      {isSelected && centerRef.current && (
        <TransformControls
          object={centerRef.current}
          mode="translate"
          size={0.6}
          {...makeTransformHandlers(orbitRef)}
          onObjectChange={() => {
            if (!centerRef.current) return;
            const p = centerRef.current.position;
            onCenterMove([p.x, p.y, p.z]);
          }}
        />
      )}
    </>
  );
}
