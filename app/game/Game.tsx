"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DragonCharacter } from "./DragonCharacter";
import { Environment } from "./Environment";
import { ConnectionStatus } from "./ConnectionStatus";
import { usePageStore } from "../page.stores";

export function Game() {
  const { bodyLinkCount, addBodyLink, removeBodyLink } = usePageStore();

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
          makeDefault
          enableRotate
          enablePan
          enableZoom
          minDistance={2}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2}
          mouseButtons={{
            LEFT: null as unknown as THREE.MOUSE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
        />
        <Physics gravity={[0, -5, 0]}>
          <Suspense fallback={null}>
            <DragonCharacter />
          </Suspense>
          <Environment />
        </Physics>
      </Canvas>

      <ConnectionStatus />

      <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={removeBodyLink}
          disabled={bodyLinkCount <= 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 hover:bg-white text-black font-bold shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="text-sm font-medium text-white drop-shadow px-1">{bodyLinkCount}</span>
        <button
          onClick={addBodyLink}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 hover:bg-white text-black font-bold shadow-lg transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
