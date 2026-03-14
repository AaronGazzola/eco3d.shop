'use client'

import { useRef, useMemo, MutableRefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { ModelConfigRow, SegmentData } from '../studio/page.types'
import { SkeletonRenderer } from './SkeletonRenderer'
import { TargetController } from './TargetController'
import { FloorClickHandler } from './FloorClickHandler'
import { AnimatedModel } from './AnimatedModel'
import { useStlSegments } from './useStlSegments'
import { modelConfigToCreatureConfig } from './modelConfigToCreatureConfig'

interface Props {
  config: CreatureConfig
  showAttractor: boolean
  selectedConfig: ModelConfigRow | null
}

function SceneContent({
  config,
  showAttractor,
  targetRef,
  selectedConfig,
  segments,
}: {
  config: CreatureConfig
  showAttractor: boolean
  targetRef: MutableRefObject<THREE.Vector3>
  selectedConfig: ModelConfigRow | null
  segments: SegmentData[]
}) {
  const userTargetGoalRef = useRef(new THREE.Vector3())
  const headPosRef = useRef(new THREE.Vector3())

  return (
    <>
      <TargetController
        targetRef={targetRef}
        userTargetGoalRef={userTargetGoalRef}
        config={config}
        showAttractor={showAttractor}
      />
      <FloorClickHandler userTargetGoalRef={userTargetGoalRef} />
      <Grid
        position={[0, 0.001, 0]}
        args={[100, 100]}
        cellSize={1}
        cellColor="#1e1e1e"
        sectionSize={5}
        sectionColor="#2e2e2e"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid
      />
      {selectedConfig && segments.length > 0 ? (
        <AnimatedModel
          creatureConfig={config}
          modelConfig={selectedConfig}
          segments={segments}
          targetRef={targetRef}
        />
      ) : (
        <SkeletonRenderer config={config} targetRef={targetRef} headPosRef={headPosRef} />
      )}
    </>
  )
}

function SkeletonSceneInner({ config, showAttractor, selectedConfig }: Props) {
  const targetRef = useRef(new THREE.Vector3(0, 0, 0))
  const { data: segments } = useStlSegments(selectedConfig?.stl_key ?? null)

  const activeConfig = useMemo(() => {
    if (!selectedConfig) return config
    return modelConfigToCreatureConfig(selectedConfig, segments ?? [])
  }, [selectedConfig, segments, config])

  return (
    <Canvas
      camera={{ position: [0, 8, 16], fov: 50 }}
      style={{ background: '#080808', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 12, 8]} intensity={1.0} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.3} color="#ffffff" />
      <OrbitControls
        makeDefault
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
      <SceneContent
        config={activeConfig}
        showAttractor={showAttractor}
        targetRef={targetRef}
        selectedConfig={selectedConfig}
        segments={segments ?? []}
      />
    </Canvas>
  )
}

export function SkeletonScene(props: Props) {
  return <SkeletonSceneInner {...props} />
}
