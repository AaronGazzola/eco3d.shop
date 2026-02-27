'use client'

import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_SIZE } from './SkeletonScene.constants'

type MutableRefObject<T> = { current: T }

export function FloorClickHandler({
  userTargetGoalRef,
}: {
  userTargetGoalRef: MutableRefObject<THREE.Vector3>
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        userTargetGoalRef.current.set(e.point.x, 0, e.point.z)
      }}
    >
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <meshStandardMaterial color="#0d0d0d" />
    </mesh>
  )
}
