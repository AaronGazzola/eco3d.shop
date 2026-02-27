'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import {
  WANDER_FREQ_X,
  WANDER_FREQ_Z1,
  WANDER_FREQ_Z2,
  WANDER_AMP_Z2,
  CENTER_LERP_SPEED,
  ATTRACTOR_RADIUS,
  ATTRACTOR_COLOR,
  ATTRACTOR_EMISSIVE,
  CENTER_RADIUS,
  CENTER_COLOR,
} from './SkeletonScene.constants'

type MutableRefObject<T> = { current: T }

function WanderMarkers({
  attractorPosRef,
  centerPosRef,
  visible,
}: {
  attractorPosRef: MutableRefObject<THREE.Vector3>
  centerPosRef: MutableRefObject<THREE.Vector3>
  visible: boolean
}) {
  const attractorMeshRef = useRef<THREE.Mesh>(null)
  const centerMeshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    attractorMeshRef.current?.position.copy(attractorPosRef.current)
    centerMeshRef.current?.position.copy(centerPosRef.current)
  })

  return (
    <group visible={visible}>
      <mesh ref={attractorMeshRef}>
        <sphereGeometry args={[ATTRACTOR_RADIUS, 10, 10]} />
        <meshStandardMaterial color={ATTRACTOR_COLOR} emissive={ATTRACTOR_EMISSIVE} emissiveIntensity={1.2} />
      </mesh>
      <mesh ref={centerMeshRef}>
        <sphereGeometry args={[CENTER_RADIUS, 10, 10]} />
        <meshStandardMaterial color={CENTER_COLOR} emissive={CENTER_COLOR} emissiveIntensity={0.8} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

export function TargetController({
  targetRef,
  userTargetGoalRef,
  config,
  showAttractor,
}: {
  targetRef: MutableRefObject<THREE.Vector3>
  userTargetGoalRef: MutableRefObject<THREE.Vector3>
  config: CreatureConfig
  showAttractor: boolean
}) {
  const centerRef = useRef(new THREE.Vector3())
  const attractorPosRef = useRef(new THREE.Vector3())

  useFrame(({ clock }, delta) => {
    centerRef.current.lerp(userTargetGoalRef.current, CENTER_LERP_SPEED * delta)

    const t = clock.getElapsedTime() * config.wanderSpeed
    const r = config.wanderRadius
    const ax = centerRef.current.x + Math.sin(t * WANDER_FREQ_X) * r
    const az = centerRef.current.z + Math.cos(t * WANDER_FREQ_Z1) * r + Math.sin(t * WANDER_FREQ_Z2) * r * WANDER_AMP_Z2

    attractorPosRef.current.set(ax, 0, az)
    targetRef.current.copy(attractorPosRef.current)
  })

  return <WanderMarkers attractorPosRef={attractorPosRef} centerPosRef={centerRef} visible={showAttractor} />
}
