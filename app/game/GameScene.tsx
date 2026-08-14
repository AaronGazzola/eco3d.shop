'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ModelConfigRow } from '@/app/admin/_lib/types'
import { useSharedStore } from '@/app/admin/_lib/sharedStore'
import { GameCreature } from './GameCreature'
import { CreatureDressing } from './AnimatedModel'

export function GameScene({
  dressing,
  rootRef: externalRootRef,
}: {
  dressing: CreatureDressing
  rootRef?: React.RefObject<THREE.Group | null>
}) {
  const segments = useSharedStore((s) => s.segments)
  const groups = useSharedStore((s) => s.groups)
  const stlKey = useSharedStore((s) => s.stlKey)
  const configId = useSharedStore((s) => s.configId)
  const configName = useSharedStore((s) => s.configName)
  const modelRotation = useSharedStore((s) => s.modelRotation)
  const localRootRef = useRef<THREE.Group | null>(null)
  const rootRef = externalRootRef ?? localRootRef

  const modelConfig = useMemo<ModelConfigRow>(
    () => ({
      id: configId ?? 'game',
      stl_key: stlKey ?? '',
      name: configName || 'game',
      groups,
      model_rotation: modelRotation,
      created_at: new Date().toISOString(),
    }),
    [configId, stlKey, configName, groups, modelRotation],
  )

  if (groups.length === 0 || segments.length === 0) return null

  return (
    <group rotation={modelRotation}>
      <GameCreature
        modelConfig={modelConfig}
        segments={segments}
        dressing={dressing}
        rootRef={rootRef}
      />
    </group>
  )
}
