"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { FlattenedSphere } from "./FlattenedSphere";
import { useSplitStl } from "./StlModel";
import { useEditModeStore } from "../page.stores";

interface LinkPreviewProps {
  animalType: string;
  linkIndex: number;
}

const linkConfigs = {
  Character: { radius: 0.16, flattenDepth: 0.065, torusRadius: 0.11, tubeRadius: 0.038, color: "#52796f", metalness: 0.3, roughness: 0.7, frontConnectionOffset: [0, 0, -0.2] as [number, number, number], backConnectionOffset: [0, 0, 0.2] as [number, number, number] },
};

interface RotationLimitWallsProps {
  position: [number, number, number];
  animalType: string;
  linkIndex: number;
  point: "front" | "back" | "tipFront" | "tipBack";
}

function getEffectiveLimit(
  getRotationLimit: (a: string, i: number, p: "front" | "back" | "tipFront" | "tipBack", s: "positive" | "negative") => number,
  animalType: string,
  linkIndex: number,
  point: "front" | "back" | "tipFront" | "tipBack",
  side: "positive" | "negative"
): number {
  const raw = getRotationLimit(animalType, linkIndex, point, side);

  if (animalType === "Dragon") {
    if (point === "back" && linkIndex === 2) {
      return Math.min(raw, getRotationLimit(animalType, 1, "front", side));
    } else if (point === "front" && linkIndex === 1) {
      return Math.min(raw, getRotationLimit(animalType, 2, "back", side));
    } else if (point === "back" && linkIndex === 1) {
      return Math.min(raw, getRotationLimit(animalType, 0, "front", side));
    } else if (point === "front" && linkIndex === 0) {
      return Math.min(raw, getRotationLimit(animalType, 1, "back", side));
    }
  }

  return raw;
}

