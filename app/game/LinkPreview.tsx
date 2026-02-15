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
  Character: { radius: 0.16, flattenDepth: 0.065, torusRadius: 0.11, tubeRadius: 0.038, color: "#52796f", metalness: 0.3, roughness: 0.7, frontConnectionOffset: 0.2, backConnectionOffset: 0.2 },
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
        <mesh position={[0, 0, -config.frontConnectionOffset]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, config.radius * 0.8]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
          <torusGeometry args={[config.torusRadius, config.tubeRadius, 16, 32]} />
          <meshStandardMaterial color={config.color} metalness={config.metalness} roughness={config.roughness} />
        </mesh>
        <mesh position={[0, 0, config.backConnectionOffset]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} toneMapped={false} />
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
