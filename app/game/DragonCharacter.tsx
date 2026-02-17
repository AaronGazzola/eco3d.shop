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

function RotationLimitVisualization({
  position,
  animalType,
  linkIndex,
  point,
  allConnectionPoints,
}: {
  position: [number, number, number];
  animalType: string;
  linkIndex: number;
  point: "front" | "back" | "tipFront" | "tipBack";
  allConnectionPoints?: {
    tipFront?: [number, number, number];
    front?: [number, number, number];
    back?: [number, number, number];
    tipBack?: [number, number, number];
  };
}) {
  const { getRotationLimit } = useEditModeStore();
  let positiveLimit = getRotationLimit(animalType, linkIndex, point, "positive");
  let negativeLimit = getRotationLimit(animalType, linkIndex, point, "negative");

  const frontPos = allConnectionPoints?.front;
  const backPos = allConnectionPoints?.back;

  if (point === "back" && linkIndex === 2) {
    const childFrontPosLimit = getRotationLimit(animalType, 1, "front", "positive");
    const childFrontNegLimit = getRotationLimit(animalType, 1, "front", "negative");
    positiveLimit = Math.min(positiveLimit, childFrontPosLimit);
    negativeLimit = Math.min(negativeLimit, childFrontNegLimit);
  } else if (point === "front" && linkIndex === 1) {
    const parentBackPosLimit = getRotationLimit(animalType, 2, "back", "positive");
    const parentBackNegLimit = getRotationLimit(animalType, 2, "back", "negative");
    positiveLimit = Math.min(positiveLimit, parentBackPosLimit);
    negativeLimit = Math.min(negativeLimit, parentBackNegLimit);
  } else if (point === "back" && linkIndex === 1) {
    const childFrontPosLimit = getRotationLimit(animalType, 0, "front", "positive");
    const childFrontNegLimit = getRotationLimit(animalType, 0, "front", "negative");
    positiveLimit = Math.min(positiveLimit, childFrontPosLimit);
    negativeLimit = Math.min(negativeLimit, childFrontNegLimit);
  } else if (point === "front" && linkIndex === 0) {
    const parentBackPosLimit = getRotationLimit(animalType, 1, "back", "positive");
    const parentBackNegLimit = getRotationLimit(animalType, 1, "back", "negative");
    positiveLimit = Math.min(positiveLimit, parentBackPosLimit);
    negativeLimit = Math.min(negativeLimit, parentBackNegLimit);
  }

  console.log(`RotationLimitVisualization rendering: ${animalType}-${linkIndex} ${point}`);
  console.log(`  Effective limits: +${positiveLimit.toFixed(4)} / -${negativeLimit.toFixed(4)}`);

  if (frontPos && backPos) {
    const frontAngle = Math.atan2(frontPos[2], frontPos[0]);
    const backAngle = Math.atan2(backPos[2], backPos[0]);

    const frontPosLimit = getRotationLimit(animalType, linkIndex, "front", "positive");
    const frontNegLimit = getRotationLimit(animalType, linkIndex, "front", "negative");
    const backPosLimit = getRotationLimit(animalType, linkIndex, "back", "positive");
    const backNegLimit = getRotationLimit(animalType, linkIndex, "back", "negative");

    const frontPosWallAngle = frontAngle + frontPosLimit;
    const frontNegWallAngle = frontAngle - frontNegLimit;
    const backPosWallAngle = backAngle + backPosLimit;
    const backNegWallAngle = backAngle - backNegLimit;

    const posToPosGap = Math.abs(backPosWallAngle - frontPosWallAngle);
    const posToNegGap = Math.abs(backPosWallAngle - frontNegWallAngle);
    const negToPosGap = Math.abs(backNegWallAngle - frontPosWallAngle);
    const negToNegGap = Math.abs(backNegWallAngle - frontNegWallAngle);
    const minGap = Math.min(posToPosGap, posToNegGap, negToPosGap, negToNegGap);

    console.log(`${animalType}-${linkIndex} ${point} - Rotation Limit Wall Angles:`);
    console.log(`  FRONT connection:`);
    console.log(`    Positive wall: ${frontPosWallAngle.toFixed(4)} rad (${(frontPosWallAngle * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`    Negative wall: ${frontNegWallAngle.toFixed(4)} rad (${(frontNegWallAngle * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`  BACK connection:`);
    console.log(`    Positive wall: ${backPosWallAngle.toFixed(4)} rad (${(backPosWallAngle * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`    Negative wall: ${backNegWallAngle.toFixed(4)} rad (${(backNegWallAngle * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`  Wall-to-wall gaps:`);
    console.log(`    Back+ to Front+: ${posToPosGap.toFixed(4)} rad (${(posToPosGap * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`    Back+ to Front-: ${posToNegGap.toFixed(4)} rad (${(posToNegGap * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`    Back- to Front+: ${negToPosGap.toFixed(4)} rad (${(negToPosGap * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`    Back- to Front-: ${negToNegGap.toFixed(4)} rad (${(negToNegGap * 180 / Math.PI).toFixed(2)}°)`);
    console.log(`    MINIMUM GAP: ${minGap.toFixed(4)} rad (${(minGap * 180 / Math.PI).toFixed(2)}°)`);

    if (point === "back") {
      let angleDiff = backAngle - frontAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const maxAllowedLimit = Math.abs(angleDiff) - 0.1;

      if (positiveLimit > maxAllowedLimit) {
        positiveLimit = maxAllowedLimit;
      }
      if (negativeLimit > maxAllowedLimit) {
        negativeLimit = maxAllowedLimit;
      }
    }
  }

  const wallRadius = 0.3;
  const wallHeight = 0.02;

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={point.includes("Front") ? "#00ff00" : "#ff00ff"}
          emissive={point.includes("Front") ? "#00ff00" : "#ff00ff"}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

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

function DragonLink({
  piece,
  isSelected,
  onClick,
  connectionPoints,
  animalType,
  linkIndex,
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
  animalType: string;
  linkIndex: number;
}) {
  const { isEditMode } = useEditModeStore();

  return (
    <group onClick={onClick}>
      <mesh geometry={piece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={isSelected ? "#e8d5a8" : "#c9b18c"}
          metalness={0.3}
          roughness={0.6}
          transparent={isEditMode}
          opacity={isEditMode ? 0.3 : 1.0}
        />
      </mesh>

      {isEditMode && connectionPoints?.front && (
        <RotationLimitVisualization
          position={connectionPoints.front}
          animalType={animalType}
          linkIndex={linkIndex}
          point="front"
          allConnectionPoints={connectionPoints}
        />
      )}
      {isEditMode && connectionPoints?.back && (
        <RotationLimitVisualization
          position={connectionPoints.back}
          animalType={animalType}
          linkIndex={linkIndex}
          point="back"
          allConnectionPoints={connectionPoints}
        />
      )}
    </group>
  );
}

function DragonChain({ pieces }: { pieces: DragonPiece[] }) {
  const { isEditMode, selectedLink, selectLink, connectionOffsets, getRotationLimit } = useEditModeStore();
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
  const prevBodyRelativeRotation = useRef(0);
  const prevTailRelativeRotation = useRef(0);

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

  function clampRotationWithLimits(
    desiredRotation: number,
    parentRotation: number,
    parentLinkIndex: number,
    childLinkIndex: number,
    prevRelativeRotationRef: React.MutableRefObject<number>
  ): number {
    const parentBackPosLimit = getRotationLimit("Dragon", parentLinkIndex, "back", "positive");
    const parentBackNegLimit = getRotationLimit("Dragon", parentLinkIndex, "back", "negative");
    const childFrontPosLimit = getRotationLimit("Dragon", childLinkIndex, "front", "positive");
    const childFrontNegLimit = getRotationLimit("Dragon", childLinkIndex, "front", "negative");

    const positiveLimit = Math.min(parentBackPosLimit, childFrontPosLimit);
    const negativeLimit = Math.min(parentBackNegLimit, childFrontNegLimit);

    let desiredRelative = desiredRotation - parentRotation;
    const prevRelative = prevRelativeRotationRef.current;

    let delta = desiredRelative - prevRelative;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    let newRelative = prevRelative + delta;

    if (newRelative > positiveLimit) {
      newRelative = positiveLimit;
    } else if (newRelative < -negativeLimit) {
      newRelative = -negativeLimit;
    }

    prevRelativeRotationRef.current = newRelative;
    return parentRotation + newRelative;
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
    let bodyRotation = Math.atan2(-bodyDirection.z, bodyDirection.x);
    bodyRotation = clampRotationWithLimits(bodyRotation, headRotation, 2, 1, prevBodyRelativeRotation);

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
    let tailRotation = Math.atan2(-tailDirection.z, tailDirection.x);
    tailRotation = clampRotationWithLimits(tailRotation, bodyRotation, 1, 0, prevTailRelativeRotation);

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

    if (isEditMode) {
      const currentBodyRelative = prevBodyRelativeRotation.current;
      const currentTailRelative = prevTailRelativeRotation.current;

      const head2BackPosLimit = getRotationLimit("Dragon", 2, "back", "positive");
      const head2BackNegLimit = getRotationLimit("Dragon", 2, "back", "negative");
      const body1FrontPosLimit = getRotationLimit("Dragon", 1, "front", "positive");
      const body1FrontNegLimit = getRotationLimit("Dragon", 1, "front", "negative");

      const effectiveHeadBodyPosLimit = Math.min(head2BackPosLimit, body1FrontPosLimit);
      const effectiveHeadBodyNegLimit = Math.min(head2BackNegLimit, body1FrontNegLimit);

      const headBodyPosGap = effectiveHeadBodyPosLimit - currentBodyRelative;
      const headBodyNegGap = effectiveHeadBodyNegLimit + currentBodyRelative;
      const headBodyMinGap = Math.min(headBodyPosGap, headBodyNegGap);

      const body1BackPosLimit = getRotationLimit("Dragon", 1, "back", "positive");
      const body1BackNegLimit = getRotationLimit("Dragon", 1, "back", "negative");
      const tail0FrontPosLimit = getRotationLimit("Dragon", 0, "front", "positive");
      const tail0FrontNegLimit = getRotationLimit("Dragon", 0, "front", "negative");

      const effectiveBodyTailPosLimit = Math.min(body1BackPosLimit, tail0FrontPosLimit);
      const effectiveBodyTailNegLimit = Math.min(body1BackNegLimit, tail0FrontNegLimit);

      const bodyTailPosGap = effectiveBodyTailPosLimit - currentTailRelative;
      const bodyTailNegGap = effectiveBodyTailNegLimit + currentTailRelative;
      const bodyTailMinGap = Math.min(bodyTailPosGap, bodyTailNegGap);

      console.log(
        `Frame - Head↔Body: ${headBodyMinGap.toFixed(4)} rad (${(headBodyMinGap * 180 / Math.PI).toFixed(2)}°) ` +
        `[curr: ${currentBodyRelative.toFixed(2)}, limits: +${effectiveHeadBodyPosLimit.toFixed(2)}/-${effectiveHeadBodyNegLimit.toFixed(2)}] | ` +
        `Body↔Tail: ${bodyTailMinGap.toFixed(4)} rad (${(bodyTailMinGap * 180 / Math.PI).toFixed(2)}°) ` +
        `[curr: ${currentTailRelative.toFixed(2)}, limits: +${effectiveBodyTailPosLimit.toFixed(2)}/-${effectiveBodyTailNegLimit.toFixed(2)}]`
      );
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
                animalType="Dragon"
                linkIndex={i}
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
