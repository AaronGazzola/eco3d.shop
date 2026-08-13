'use client'

import { RefObject } from 'react'
import * as THREE from 'three'
import { ModelConfigRow, SegmentData } from '../admin/_lib/types'
import { AnimatedModel, CreatureDressing } from './AnimatedModel'

export function GameCreature({
  modelConfig,
  segments,
  dressing,
  rootRef,
}: {
  modelConfig: ModelConfigRow
  segments: SegmentData[]
  dressing: CreatureDressing
  rootRef?: RefObject<THREE.Group | null>
}) {
  return (
    <AnimatedModel
      modelConfig={modelConfig}
      segments={segments}
      dressing={dressing}
      rootRef={rootRef}
    />
  )
}
