"use client";

import { RigidBody } from "@react-three/rapier";

export function Environment() {
  return (
    <>
      <RigidBody type="fixed" position={[0, 0, 0]} friction={1}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
      </RigidBody>
    </>
  );
}
