"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useChain } from "./useChain";
import { PlayerController } from "./PlayerController";
import { FlattenedSphere } from "./FlattenedSphere";

interface SnakeVisualProps {
  controlRef: React.RefObject<RapierRigidBody | null>;
}

function SnakeVisual({ controlRef }: SnakeVisualProps) {
  const chain = useChain({ segmentCount: 24, segmentLength: 0.25, stiffness: 0.3 });
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
              <FlattenedSphere radius={0.15} flattenDepth={0.06} />
              <meshStandardMaterial color="#ac3931" metalness={0.4} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.1, 0.035, 12, 24]} />
              <meshStandardMaterial color="#ac3931" metalness={0.4} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
              <torusGeometry args={[0.1, 0.035, 12, 24]} />
              <meshStandardMaterial color="#ac3931" metalness={0.4} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Snake() {
  return <PlayerController>{(controlRef) => <SnakeVisual controlRef={controlRef} />}</PlayerController>;
}
