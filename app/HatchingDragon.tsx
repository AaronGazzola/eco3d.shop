'use client'

import { useRef, useMemo, MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData } from './studio/page.types'
import { CreatureConfig } from './page.types'
import { AnimatedModel } from './game/AnimatedModel'
import { modelConfigToCreatureConfig } from './game/modelConfigToCreatureConfig'
import { useGameStore } from './page.stores'
import { DRAGON_SCALE_INITIAL, DRAGON_SCALE_FINAL, EMERGE_DURATION_MS } from './page.constants'

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

    let scale = DRAGON_SCALE_FINAL
    if (phase === 'emerging' && emergeStartedAt !== null) {
      const elapsed = performance.now() - emergeStartedAt
      const p = Math.min(Math.max(elapsed / EMERGE_DURATION_MS, 0), 1)
      const ease = 1 - Math.pow(1 - p, 3)
      scale = DRAGON_SCALE_INITIAL + (DRAGON_SCALE_FINAL - DRAGON_SCALE_INITIAL) * ease
    } else if (phase !== 'live') {
      g.visible = false
      return
    }

    g.visible = true
    g.scale.set(scale, scale, scale)
    g.position.set(spawnX * (1 - scale), 0, spawnZ * (1 - scale))
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
