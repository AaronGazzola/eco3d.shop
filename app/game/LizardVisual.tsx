"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useChain } from "./useChain";
import { FlattenedSphere } from "./FlattenedSphere";

interface LizardVisualProps {
  controlRef: React.RefObject<RapierRigidBody | null>;
}

export function LizardVisual({ controlRef }: LizardVisualProps) {
  const chain = useChain({ segmentCount: 14, segmentLength: 0.28, stiffness: 0.35 });
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

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
        const rotation = (i * Math.PI) / 2;

        return (
          <group
            key={`link-${i}`}
            ref={(el) => {
              meshRefs.current[i] = el as any;
            }}
            rotation={[0, rotation, 0]}
          >
            <mesh>
              <FlattenedSphere radius={0.16} flattenDepth={0.065} />
              <meshStandardMaterial color="#52796f" metalness={0.3} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.11, 0.038, 12, 24]} />
              <meshStandardMaterial color="#52796f" metalness={0.3} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
              <torusGeometry args={[0.11, 0.038, 12, 24]} />
              <meshStandardMaterial color="#52796f" metalness={0.3} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
