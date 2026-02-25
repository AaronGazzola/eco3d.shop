"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DragonCharacter } from "./DragonCharacter";
import { Environment } from "./Environment";
import { usePageStore } from "../page.stores";
import { cn } from "@/lib/utils";
import { GAME_DEFAULTS } from "./Game.constants";
import { GameSlidersPanel } from "./Game.sliders";

export function Game() {
  const orbitRef = useRef<any>(null);
  const [ghost, setGhost] = useState(GAME_DEFAULTS.ghost);
  const [gravity, setGravity] = useState(GAME_DEFAULTS.gravity);
  const [damping, setDamping] = useState(GAME_DEFAULTS.damping);
  const [collisionPush, setCollisionPush] = useState(GAME_DEFAULTS.collisionPush);
  const [collisionSkip, setCollisionSkip] = useState(GAME_DEFAULTS.collisionSkip);
  const [constraintIters, setConstraintIters] = useState(GAME_DEFAULTS.constraintIters);
  const [dragStrength, setDragStrength] = useState(GAME_DEFAULTS.dragStrength);
  const [pickThreshold, setPickThreshold] = useState(GAME_DEFAULTS.pickThreshold);
  const [floorPush, setFloorPush] = useState(GAME_DEFAULTS.floorPush);
  const [yawLimitsOn, setYawLimitsOn] = useState(GAME_DEFAULTS.yawLimitsOn);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const { bodyLinkCount, addBodyLink, removeBodyLink } = usePageStore();

  const handleCopy = useCallback(() => {
    const data = { gravity, damping, collisionPush, collisionSkip, constraintIters, dragStrength, pickThreshold, floorPush, yawLimitsOn, bodyLinkCount };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [gravity, damping, collisionPush, collisionSkip, constraintIters, dragStrength, pickThreshold, floorPush, yawLimitsOn, bodyLinkCount]);

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
          ref={orbitRef}
          makeDefault
          enableRotate
          enablePan
          enableZoom
          minDistance={2}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2}
          mouseButtons={{
            LEFT: null as unknown as THREE.MOUSE,
            MIDDLE: THREE.MOUSE.ROTATE,
            RIGHT: null as unknown as THREE.MOUSE,
          }}
        />
        <Suspense fallback={null}>
          <DragonCharacter orbitRef={orbitRef} ghost={ghost} gravity={gravity} damping={damping} collisionPush={collisionPush} collisionSkip={collisionSkip} constraintIters={constraintIters} dragStrength={dragStrength} pickThreshold={pickThreshold} floorPush={floorPush} yawLimitsOn={yawLimitsOn} />
        </Suspense>
        <Environment />
      </Canvas>

      <div className="absolute bottom-4 left-4 flex items-center gap-3 pointer-events-auto">
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
        <button
          onClick={() => setGhost((g) => !g)}
          className={cn(
            "px-3 h-9 flex items-center justify-center rounded-lg font-medium text-sm shadow-lg transition-colors",
            ghost ? "bg-white/60 hover:bg-white/80 text-black/70" : "bg-white/90 hover:bg-white text-black",
          )}
        >
          {ghost ? "Ghost" : "Solid"}
        </button>
      </div>

      <GameSlidersPanel
        gravity={gravity} onGravityChange={setGravity}
        damping={damping} onDampingChange={setDamping}
        collisionPush={collisionPush} onCollisionPushChange={setCollisionPush}
        constraintIters={constraintIters} onConstraintItersChange={setConstraintIters}
        dragStrength={dragStrength} onDragStrengthChange={setDragStrength}
        pickThreshold={pickThreshold} onPickThresholdChange={setPickThreshold}
        floorPush={floorPush} onFloorPushChange={setFloorPush}
        yawLimitsOn={yawLimitsOn} onYawLimitsToggle={() => setYawLimitsOn((v) => !v)}
        collisionSkip={collisionSkip} onCollisionSkipChange={setCollisionSkip}
        collapsed={collapsed} onCollapsedToggle={() => setCollapsed((v) => !v)}
        copied={copied} onCopy={handleCopy}
      />
    </div>
  );
}
