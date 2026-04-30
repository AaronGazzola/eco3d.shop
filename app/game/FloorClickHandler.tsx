'use client'

import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_SIZE } from './SkeletonScene.constants'

type MutableRefObject<T> = { current: T }

export function FloorClickHandler({
  userTargetGoalRef,
  scale = 1,
  origin = { x: 0, z: 0 },
}: {
  userTargetGoalRef: MutableRefObject<THREE.Vector3>
  scale?: number
  origin?: { x: number; z: number }
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        const tx = origin.x + (e.point.x - origin.x) / scale
        const tz = origin.z + (e.point.z - origin.z) / scale
        userTargetGoalRef.current.set(tx, 0, tz)
      }}
    >
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <meshStandardMaterial color="#0d0d0d" />
    </mesh>
  )
}
