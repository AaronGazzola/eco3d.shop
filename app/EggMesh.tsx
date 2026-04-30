'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useEggGeometryPair } from './page.hooks'
import { useGameStore } from './page.stores'

interface Props {
  id: string
  topKey: string
  bottomKey: string
  position: [number, number, number]
  bobPhase: number
  isSelected: boolean
  dimmed: boolean
  onClick: () => void
}

const SHAKE_DURATION_MS = 2000
const CRACK_DURATION_MS = 600

export function EggMesh({
  id,
  topKey,
  bottomKey,
  position,
  bobPhase,
  isSelected,
  dimmed,
  onClick,
}: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const topPivotRef = useRef<THREE.Group>(null)
  const bottomPivotRef = useRef<THREE.Group>(null)
  const topMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const bottomMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const { data: pair } = useEggGeometryPair(topKey, bottomKey)

  const baseColor = useMemo(() => {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
    const hue = ((h % 360) + 360) % 360
    return new THREE.Color().setHSL(hue / 360, 0.4, 0.62)
  }, [id])

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    const t = clock.getElapsedTime()
    const baseX = position[0]
    const baseY = position[1]
    const baseZ = position[2]

    const state = useGameStore.getState()
    const phase = state.phase
    const isThis = isSelected
    const hatchStartedAt = state.hatchStartedAt
    const crackStartedAt = state.crackStartedAt

    if (!isThis && (phase === 'shaking' || phase === 'cracking' || phase === 'emerging' || phase === 'live')) {
      g.visible = false
      return
    }
    if (isThis && (phase === 'emerging' || phase === 'live')) {
      g.visible = false
      return
    }
    g.visible = true

    const topPivot = topPivotRef.current
    const bottomPivot = bottomPivotRef.current

    if ((phase === 'choosing' || phase === 'confirming') || !isThis) {
      const bob = Math.sin(t * 1.4 + bobPhase) * 0.06
      const wob = Math.sin(t * 0.9 + bobPhase) * 0.04
      const lift = hovered ? 0.18 : 0
      g.position.set(baseX, baseY + bob + lift, baseZ)
      g.rotation.set(wob, t * 0.15 + bobPhase, wob * 0.6)
      const target = hovered ? 1.08 : isSelected ? 1.12 : 1
      g.scale.lerp(new THREE.Vector3(target, target, target), 0.15)
      if (topPivot) {
        topPivot.position.set(0, 0, 0)
        topPivot.rotation.set(0, 0, 0)
      }
      if (bottomPivot) {
        bottomPivot.position.set(0, 0, 0)
      }
      const opacity = dimmed ? 0.35 : 1
      const emissive = isSelected ? 0.25 : 0
      if (topMatRef.current) {
        topMatRef.current.opacity = opacity
        topMatRef.current.transparent = dimmed
        topMatRef.current.emissiveIntensity = emissive
      }
      if (bottomMatRef.current) {
        bottomMatRef.current.opacity = opacity
        bottomMatRef.current.transparent = dimmed
        bottomMatRef.current.emissiveIntensity = emissive
      }
      return
    }

    if (phase === 'shaking' && hatchStartedAt !== null) {
      const elapsed = performance.now() - hatchStartedAt
      const intensity = Math.min(elapsed / SHAKE_DURATION_MS, 1)
      const freq = 18 + intensity * 22
      const amp = 0.05 + intensity * 0.18
      const sx = Math.sin(t * freq) * amp
      const sz = Math.cos(t * freq * 1.3) * amp
      const lift = intensity * intensity * 2.2 + Math.abs(Math.sin(t * freq * 0.5)) * 0.05
      g.position.set(
        baseX + Math.sin(t * freq * 1.1) * intensity * 0.06,
        baseY + lift,
        baseZ + Math.cos(t * freq * 0.9) * intensity * 0.06
      )
      g.rotation.set(sx, t * 0.6, sz)
      const s = 1 + intensity * 0.08
      g.scale.set(s, s, s)
      if (topPivot) {
        topPivot.position.set(0, 0, 0)
        topPivot.rotation.set(0, 0, 0)
      }
      if (bottomPivot) {
        bottomPivot.position.set(0, 0, 0)
      }
      const emissive = 0.35 + intensity * 0.5
      if (topMatRef.current) {
        topMatRef.current.transparent = false
        topMatRef.current.opacity = 1
        topMatRef.current.emissiveIntensity = emissive
      }
      if (bottomMatRef.current) {
        bottomMatRef.current.transparent = false
        bottomMatRef.current.opacity = 1
        bottomMatRef.current.emissiveIntensity = emissive
      }
      return
    }

    if (phase === 'cracking' && crackStartedAt !== null) {
      const elapsed = performance.now() - crackStartedAt
      const p = Math.min(Math.max(elapsed / CRACK_DURATION_MS, 0), 1)
      const ease = 1 - Math.pow(1 - p, 3)
      g.position.set(baseX, baseY + 2.2, baseZ)
      g.rotation.set(0, 0, 0)
      g.scale.set(1, 1, 1)
      if (topPivot) {
        topPivot.rotation.set(0, 0, 0)
        topPivot.position.set(0, ease * 1.4, 0)
      }
      if (bottomPivot) {
        bottomPivot.position.set(0, -ease * 0.6, 0)
      }
      const opacity = Math.max(1 - ease * 0.9, 0.1)
      if (topMatRef.current) {
        topMatRef.current.transparent = true
        topMatRef.current.opacity = opacity
        topMatRef.current.emissiveIntensity = 0.4
      }
      if (bottomMatRef.current) {
        bottomMatRef.current.transparent = true
        bottomMatRef.current.opacity = opacity
        bottomMatRef.current.emissiveIntensity = 0.4
      }
      return
    }
  })

  if (!pair) {
    return (
      <group ref={groupRef} position={position}>
        <mesh
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            onClick()
          }}
        >
          <sphereGeometry args={[0.55, 24, 18]} />
          <meshStandardMaterial color={baseColor} roughness={0.45} metalness={0.05} transparent opacity={0.4} />
        </mesh>
      </group>
    )
  }

  const { top, bottom, seamY, hingeZ } = pair

  return (
    <group ref={groupRef} position={position}>
      <group ref={bottomPivotRef}>
        <mesh
          geometry={bottom}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            onClick()
          }}
        >
          <meshStandardMaterial
            ref={bottomMatRef}
            color={baseColor}
            roughness={0.45}
            metalness={0.08}
            emissive={baseColor}
            emissiveIntensity={0}
          />
        </mesh>
      </group>
      <group position={[0, seamY, hingeZ]}>
        <group ref={topPivotRef}>
          <mesh
            geometry={top}
            position={[0, -seamY, -hingeZ]}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              setHovered(true)
            }}
            onPointerOut={() => setHovered(false)}
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              onClick()
            }}
          >
            <meshStandardMaterial
              ref={topMatRef}
              color={baseColor}
              roughness={0.45}
              metalness={0.08}
              emissive={baseColor}
              emissiveIntensity={0}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
