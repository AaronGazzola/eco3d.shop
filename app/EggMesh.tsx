'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useEggGeometry } from './page.hooks'
import { useGameStore } from './page.stores'

interface Props {
  stlKey: string
  position: [number, number, number]
  bobPhase: number
  isSelected: boolean
  dimmed: boolean
  onClick: () => void
}

const SHAKE_DURATION_MS = 2000
const CRACK_DURATION_MS = 600

export function EggMesh({
  stlKey,
  position,
  bobPhase,
  isSelected,
  dimmed,
  onClick,
}: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const { data: geometry } = useEggGeometry(stlKey)

  const baseColor = useMemo(() => {
    let h = 0
    for (let i = 0; i < stlKey.length; i++) h = (h * 31 + stlKey.charCodeAt(i)) | 0
    const hue = ((h % 360) + 360) % 360
    return new THREE.Color().setHSL(hue / 360, 0.4, 0.62)
  }, [stlKey])

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

    if ((phase === 'choosing' || phase === 'confirming') || !isThis) {
      const bob = Math.sin(t * 1.4 + bobPhase) * 0.06
      const wob = Math.sin(t * 0.9 + bobPhase) * 0.04
      const lift = hovered ? 0.18 : 0
      g.position.set(baseX, baseY + bob + lift, baseZ)
      g.rotation.set(wob, t * 0.15 + bobPhase, wob * 0.6)
      const target = hovered ? 1.08 : isSelected ? 1.12 : 1
      g.scale.lerp(new THREE.Vector3(target, target, target), 0.15)
      if (matRef.current) {
        matRef.current.opacity = dimmed ? 0.35 : 1
        matRef.current.transparent = dimmed
        matRef.current.emissiveIntensity = isSelected ? 0.25 : 0
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
      const lift = intensity * 0.15
      g.position.set(
        baseX + Math.sin(t * freq * 1.1) * intensity * 0.06,
        baseY + lift + Math.abs(Math.sin(t * freq * 0.5)) * 0.05,
        baseZ + Math.cos(t * freq * 0.9) * intensity * 0.06
      )
      g.rotation.set(sx, t * 0.6, sz)
      const s = 1 + intensity * 0.08
      g.scale.set(s, s, s)
      if (matRef.current) {
        matRef.current.transparent = false
        matRef.current.opacity = 1
        matRef.current.emissiveIntensity = 0.35 + intensity * 0.5
      }
      return
    }

    if (phase === 'cracking' && crackStartedAt !== null) {
      const elapsed = performance.now() - crackStartedAt
      const p = Math.min(Math.max(elapsed / CRACK_DURATION_MS, 0), 1)
      const ease = 1 - Math.pow(1 - p, 3)
      const scale = Math.max(1 - ease * 1.05, 0)
      g.position.set(baseX, baseY + ease * 0.35, baseZ)
      g.rotation.set(p * 4, p * 12, p * 4)
      g.scale.set(scale, scale, scale)
      if (matRef.current) {
        matRef.current.transparent = true
        matRef.current.opacity = Math.max(1 - ease * 1.2, 0)
      }
      return
    }
  })

  if (!geometry) {
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

  return (
    <group ref={groupRef} position={position}>
      <mesh
        geometry={geometry}
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
          ref={matRef}
          color={baseColor}
          roughness={0.45}
          metalness={0.08}
          emissive={baseColor}
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  )
}