function RotationLimitWalls({
  position,
  animalType,
  linkIndex,
  point,
}: RotationLimitWallsProps) {
  const { getRotationLimit } = useEditModeStore();
  const positiveLimit = getEffectiveLimit(getRotationLimit, animalType, linkIndex, point, "positive");
  const negativeLimit = getEffectiveLimit(getRotationLimit, animalType, linkIndex, point, "negative");

  const wallRadius = 0.3;
  const wallHeight = 0.02;

  return (
    <group position={position}>
      <group rotation={[0, positiveLimit, 0]}>
        <mesh position={[wallRadius / 2, 0, 0]}>
          <boxGeometry args={[wallRadius, wallHeight, 0.01]} />
          <meshStandardMaterial
            color="#ffff00"
            transparent
            opacity={0.5}
            emissive="#ffff00"
            emissiveIntensity={0.5}
          />
        </mesh>

        <mesh position={[wallRadius, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial
            color="#00ff00"
            emissive="#00ff00"
            emissiveIntensity={1}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group rotation={[0, -negativeLimit, 0]}>
        <mesh position={[wallRadius / 2, 0, 0]}>
          <boxGeometry args={[wallRadius, wallHeight, 0.01]} />
          <meshStandardMaterial
            color="#ffff00"
            transparent
            opacity={0.5}
            emissive="#ffff00"
            emissiveIntensity={0.5}
          />
        </mesh>

        <mesh position={[wallRadius, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial
            color="#ff00ff"
            emissive="#ff00ff"
            emissiveIntensity={1}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function PreviewConnectionPoint({
  animalType,
  linkIndex,
  point,
  defaultPosition,
  label,
  isTip,
}: {
  animalType: string;
  linkIndex: number;
  point: "front" | "back" | "tipFront" | "tipBack";
  defaultPosition: [number, number, number];
  label?: string;
  isTip?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const {
    selectedConnectionPoint,
    selectConnectionPoint,
    setConnectionOffset,
    connectionOffsets,
  } = useEditModeStore();

  const key = `${animalType}-${linkIndex}`;
  const offsets = connectionOffsets[key];
  const position: [number, number, number] = offsets?.[point] ?? defaultPosition;
  const isActive = selectedConnectionPoint === point;

  const baseColor = point.includes("Front") ? "#00ff00" : "#ff00ff";
  const activeColor = "#ffff00";

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          selectConnectionPoint(isActive ? null : point);
        }}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? activeColor : baseColor}
          emissive={isActive ? activeColor : baseColor}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {!isTip && (
        <RotationLimitWalls
          position={position}
          animalType={animalType}
          linkIndex={linkIndex}
          point={point}
        />
      )}
      {isActive && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"
          size={0.5}
          onObjectChange={() => {
            if (!meshRef.current) return;
            const p = meshRef.current.position;
            const displayLabel = label ?? `${animalType} Link ${linkIndex}`;
            setConnectionOffset(animalType, linkIndex, point, [p.x, p.y, p.z]);
          }}
        />
      )}
    </>
  );
}

function CharacterLinkPreview({ linkIndex }: { linkIndex: number }) {
  const config = linkConfigs.Character;
  return (
    <group>
      <mesh>
        <FlattenedSphere radius={config.radius} flattenDepth={config.flattenDepth} />
        <meshStandardMaterial color={config.color} metalness={config.metalness} roughness={config.roughness} />
      </mesh>
      <mesh position={[0, 0, -config.radius * 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[config.torusRadius, config.tubeRadius, 16, 32]} />
        <meshStandardMaterial color={config.color} metalness={config.metalness} roughness={config.roughness} />
      </mesh>
      <PreviewConnectionPoint
        animalType="Character"
        linkIndex={linkIndex}
        point="front"
        defaultPosition={config.frontConnectionOffset}
        label={`Character Link ${linkIndex}`}
      />
      <mesh position={[0, 0, config.radius * 0.8]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
        <torusGeometry args={[config.torusRadius, config.tubeRadius, 16, 32]} />
        <meshStandardMaterial color={config.color} metalness={config.metalness} roughness={config.roughness} />
      </mesh>
      <PreviewConnectionPoint
        animalType="Character"
        linkIndex={linkIndex}
        point="back"
        defaultPosition={config.backConnectionOffset}
        label={`Character Link ${linkIndex}`}
      />
    </group>
  );
}

function DragonLinkPreview({ linkIndex }: { linkIndex: number }) {
  const pieces = useSplitStl("/models/Bone_Dragon-1.stl");
  const piece = pieces[linkIndex];
  if (!piece) return null;

  const hasFront = piece.label !== "Head";
  const hasBack = piece.label !== "Tail";
  const isHead = piece.label === "Head";
  const isTail = piece.label === "Tail";

  const defaultPositions: Record<string, {
    front: [number, number, number];
    back: [number, number, number];
    tipFront?: [number, number, number];
    tipBack?: [number, number, number];
  }> = {
    Tail: {
      front: [-0.1350, -0.1436, 0.0248],
      back: [0, 0, 0],
      tipBack: [-0.9625, -0.2899, 0.3212]
    },
    Body: {
      front: [0.1300, -0.1435, -0.0109],
      back: [-0.1451, -0.1378, 0.0282]
    },
    Head: {
      front: [0, 0, 0],
      back: [0.1314, -0.1747, -0.0115],
      tipFront: [0.9169, -0.1559, 0.0612]
    },
  };

  const positions = defaultPositions[piece.label];

  return (
    <group>
      <mesh geometry={piece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} />
      </mesh>
      {isHead && positions.tipFront && (
        <PreviewConnectionPoint
          animalType="Dragon"
          linkIndex={linkIndex}
          point="tipFront"
          defaultPosition={positions.tipFront}
          label={piece.label}
          isTip
        />
      )}
      {isTail && positions.tipBack && (
        <PreviewConnectionPoint
          animalType="Dragon"
          linkIndex={linkIndex}
          point="tipBack"
          defaultPosition={positions.tipBack}
          label={piece.label}
          isTip
        />
      )}
      {hasFront && (
        <PreviewConnectionPoint
          animalType="Dragon"
          linkIndex={linkIndex}
          point="front"
          defaultPosition={positions.front}
          label={piece.label}
        />
      )}
      {hasBack && (
        <PreviewConnectionPoint
          animalType="Dragon"
          linkIndex={linkIndex}
          point="back"
          defaultPosition={positions.back}
          label={piece.label}
        />
      )}
    </group>
  );
}

function RotationControls({ animalType, linkIndex }: { animalType: string; linkIndex: number }) {
  const { getRotationLimit, setRotationLimit } = useEditModeStore();
  const pieces = useSplitStl("/models/Bone_Dragon-1.stl");
  const piece = pieces[linkIndex];

  const isDragon = animalType === "Dragon";
  const connectionPoints: Array<"front" | "back" | "tipFront" | "tipBack"> = [];

  if (isDragon && piece) {
    if (piece.label === "Head") {
      connectionPoints.push("back");
    } else if (piece.label === "Tail") {
      connectionPoints.push("front");
    } else {
      connectionPoints.push("front", "back");
    }
  } else {
    connectionPoints.push("front", "back");
  }

  const handleSliderChange = (
    point: "front" | "back" | "tipFront" | "tipBack",
    side: "positive" | "negative",
    value: number
  ) => {
    const angle = (value * Math.PI) / 180;
    setRotationLimit(animalType, linkIndex, point, side, angle);
    console.log(`${animalType}-${linkIndex} ${point} ${side}: ${angle}`);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-4xl mx-auto">
        {connectionPoints.map((point) => {
          const rawPosLimit = getRotationLimit(animalType, linkIndex, point, "positive");
          const rawNegLimit = getRotationLimit(animalType, linkIndex, point, "negative");
          const effectivePosLimit = getEffectiveLimit(getRotationLimit, animalType, linkIndex, point, "positive");
          const effectiveNegLimit = getEffectiveLimit(getRotationLimit, animalType, linkIndex, point, "negative");
          const rawPosValue = Math.round((rawPosLimit * 180) / Math.PI);
          const rawNegValue = Math.round((rawNegLimit * 180) / Math.PI);
          const effectivePosValue = Math.round((effectivePosLimit * 180) / Math.PI);
          const effectiveNegValue = Math.round((effectiveNegLimit * 180) / Math.PI);
          const posConstrained = effectivePosValue < rawPosValue;
          const negConstrained = effectiveNegValue < rawNegValue;

          return (
            <div key={point} className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-black capitalize w-12 shrink-0">{point}</span>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px] text-gray-600 shrink-0">+</span>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={rawPosValue}
                  onChange={(e) => handleSliderChange(point, "positive", Number(e.target.value))}
                  className="flex-1 min-w-0"
                />
                <span className={`text-[10px] w-7 text-right shrink-0 ${posConstrained ? "text-orange-500" : "text-black"}`}>
                  {effectivePosValue}°
                </span>
              </div>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px] text-gray-600 shrink-0">-</span>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={rawNegValue}
                  onChange={(e) => handleSliderChange(point, "negative", Number(e.target.value))}
                  className="flex-1 min-w-0"
                />
                <span className={`text-[10px] w-7 text-right shrink-0 ${negConstrained ? "text-orange-500" : "text-black"}`}>
                  {effectiveNegValue}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LinkPreview({ animalType, linkIndex }: LinkPreviewProps) {
  const isDragon = animalType === "Dragon";

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: isDragon ? [0, 2, 4] : [0, 0, 1], fov: 50 }}>
        <color attach="background" args={["#f3f4f6"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />

        <Suspense fallback={null}>
          {isDragon ? (
            <DragonLinkPreview linkIndex={linkIndex} />
          ) : (
            <CharacterLinkPreview linkIndex={linkIndex} />
          )}
        </Suspense>

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={0.5}
          maxDistance={isDragon ? 10 : 3}
          mouseButtons={{
            LEFT: undefined,
            MIDDLE: 0,
            RIGHT: 2,
          }}
        />
      </Canvas>
      <RotationControls animalType={animalType} linkIndex={linkIndex} />
    </div>
  );
}
