"use client";

import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useChain } from "./useChain";
import { PlayerController } from "./PlayerController";

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
      {chain.positions.map((pos, i) => {
        const scale = i === 0 ? 0.35 : i === 1 ? 0.37 : Math.max(0.1, 0.3 - i * 0.01);
        return (
          <mesh key={i} ref={(el) => (meshRefs.current[i] = el)} position={pos}>
            <sphereGeometry args={[scale, 16, 16]} />
            <meshStandardMaterial color="#ac3931" metalness={0.3} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Snake() {
  return <PlayerController>{(controlRef) => <SnakeVisual controlRef={controlRef} />}</PlayerController>;
}
