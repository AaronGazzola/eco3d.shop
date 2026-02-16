"use client";

import { Suspense, useRef } from "react";
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

  const baseColor = isTip ? "#ff0000" : point === "front" ? "#0000ff" : "#00ff00";
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
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? activeColor : baseColor}
          emissive={isActive ? activeColor : baseColor}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {isActive && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"
          size={0.5}
          onObjectChange={() => {
            if (!meshRef.current) return;
            const p = meshRef.current.position;
            const displayLabel = label ?? `${animalType} Link ${linkIndex}`;
            console.log(`[${displayLabel}] ${point} connection: [${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)}]`);
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

export function LinkPreview({ animalType, linkIndex }: LinkPreviewProps) {
  const isDragon = animalType === "Dragon";

  return (
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
  );
}
