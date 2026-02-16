"use client";

import { useCompoundBody } from "@react-three/cannon";
import { FlattenedSphere } from "./FlattenedSphere";
import { ReactNode, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useConvexDecomposition } from "./useConvexDecomposition";
import * as THREE from "three";

interface WrapperProps {
  children: ReactNode;
  position: [number, number, number];
  rotation: [number, number, number];
  collisionEnabled: boolean;
  restitution: number;
  friction: number;
  mass: number;
  scale: number;
  apiRef?: React.MutableRefObject<any>;
}

function PhysicsWrapper({ children, position, rotation, collisionEnabled, restitution, friction, mass, scale, apiRef }: WrapperProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { shapes } = useConvexDecomposition(scale);

  const [ref, api] = useCompoundBody(
    () => ({
      mass: 1,
      position,
      rotation,
      material: { restitution, friction },
      type: "Dynamic",
      shapes: shapes.map(shape => ({
        type: shape.type,
        args: shape.args,
        position: shape.position,
        rotation: shape.rotation,
      })),
    }),
    groupRef
  );

  useFrame(() => {
    if (api && api.mass) {
      api.mass.set(collisionEnabled ? mass : 0);
    }
  });

  if (apiRef) {
    apiRef.current = api;
  }

  return (
    <group ref={ref as any}>
      {children}
    </group>
  );
}

function CharacterLink({ color, scale = 1 }: { color: string; scale?: number }) {
  const config = {
    radius: 0.16 * scale,
    flattenDepth: 0.065 * scale,
    torusRadius: 0.11 * scale,
    tubeRadius: 0.038 * scale,
    donutOffset: 0.13 * scale,
    metalness: 0.3,
    roughness: 0.7,
  };

  return (
    <group>
      <mesh castShadow>
        <FlattenedSphere radius={config.radius} flattenDepth={config.flattenDepth} />
        <meshStandardMaterial
          color={color}
          metalness={config.metalness}
          roughness={config.roughness}
        />
      </mesh>
      <mesh castShadow position={[0, 0, -config.donutOffset]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[config.torusRadius, config.tubeRadius, 12, 24]} />
        <meshStandardMaterial
          color={color}
          metalness={config.metalness}
          roughness={config.roughness}
        />
      </mesh>
      <mesh castShadow position={[0, 0, config.donutOffset]} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
        <torusGeometry args={[config.torusRadius, config.tubeRadius, 12, 24]} />
        <meshStandardMaterial
          color={color}
          metalness={config.metalness}
          roughness={config.roughness}
        />
      </mesh>
    </group>
  );
}

interface FallingSpheresProps {
  collisionEnabled: boolean;
  restitution: number;
  friction: number;
  mass: number;
  linkSpacing: number;
}

export function FallingSpheres({ collisionEnabled, restitution, friction, mass, linkSpacing }: FallingSpheresProps) {
  const scale = 4;
  const groundHeight = 0.5;
  const connectionOffset = (0.13 + 0.07) * scale;
  const spacing = connectionOffset * linkSpacing;

  const { camera, raycaster, size } = useThree();
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mousePosition = useRef(new THREE.Vector2());
  const link1Ref = useRef<any>(null);
  const link2Ref = useRef<any>(null);

  useFrame(() => {
    if (isMouseDown && link1Ref.current && collisionEnabled) {
      raycaster.setFromCamera(mousePosition.current, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundHeight);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        link1Ref.current.position.set(intersection.x, groundHeight, intersection.z);
        link1Ref.current.velocity.set(0, 0, 0);
      }
    }
  });

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

      <PhysicsWrapper
        position={[0, groundHeight, 0]}
        rotation={[0, Math.PI / 2, 0]}
        collisionEnabled={collisionEnabled}
        restitution={restitution}
        friction={friction}
        mass={mass}
        scale={scale}
        apiRef={link1Ref}
      >
        <CharacterLink color="#3b82f6" scale={scale} />
      </PhysicsWrapper>

      <PhysicsWrapper
        position={[spacing, groundHeight, 0]}
        rotation={[0, Math.PI / 2, 0]}
        collisionEnabled={collisionEnabled}
        restitution={restitution}
        friction={friction}
        mass={mass}
        scale={scale}
        apiRef={link2Ref}
      >
        <CharacterLink color="#22c55e" scale={scale} />
      </PhysicsWrapper>
    </>
  );
}
