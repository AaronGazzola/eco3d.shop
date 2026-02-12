"use client";

import { useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { ModelData, SceneObject } from "@/app/layout.types";
import * as THREE from "three";

function SceneObjectMesh({ obj }: { obj: SceneObject }) {
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
    <mesh
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      geometry={geometry}
    >
      <meshStandardMaterial color={obj.color} />
    </mesh>
  );
}

function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree();

  camera.position.set(2 * zoom, 2 * zoom, 2 * zoom);
  camera.updateProjectionMatrix();

  return null;
}

type Simple3DViewerProps = {
  modelData: ModelData;
  width?: string | number;
  height?: string | number;
  className?: string;
};

export function Simple3DViewer({
  modelData,
  width = "100%",
  height = 300,
  className = "",
}: Simple3DViewerProps) {
  const [zoom, setZoom] = useState(1);

  if (
    !modelData ||
    modelData.type !== "scene-graph" ||
    !modelData.objects ||
    modelData.objects.length === 0
  ) {
    return (
      <div
        style={{ width, height }}
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <p className="text-gray-500 text-sm">No objects in scene</p>
      </div>
    );
  }

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(0.3, prev - 0.2));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(3, prev + 0.2));
  };

  return (
    <div
      style={{ width, height }}
      className={`${className} relative`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.preventDefault()}
      draggable={false}
    >
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="bg-white/90 hover:bg-white rounded p-1.5 shadow-md transition-colors"
          aria-label="Zoom in"
        >
          <svg
            className="w-4 h-4 text-gray-700"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-white/90 hover:bg-white rounded p-1.5 shadow-md transition-colors"
          aria-label="Zoom out"
        >
          <svg
            className="w-4 h-4 text-gray-700"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
      </div>
      <Canvas>
        <PerspectiveCamera makeDefault position={[2, 2, 2]} />
        <CameraController zoom={zoom} />
        <OrbitControls enablePan={false} enableZoom={false} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        {modelData.objects.map((obj) => (
          <SceneObjectMesh key={obj.id} obj={obj} />
        ))}
        <gridHelper args={[10, 10]} />
      </Canvas>
    </div>
  );
}
