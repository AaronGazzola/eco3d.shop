"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DragonCharacter } from "./DragonCharacter";
import { Environment } from "./Environment";
import { usePageStore } from "../page.stores";
import { cn } from "@/lib/utils";

export function Game() {
  const orbitRef = useRef<any>(null);
  const [ghost, setGhost] = useState(true);
  const [gravity, setGravity] = useState(9.8);
  const [damping, setDamping] = useState(0.98);
  const [collisionPush, setCollisionPush] = useState(0.5);
  const [collisionSkip, setCollisionSkip] = useState(0);
  const [constraintIters, setConstraintIters] = useState(20);
  const [dragStrength, setDragStrength] = useState(0.4);
  const [pickThreshold, setPickThreshold] = useState(0.3);
  const [floorPush, setFloorPush] = useState(0.5);
  const [yawLimitsOn, setYawLimitsOn] = useState(true);
  const [copied, setCopied] = useState(false);
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

      <div className="absolute top-4 left-4 w-52 flex flex-col gap-2 pointer-events-auto bg-black/50 backdrop-blur-sm rounded-xl p-3">
        <button
          onClick={() => {
            const data = { gravity, damping, collisionPush, collisionSkip, constraintIters, dragStrength, pickThreshold, floorPush, yawLimitsOn, bodyLinkCount };
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={cn(
            "px-3 h-7 rounded-lg text-xs font-medium transition-colors mb-1",
            copied ? "bg-green-500 text-white" : "bg-white/90 hover:bg-white text-black",
          )}
        >
          {copied ? "Copied!" : "Copy State"}
        </button>
        <label className="flex items-center justify-between text-xs text-white/80">
          <span>Gravity</span>
          <span className="tabular-nums">{gravity.toFixed(1)}</span>
        </label>
        <input type="range" min={0} max={30} step={0.1} value={gravity} onChange={(e) => setGravity(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Damping</span>
          <span className="tabular-nums">{damping.toFixed(2)}</span>
        </label>
        <input type="range" min={0} max={1} step={0.005} value={damping} onChange={(e) => setDamping(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Collision Push</span>
          <span className="tabular-nums">{collisionPush.toFixed(2)}</span>
        </label>
        <input type="range" min={0} max={2} step={0.01} value={collisionPush} onChange={(e) => setCollisionPush(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Constraint Iters</span>
          <span className="tabular-nums">{constraintIters}</span>
        </label>
        <input type="range" min={1} max={50} step={1} value={constraintIters} onChange={(e) => setConstraintIters(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Drag Strength</span>
          <span className="tabular-nums">{dragStrength.toFixed(2)}</span>
        </label>
        <input type="range" min={0.05} max={1} step={0.05} value={dragStrength} onChange={(e) => setDragStrength(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Pick Threshold</span>
          <span className="tabular-nums">{pickThreshold.toFixed(2)}</span>
        </label>
        <input type="range" min={0.1} max={1} step={0.05} value={pickThreshold} onChange={(e) => setPickThreshold(Number(e.target.value))} className="w-full accent-white h-1" />

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Floor Push</span>
          <span className="tabular-nums">{floorPush.toFixed(2)}</span>
        </label>
        <input type="range" min={0} max={1} step={0.05} value={floorPush} onChange={(e) => setFloorPush(Number(e.target.value))} className="w-full accent-white h-1" />

        <button
          onClick={() => setYawLimitsOn((v) => !v)}
          className={cn(
            "mt-1 px-3 h-7 rounded-lg text-xs font-medium transition-colors",
            yawLimitsOn ? "bg-white/90 text-black" : "bg-white/20 hover:bg-white/40 text-white/70",
          )}
        >
          {yawLimitsOn ? "Yaw Limits: On" : "Yaw Limits: Off"}
        </button>

        <label className="flex items-center justify-between text-xs text-white/80 mt-1">
          <span>Skip Neighbors</span>
          <span className="tabular-nums">{collisionSkip}</span>
        </label>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setCollisionSkip(n)}
              className={cn(
                "flex-1 h-7 rounded-lg text-xs font-medium transition-colors",
                collisionSkip === n ? "bg-white/90 text-black" : "bg-white/20 hover:bg-white/40 text-white/70",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
