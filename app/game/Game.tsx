"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Lizard } from "./Lizard";
import { Fish } from "./Fish";
import { Snake } from "./Snake";
import { Environment } from "./Environment";
import { Controls } from "./Controls";
import { AnimalSelector } from "./AnimalSelector";

export function Game() {
  const [selectedAnimal, setSelectedAnimal] = useState<"fish" | "lizard" | "snake">("lizard");

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
        <Physics gravity={[0, -9.8, 0]}>
          {selectedAnimal === "fish" && <Fish />}
          {selectedAnimal === "lizard" && <Lizard />}
          {selectedAnimal === "snake" && <Snake />}
          <Environment />
        </Physics>
      </Canvas>
      <Controls />
      <AnimalSelector selected={selectedAnimal} onSelect={setSelectedAnimal} />
    </div>
  );
}
