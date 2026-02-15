"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useEditModeStore } from "../page.stores";
import { FlattenedSphere } from "./FlattenedSphere";

interface CharacterProps {
  linkCount: number;
  collectiblePosition: THREE.Vector3;
  onCollect: () => void;
}

export function Character({ linkCount, collectiblePosition, onCollect }: CharacterProps) {
  const linkRefs = useRef<(THREE.Group | null)[]>([]);
  const { isEditMode, selectedLink, selectLink } = useEditModeStore();
  const { camera, raycaster, size } = useThree();

  const [isMouseDown, setIsMouseDown] = useState(false);
  const mousePosition = useRef(new THREE.Vector2());
  const frontTarget = useRef(new THREE.Vector3(0, 0.5, 0));
  const frontPosition = useRef(new THREE.Vector3(0, 0.5, 0));
  const linkPositions = useRef<THREE.Vector3[]>([]);
  const linkRotations = useRef<number[]>([]);

  useEffect(() => {
    while (linkPositions.current.length < linkCount) {
      const lastIndex = linkPositions.current.length - 1;
      const lastPos = lastIndex >= 0 ? linkPositions.current[lastIndex] : new THREE.Vector3(0, 0.5, -0.2);
      linkPositions.current.push(lastPos.clone().add(new THREE.Vector3(0, 0, -0.4)));
      linkRotations.current.push(0);
    }
  }, [linkCount]);

  useFrame(() => {
    if (linkRefs.current.length < linkCount) return;

    if (isMouseDown) {
      raycaster.setFromCamera(mousePosition.current, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        frontTarget.current.copy(intersection);
      }
    }

    frontPosition.current.lerp(frontTarget.current, 0.15);

    const distance = frontPosition.current.distanceTo(collectiblePosition);
    if (distance < 0.3) {
      onCollect();
    }

    for (let i = 0; i < linkCount; i++) {
      const ref = linkRefs.current[i];
      if (!ref) continue;

      if (i === 0) {
        const direction = new THREE.Vector3()
          .subVectors(frontPosition.current, linkPositions.current[i])
          .normalize();

        linkPositions.current[i].copy(frontPosition.current)
          .add(direction.clone().multiplyScalar(-linkConfig.frontConnectionOffset));

        const angle = Math.atan2(direction.x, direction.z);
        linkRotations.current[i] = angle;
      } else {
        const prevBackPosition = linkPositions.current[i - 1].clone()
          .add(new THREE.Vector3(
            Math.sin(linkRotations.current[i - 1]),
            0,
            Math.cos(linkRotations.current[i - 1])
          ).multiplyScalar(-linkConfig.backConnectionOffset));

        const pullDirection = new THREE.Vector3()
          .subVectors(prevBackPosition, linkPositions.current[i])
          .normalize();

        const targetAngle = Math.atan2(pullDirection.x, pullDirection.z);
        let angleDiff = targetAngle - (linkRotations.current[i] % (Math.PI * 2));
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        linkRotations.current[i] += angleDiff * 0.35;

        const direction = new THREE.Vector3(
          Math.sin(linkRotations.current[i]),
          0,
          Math.cos(linkRotations.current[i])
        );

        linkPositions.current[i].copy(prevBackPosition)
          .add(direction.clone().multiplyScalar(-linkConfig.frontConnectionOffset));
      }

      ref.position.copy(linkPositions.current[i]);
      ref.rotation.y = linkRotations.current[i];
    }
  });

  const linkConfig = {
    radius: 0.16,
    flattenDepth: 0.065,
    torusRadius: 0.11,
    tubeRadius: 0.038,
    color: "#52796f",
    metalness: 0.3,
    roughness: 0.7,
    donutOffset: 0.13,
    frontConnectionOffset: 0.13 + 0.07,
    backConnectionOffset: 0.13 + 0.07,
  };

  return (
    <>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsMouseDown(true);
          mousePosition.current.x = (e.clientX / size.width) * 2 - 1;
          mousePosition.current.y = -(e.clientY / size.height) * 2 + 1;
        }}
        onPointerMove={(e) => {
          if (isMouseDown) {
            e.stopPropagation();
            mousePosition.current.x = (e.clientX / size.width) * 2 - 1;
            mousePosition.current.y = -(e.clientY / size.height) * 2 + 1;
          }
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setIsMouseDown(false);
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <group>
        {Array.from({ length: linkCount }).map((_, i) => {
          const isSelected = selectedLink?.linkIndex === i;
          return (
            <group
              key={i}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              onClick={(e) => {
                if (isEditMode) {
                  e.stopPropagation();
                  selectLink("Character", i, `Link ${i + 1}`);
                }
              }}
            >
              <mesh>
                <FlattenedSphere radius={linkConfig.radius} flattenDepth={linkConfig.flattenDepth} />
                <meshStandardMaterial
                  color={isSelected ? "#7ab8a8" : linkConfig.color}
                  metalness={linkConfig.metalness}
                  roughness={linkConfig.roughness}
                />
              </mesh>
              <mesh position={[0, 0, -linkConfig.donutOffset]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[linkConfig.torusRadius, linkConfig.tubeRadius, 12, 24]} />
                <meshStandardMaterial
                  color={isSelected ? "#7ab8a8" : linkConfig.color}
                  metalness={linkConfig.metalness}
                  roughness={linkConfig.roughness}
                />
              </mesh>
              {isSelected && (
                <mesh position={[0, 0, -linkConfig.frontConnectionOffset]}>
                  <sphereGeometry args={[0.04, 16, 16]} />
                  <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} toneMapped={false} />
                </mesh>
              )}
              <mesh position={[0, 0, linkConfig.donutOffset]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
                <torusGeometry args={[linkConfig.torusRadius, linkConfig.tubeRadius, 12, 24]} />
                <meshStandardMaterial
                  color={isSelected ? "#7ab8a8" : linkConfig.color}
                  metalness={linkConfig.metalness}
                  roughness={linkConfig.roughness}
                />
              </mesh>
              {isSelected && (
                <mesh position={[0, 0, linkConfig.backConnectionOffset]}>
                  <sphereGeometry args={[0.04, 16, 16]} />
                  <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} toneMapped={false} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </>
  );
}
