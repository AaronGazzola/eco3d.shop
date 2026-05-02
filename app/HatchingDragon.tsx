'use client'

import { useRef, useMemo, useEffect, MutableRefObject } from 'react'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData } from './studio/page.types'
import { CreatureConfig } from './page.types'
import { AnimatedModel } from './game/AnimatedModel'
import { Director } from './game/useCreature'
import { modelConfigToCreatureConfig } from './game/modelConfigToCreatureConfig'
import { useGameStore } from './page.stores'
import { DRAGON_SCALE_FINAL } from './page.constants'
import { HATCH_TO_WANDER_BLEND_MS } from './game/animations/dragon/constants'

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
  const directorRef = useRef<Director | null>(null)
  const phase = useGameStore((s) => s.phase)

  const creatureConfig: CreatureConfig = useMemo(() => {
    const base = modelConfigToCreatureConfig(modelConfig, segments)
    return {
      ...base,
      chainOrigin: { x: spawnX, z: spawnZ },
    }
  }, [modelConfig, segments, spawnX, spawnZ])

  useEffect(() => {
    const director = directorRef.current
    if (!director) return
    if (phase === 'emerging') {
      director.setBehavior('hatching', { blendMs: 0 })
    } else if (phase === 'live') {
      director.setBehavior('wandering', { blendMs: HATCH_TO_WANDER_BLEND_MS })
    }
  }, [phase])

  if (segments.length === 0) return null

  const visible = phase === 'emerging' || phase === 'live'
  const scale = DRAGON_SCALE_FINAL

  return (
    <group
      ref={groupRef}
      visible={visible}
      scale={[scale, scale, scale]}
      position={[spawnX * (1 - scale), 0, spawnZ * (1 - scale)]}
    >
      <AnimatedModel
        creatureConfig={creatureConfig}
        modelConfig={modelConfig}
        segments={segments}
        targetRef={targetRef}
        initialBehavior="hatching"
        directorRef={directorRef}
      />
    </group>
  )
}
