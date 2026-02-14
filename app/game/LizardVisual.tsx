"use client";

import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useChain } from "./useChain";

interface LizardVisualProps {
  controlRef: React.RefObject<RapierRigidBody | null>;
}

export function LizardVisual({ controlRef }: LizardVisualProps) {
  const chain = useChain({ segmentCount: 14, segmentLength: 0.28, stiffness: 0.35 });
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  console.log(`LizardVisual rendered - Chain segments: ${chain.positions.length}`);

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

  const widths = [0.45, 0.48, 0.35, 0.5, 0.55, 0.58, 0.52, 0.4, 0.25, 0.15, 0.12, 0.1, 0.08, 0.08];

  return (
    <group>
      {chain.positions.map((pos, i) => {
        const scale = widths[i] || 0.1;
        return (
          <mesh key={i} ref={(el) => (meshRefs.current[i] = el)} position={pos}>
            <sphereGeometry args={[scale, 16, 16]} />
            <meshStandardMaterial color="#52796f" metalness={0.2} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
