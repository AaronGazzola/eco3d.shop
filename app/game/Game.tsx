"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { Character } from "./Character";
import { Environment } from "./Environment";
import { Controls } from "./Controls";
import * as THREE from "three";

function Collectible({ position, onCollect }: { position: THREE.Vector3; onCollect: () => void }) {
  return (
    <mesh position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
    </mesh>
  );
}

function randomPosition() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * 20,
    0.5,
    (Math.random() - 0.5) * 20
  );
}

export function Game() {
  const [linkCount, setLinkCount] = useState(2);
  const [collectiblePosition, setCollectiblePosition] = useState(randomPosition());

  const handleCollect = () => {
    setLinkCount(prev => prev + 1);
    setCollectiblePosition(randomPosition());
  };

  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 50 }}
        className="h-full w-full"
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#87ceeb"]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <OrbitControls
          enableRotate={true}
          enablePan={false}
          enableZoom={true}
          minDistance={2}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2}
          mouseButtons={{
            LEFT: undefined,
            MIDDLE: 2,
            RIGHT: 0,
          }}
        />
        <Physics gravity={[0, -9.8, 0]}>
          <Character linkCount={linkCount} collectiblePosition={collectiblePosition} onCollect={handleCollect} />
          <Collectible position={collectiblePosition} onCollect={handleCollect} />
          <Environment />
        </Physics>
      </Canvas>
      <Controls />
    </div>
  );
}
