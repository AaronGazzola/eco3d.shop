"use client";

import { Grid } from "@react-three/drei";

export function Environment() {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#f5f5f5" transparent opacity={0.5} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#888888"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#444444"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />
    </>
  );
}
