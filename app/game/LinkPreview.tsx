"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FlattenedSphere } from "./FlattenedSphere";

interface LinkPreviewProps {
  animalType: string;
  linkIndex: number;
}

const linkConfigs = {
  Snake: { radius: 0.15, flattenDepth: 0.06, torusRadius: 0.1, tubeRadius: 0.035, color: "#ac3931", metalness: 0.4, roughness: 0.6 },
  Fish: { radius: 0.18, flattenDepth: 0.07, torusRadius: 0.12, tubeRadius: 0.04, color: "#3a7ca5", metalness: 0.5, roughness: 0.5 },
  Lizard: { radius: 0.16, flattenDepth: 0.065, torusRadius: 0.11, tubeRadius: 0.038, color: "#52796f", metalness: 0.3, roughness: 0.7 },
};

export function LinkPreview({ animalType, linkIndex }: LinkPreviewProps) {
  const config = linkConfigs[animalType as keyof typeof linkConfigs];

  return (
    <Canvas camera={{ position: [0, 0, 1], fov: 50 }}>
      <color attach="background" args={["#f3f4f6"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />

      <group>
        <mesh>
          <FlattenedSphere radius={config.radius} flattenDepth={config.flattenDepth} />
          <meshStandardMaterial color={config.color} metalness={config.metalness} roughness={config.roughness} />
        </mesh>
        <mesh position={[0, 0, -config.radius * 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[config.torusRadius, config.tubeRadius, 16, 32]} />
          <meshStandardMaterial color={config.color} metalness={config.metalness} roughness={config.roughness} />
        </mesh>
        <mesh position={[0, 0, config.radius * 0.8]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
          <torusGeometry args={[config.torusRadius, config.tubeRadius, 16, 32]} />
          <meshStandardMaterial color={config.color} metalness={config.metalness} roughness={config.roughness} />
        </mesh>
      </group>

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        minDistance={0.5}
        maxDistance={3}
      />
    </Canvas>
  );
}
