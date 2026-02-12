"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useEffect } from "react";

type SceneObject = {
  id: string;
  type: "cube" | "sphere" | "cylinder";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
};

type EditorCanvasProps = {
  sceneObjects: SceneObject[];
  selectedObjectId: string | null;
  transformMode: "translate" | "rotate" | "scale";
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
};

function SceneObjectMesh({
  obj,
  isSelected,
  onSelect,
  transformMode,
  onTransform,
}: {
  obj: SceneObject;
  isSelected: boolean;
  transformMode: "translate" | "rotate" | "scale";
  onSelect: () => void;
  onTransform: (updates: Partial<SceneObject>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  let geometry: THREE.BufferGeometry;
  switch (obj.type) {
    case "cube":
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      break;
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <meshStandardMaterial
          color={obj.color}
          emissive={isSelected ? obj.color : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          onObjectChange={() => {
            if (meshRef.current) {
              onTransform({
                position: meshRef.current.position.toArray(),
                rotation: meshRef.current.rotation.toArray() as [
                  number,
                  number,
                  number
                ],
                scale: meshRef.current.scale.toArray(),
              });
            }
          }}
        />
      )}
    </group>
  );
}

export function EditorCanvas({
  sceneObjects,
  selectedObjectId,
  transformMode,
  onSelectObject,
  onUpdateObject,
}: EditorCanvasProps) {
  return (
    <Canvas onClick={() => onSelectObject(null)}>
      <PerspectiveCamera makeDefault position={[5, 5, 5]} />
      <OrbitControls makeDefault />

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#374151"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {sceneObjects.map((obj) => (
        <SceneObjectMesh
          key={obj.id}
          obj={obj}
          isSelected={obj.id === selectedObjectId}
          transformMode={transformMode}
          onSelect={() => onSelectObject(obj.id)}
          onTransform={(updates) => onUpdateObject(obj.id, updates)}
        />
      ))}
    </Canvas>
  );
}
