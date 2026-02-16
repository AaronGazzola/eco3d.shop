"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEditModeStore } from "../page.stores";
import { useSplitStl, DragonPiece } from "./StlModel";

interface DragonCharacterProps {
  linkCount: number;
  collectiblePosition: THREE.Vector3;
  onCollect: () => void;
}

function DragonLink({
  piece,
  isSelected,
  onClick,
  connectionPoints,
}: {
  piece: DragonPiece;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  connectionPoints?: {
    tipFront?: [number, number, number];
    front?: [number, number, number];
    back?: [number, number, number];
    tipBack?: [number, number, number];
  };
}) {
  return (
    <group onClick={onClick}>
      <mesh geometry={piece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={isSelected ? "#e8d5a8" : "#c9b18c"}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}

function DragonChain({ pieces }: { pieces: DragonPiece[] }) {
  const { isEditMode, selectedLink, selectLink, connectionOffsets } = useEditModeStore();
  const { camera, raycaster, size, gl } = useThree();

  const targetPosition = useRef(new THREE.Vector3(0, 0.5, 0));
  const headTipPos = useRef(new THREE.Vector3(0, 0.5, 0));
  const headBackPos = useRef(new THREE.Vector3(0, 0.3, 0));
  const bodyFrontPos = useRef(new THREE.Vector3(0, 0.3, 0));
  const bodyBackPos = useRef(new THREE.Vector3(0, 0.1, 0));
  const tailFrontPos = useRef(new THREE.Vector3(0, 0.1, 0));
  const tailBackPos = useRef(new THREE.Vector3(0, -0.1, 0));
  const dragonGroups = useRef<(THREE.Group | null)[]>([null, null, null]);
  const isMouseDown = useRef(false);

  const headPiece = pieces.find((p) => p.label === "Head")!;
  const bodyPiece = pieces.find((p) => p.label === "Body")!;
  const tailPiece = pieces.find((p) => p.label === "Tail")!;

  const links = [tailPiece, bodyPiece, headPiece];

  function getConnectionPointsLocal(i: number): {
    tipFront?: [number, number, number];
    front?: [number, number, number];
    back?: [number, number, number];
    tipBack?: [number, number, number];
  } {
    const key = `Dragon-${i}`;
    const offsets = connectionOffsets[key];

    if (i === 2) {
      return {
        tipFront: offsets?.tipFront ?? [0.9169, -0.1559, 0.0612],
        back: offsets?.back ?? [0.1314, -0.1747, -0.0115],
      };
    } else if (i === 0) {
      return {
        front: offsets?.front ?? [-0.1350, -0.1436, 0.0248],
        tipBack: offsets?.tipBack ?? [-0.9625, -0.2899, 0.3212],
      };
    } else {
      return {
        front: offsets?.front ?? [0.1300, -0.1435, -0.0109],
        back: offsets?.back ?? [-0.1451, -0.1378, 0.0282],
      };
    }
  }

  useFrame(() => {
    if (isMouseDown.current) {
      headTipPos.current.lerp(targetPosition.current, 0.1);
    }

    const headTipLocal = getConnectionPointsLocal(2).tipFront!;
    const headBackLocal = getConnectionPointsLocal(2).back!;
    const distanceBetween = Math.sqrt(
      Math.pow(headTipLocal[0] - headBackLocal[0], 2) +
      Math.pow(headTipLocal[1] - headBackLocal[1], 2) +
      Math.pow(headTipLocal[2] - headBackLocal[2], 2)
    );

    const headBackTarget = headTipPos.current.clone().sub(
      new THREE.Vector3()
        .subVectors(headTipPos.current, headBackPos.current)
        .normalize()
        .multiplyScalar(distanceBetween)
    );
    headBackPos.current.lerp(headBackTarget, 0.15);

    const headDirection = new THREE.Vector3()
      .subVectors(headTipPos.current, headBackPos.current)
      .normalize();

    const headRotation = Math.atan2(-headDirection.z, headDirection.x);

    const headTipLocalVec = new THREE.Vector3(headTipLocal[0], headTipLocal[1], headTipLocal[2]);
    headTipLocalVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), headRotation);
    const headPos = headTipPos.current.clone().sub(headTipLocalVec);

    const headBackLocalVec = new THREE.Vector3(headBackLocal[0], headBackLocal[1], headBackLocal[2]);
    headBackLocalVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), headRotation);
    const headBackWorldPos = headPos.clone().add(headBackLocalVec);

    const bodyFrontLocal = getConnectionPointsLocal(1).front!;
    const bodyBackLocal = getConnectionPointsLocal(1).back!;
    const bodyDistanceBetween = Math.sqrt(
      Math.pow(bodyFrontLocal[0] - bodyBackLocal[0], 2) +
      Math.pow(bodyFrontLocal[1] - bodyBackLocal[1], 2) +
      Math.pow(bodyFrontLocal[2] - bodyBackLocal[2], 2)
    );

    bodyFrontPos.current.copy(headBackWorldPos);

    const bodyBackTarget = bodyFrontPos.current.clone().sub(
      new THREE.Vector3()
        .subVectors(bodyFrontPos.current, bodyBackPos.current)
        .normalize()
        .multiplyScalar(bodyDistanceBetween)
    );
    bodyBackPos.current.lerp(bodyBackTarget, 0.2);

    const bodyDirection = new THREE.Vector3()
      .subVectors(bodyFrontPos.current, bodyBackPos.current)
      .normalize();
    const bodyRotation = Math.atan2(-bodyDirection.z, bodyDirection.x);

    const bodyFrontLocalVec = new THREE.Vector3(bodyFrontLocal[0], bodyFrontLocal[1], bodyFrontLocal[2]);
    bodyFrontLocalVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyRotation);
    const bodyPos = bodyFrontPos.current.clone().sub(bodyFrontLocalVec);

    const bodyBackLocalVec = new THREE.Vector3(bodyBackLocal[0], bodyBackLocal[1], bodyBackLocal[2]);
    bodyBackLocalVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyRotation);
    const bodyBackWorldPos = bodyPos.clone().add(bodyBackLocalVec);

    const tailFrontLocal = getConnectionPointsLocal(0).front!;
    const tailBackLocal = getConnectionPointsLocal(0).tipBack!;
    const tailDistanceBetween = Math.sqrt(
      Math.pow(tailFrontLocal[0] - tailBackLocal[0], 2) +
      Math.pow(tailFrontLocal[1] - tailBackLocal[1], 2) +
      Math.pow(tailFrontLocal[2] - tailBackLocal[2], 2)
    );

    tailFrontPos.current.copy(bodyBackWorldPos);

    const tailBackTarget = tailFrontPos.current.clone().sub(
      new THREE.Vector3()
        .subVectors(tailFrontPos.current, tailBackPos.current)
        .normalize()
        .multiplyScalar(tailDistanceBetween)
    );
    tailBackPos.current.lerp(tailBackTarget, 0.2);

    const tailDirection = new THREE.Vector3()
      .subVectors(tailFrontPos.current, tailBackPos.current)
      .normalize();
    const tailRotation = Math.atan2(-tailDirection.z, tailDirection.x);

    const tailFrontLocalVec = new THREE.Vector3(tailFrontLocal[0], tailFrontLocal[1], tailFrontLocal[2]);
    tailFrontLocalVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), tailRotation);
    const tailPos = tailFrontPos.current.clone().sub(tailFrontLocalVec);

    if (dragonGroups.current[0]) {
      dragonGroups.current[0].position.copy(tailPos);
      dragonGroups.current[0].rotation.y = tailRotation;
    }
    if (dragonGroups.current[1]) {
      dragonGroups.current[1].position.copy(bodyPos);
      dragonGroups.current[1].rotation.y = bodyRotation;
    }
    if (dragonGroups.current[2]) {
      dragonGroups.current[2].position.copy(headPos);
      dragonGroups.current[2].rotation.y = headRotation;
    }
  });

  return (
    <>
      <mesh
        position={[0, 0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          isMouseDown.current = true;
          targetPosition.current.copy(e.point);
        }}
        onPointerMove={(e) => {
          if (isMouseDown.current) {
            targetPosition.current.copy(e.point);
          }
        }}
        onPointerUp={() => {
          isMouseDown.current = false;
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <group>
        {links.map((piece, i) => {
          const isSelected =
            selectedLink?.linkIndex === i &&
            selectedLink?.animalType === "Dragon";
          return (
            <group key={i} ref={(el) => (dragonGroups.current[i] = el)}>
              <DragonLink
                piece={piece}
                isSelected={isSelected}
                connectionPoints={getConnectionPointsLocal(i)}
                onClick={(e) => {
                  if (isEditMode) {
                    e.stopPropagation();
                    selectLink("Dragon", i, piece.label);
                  }
                }}
              />
            </group>
          );
        })}
      </group>
    </>
  );
}

export function DragonCharacter({
  linkCount,
  collectiblePosition,
  onCollect,
}: DragonCharacterProps) {
  const pieces = useSplitStl("/models/Bone_Dragon-1.stl");

  if (pieces.length < 3) return null;

  return (
    <Suspense fallback={null}>
      <DragonChain pieces={pieces} />
    </Suspense>
  );
}
