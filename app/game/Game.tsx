"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ChevronUp, ChevronDown } from "lucide-react";
import { DragonCharacter } from "./DragonCharacter";
import { Environment } from "./Environment";
import { usePageStore } from "../page.stores";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MOVE_SPEED,
  DEFAULT_ROLL_SPEED,
  DEFAULT_PITCH_SPEED,
  DEFAULT_FOLLOW_SPEED,
} from "./DragonCharacter.constants";

export function Game() {
  const orbitRef = useRef<any>(null);
  const [ghost, setGhost] = useState(true);
  const [moveSpeed, setMoveSpeed] = useState(DEFAULT_MOVE_SPEED);
  const [rollSpeed, setRollSpeed] = useState(DEFAULT_ROLL_SPEED);
  const [pitchSpeed, setPitchSpeed] = useState(DEFAULT_PITCH_SPEED);
  const [followSpeed, setFollowSpeed] = useState(DEFAULT_FOLLOW_SPEED);
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
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
          <DragonCharacter
            ghost={ghost}
            moveSpeed={moveSpeed}
            rollSpeed={rollSpeed}
            pitchSpeed={pitchSpeed}
            followSpeed={followSpeed}
          />
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

      <div className="absolute top-4 left-4 w-52 pointer-events-auto bg-black/50 backdrop-blur-sm rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-white/80">Controls</span>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors text-white/80"
          >
            {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        {panelOpen && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                const data = { moveSpeed, rollSpeed, pitchSpeed, followSpeed, bodyLinkCount };
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={cn(
                "px-3 h-7 rounded-lg text-xs font-medium transition-colors",
                copied ? "bg-green-500 text-white" : "bg-white/90 hover:bg-white text-black",
              )}
            >
              {copied ? "Copied!" : "Copy State"}
            </button>

            <label className="flex items-center justify-between text-xs text-white/80">
              <span>Move Speed</span>
              <span className="tabular-nums">{moveSpeed.toFixed(1)}</span>
            </label>
            <input type="range" min={0} max={30} step={0.5} value={moveSpeed} onChange={(e) => setMoveSpeed(Number(e.target.value))} className="w-full accent-white h-1" />

            <label className="flex items-center justify-between text-xs text-white/80 mt-1">
              <span>Roll Speed</span>
              <span className="tabular-nums">{rollSpeed.toFixed(1)}</span>
            </label>
            <input type="range" min={0.5} max={10} step={0.5} value={rollSpeed} onChange={(e) => setRollSpeed(Number(e.target.value))} className="w-full accent-white h-1" />

            <label className="flex items-center justify-between text-xs text-white/80 mt-1">
              <span>Pitch Speed</span>
              <span className="tabular-nums">{pitchSpeed.toFixed(1)}</span>
            </label>
            <input type="range" min={0.5} max={10} step={0.5} value={pitchSpeed} onChange={(e) => setPitchSpeed(Number(e.target.value))} className="w-full accent-white h-1" />

            <label className="flex items-center justify-between text-xs text-white/80 mt-1">
              <span>Follow Speed</span>
              <span className="tabular-nums">{followSpeed.toFixed(1)}</span>
            </label>
            <input type="range" min={0.1} max={20} step={0.1} value={followSpeed} onChange={(e) => setFollowSpeed(Number(e.target.value))} className="w-full accent-white h-1" />
          </div>
        )}
      </div>
    </div>
  );
}
