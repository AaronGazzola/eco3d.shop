"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { usePointerControl } from "./usePointerControl";

interface PlayerControllerProps {
  children: (controlRef: React.RefObject<RapierRigidBody | null>) => React.ReactNode;
}

export function PlayerController({ children }: PlayerControllerProps) {
  const controlRef = useRef<RapierRigidBody>(null);
  const { gl, camera } = useThree();
  const canvasRef = useRef(gl.domElement);
  const pointerControl = usePointerControl(canvasRef);

  useFrame((state) => {
    if (!controlRef.current) return;

    const moveSpeed = 5;
    const velocity = { x: 0, z: 0 };

    if (pointerControl.isActive && pointerControl.targetPosition) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointerControl.targetPosition, camera);

      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersectPoint);

      if (intersectPoint) {
        const position = controlRef.current.translation();
        const direction = new THREE.Vector3(
          intersectPoint.x - position.x,
          0,
          intersectPoint.z - position.z
        );

        if (direction.length() > 0.5) {
          direction.normalize();
          velocity.x = direction.x * moveSpeed;
          velocity.z = direction.z * moveSpeed;

          console.log(
            `Movement - Target: x:${intersectPoint.x.toFixed(2)} z:${intersectPoint.z.toFixed(2)} - Position: x:${position.x.toFixed(2)} z:${position.z.toFixed(2)}`
          );
        }
      }
    }

    const currentLinvel = controlRef.current.linvel();

    controlRef.current.setLinvel({ x: velocity.x, y: currentLinvel.y, z: velocity.z }, true);

    const position = controlRef.current.translation();
    const cameraOffset = new THREE.Vector3(0, 5, 8);

    state.camera.position.lerp(
      new THREE.Vector3(
        position.x + cameraOffset.x,
        position.y + cameraOffset.y,
        position.z + cameraOffset.z
      ),
      0.1
    );

    state.camera.lookAt(position.x, position.y, position.z);
  });

  return (
    <>
      <RigidBody
        ref={controlRef}
        position={[0, 0.5, 0]}
        colliders="ball"
        linearDamping={0.5}
        angularDamping={1}
        restitution={0}
        friction={0}
        lockRotations={true}
      >
        <mesh castShadow visible={false}>
          <sphereGeometry args={[0.5, 32, 32]} />
        </mesh>
      </RigidBody>
      {children(controlRef)}
    </>
  );
}
