"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useChain } from "./useChain";
import { PlayerController } from "./PlayerController";
import { useEditModeStore } from "../page.stores";
import { FlattenedSphere } from "./FlattenedSphere";

function getLinkName(index: number, total: number): string {
  if (index === 0) return "Head";
  if (index === 1) return "Neck";
  if (index >= total - 2) return `Tail ${total - index}`;
  return `Body ${index - 1}`;
}

interface FishVisualProps {
  controlRef: React.RefObject<RapierRigidBody | null>;
}

function FishVisual({ controlRef }: FishVisualProps) {
  const chain = useChain({ segmentCount: 12, segmentLength: 0.3, stiffness: 0.4 });
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { isEditMode, selectedLink, selectLink } = useEditModeStore();

  useFrame(() => {
    if (!controlRef.current) return;

    const position = controlRef.current.translation();
    const targetPosition = new THREE.Vector3(position.x, position.y, position.z);
    chain.update(targetPosition);

    meshRefs.current.forEach((mesh, i) => {
      if (mesh && chain.positions[i]) {
        mesh.position.copy(chain.positions[i]);
      }
    });
  });

  return (
    <group>
      {chain.positions.map((_, i) => {
        const linkName = getLinkName(i, chain.positions.length);
        const isSelected = selectedLink?.animalType === "Fish" && selectedLink?.linkIndex === i;
        const rotation = (i * Math.PI) / 2;

        return (
          <group
            key={`link-${i}`}
            ref={(el) => {
              meshRefs.current[i] = el as any;
            }}
            onClick={(e) => {
              if (isEditMode) {
                e.stopPropagation();
                selectLink("Fish", i, linkName);
              }
            }}
            rotation={[0, rotation, 0]}
          >
            <mesh>
              <FlattenedSphere radius={0.18} flattenDepth={0.07} />
              <meshStandardMaterial
                color={isSelected ? "#6bb6ff" : "#3a7ca5"}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
            <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.12, 0.04, 12, 24]} />
              <meshStandardMaterial
                color={isSelected ? "#6bb6ff" : "#3a7ca5"}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
            <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
              <torusGeometry args={[0.12, 0.04, 12, 24]} />
              <meshStandardMaterial
                color={isSelected ? "#6bb6ff" : "#3a7ca5"}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Fish() {
  return <PlayerController>{(controlRef) => <FishVisual controlRef={controlRef} />}</PlayerController>;
}
