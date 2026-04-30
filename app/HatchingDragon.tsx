'use client'

import { useRef, useMemo, MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData } from './studio/page.types'
import { CreatureConfig } from './page.types'
import { AnimatedModel } from './game/AnimatedModel'
import { modelConfigToCreatureConfig } from './game/modelConfigToCreatureConfig'
import { useGameStore } from './page.stores'

const EMERGE_DURATION_MS = 1000

interface Props {
  modelConfig: ModelConfigRow
  segments: SegmentData[]
  spawnX: number
  spawnZ: number
  targetRef: MutableRefObject<THREE.Vector3>
}

export function HatchingDragon({
  modelConfig,
  segments,
  spawnX,
  spawnZ,
  targetRef,
}: Props) {
  const groupRef = useRef<THREE.Group>(null)

  const creatureConfig: CreatureConfig = useMemo(() => {
    const base = modelConfigToCreatureConfig(modelConfig, segments)
    return {
      ...base,
      chainOrigin: { x: spawnX, z: spawnZ },
    }
  }, [modelConfig, segments, spawnX, spawnZ])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const { phase, emergeStartedAt } = useGameStore.getState()

    if (phase === 'shaking' || phase === 'cracking') {
      g.visible = false
      return
    }
    if (phase === 'emerging' && emergeStartedAt !== null) {
      g.visible = true
      const elapsed = performance.now() - emergeStartedAt
      const p = Math.min(Math.max(elapsed / EMERGE_DURATION_MS, 0), 1)
      const ease = 1 - Math.pow(1 - p, 3)
      const startY = -1.4
      g.position.y = startY + (0 - startY) * ease
      const scale = 0.25 + (1 - 0.25) * ease
      g.scale.set(scale, scale, scale)
      return
    }
    if (phase === 'live') {
      g.visible = true
      g.position.y = 0
      g.scale.set(1, 1, 1)
      return
    }
    g.visible = false
  })

  if (segments.length === 0) return null

  return (
    <group ref={groupRef} visible={false}>
      <AnimatedModel
        creatureConfig={creatureConfig}
        modelConfig={modelConfig}
        segments={segments}
        targetRef={targetRef}
      />
    </group>
  )
}
