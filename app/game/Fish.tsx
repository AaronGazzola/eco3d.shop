"use client";

import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useChain } from "./useChain";
import { PlayerController } from "./PlayerController";

interface FishVisualProps {
  controlRef: React.RefObject<RapierRigidBody | null>;
}

function FishVisual({ controlRef }: FishVisualProps) {
  const chain = useChain({ segmentCount: 12, segmentLength: 0.3, stiffness: 0.4 });
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
        const scale = i < 10 ? 0.5 - i * 0.03 : 0.15;
        return (
          <mesh key={i} ref={(el) => (meshRefs.current[i] = el)} position={pos}>
            <sphereGeometry args={[scale, 16, 16]} />
            <meshStandardMaterial color="#3a7ca5" metalness={0.4} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Fish() {
  return <PlayerController>{(controlRef) => <FishVisual controlRef={controlRef} />}</PlayerController>;
}
