'use client'

import { useRef, useEffect, MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from './page.stores'
import { useEggPairs, useInitEggs } from './page.hooks'
import { useStlSegments } from './game/useStlSegments'
import { TargetController } from './game/TargetController'
import { FloorClickHandler } from './game/FloorClickHandler'
import { EggMesh } from './EggMesh'
import { HatchingDragon } from './HatchingDragon'
import { CREATURE_DEFAULTS, DRAGON_SCALE_FINAL, EMERGE_DURATION_MS } from './page.constants'

const SHAKE_DURATION_MS = 2000
const CRACK_DURATION_MS = 600

function PhaseDriver({ segmentsReady }: { segmentsReady: boolean }) {
  useFrame(() => {
    const state = useGameStore.getState()
    const { phase, hatchStartedAt, crackStartedAt, emergeStartedAt } = state
    const now = performance.now()

    if (phase === 'shaking' && hatchStartedAt !== null) {
      const elapsed = now - hatchStartedAt
      if (elapsed >= SHAKE_DURATION_MS && segmentsReady) {
        state.beginCracking()
      }
      return
    }
    if (phase === 'cracking' && crackStartedAt !== null) {
      const elapsed = now - crackStartedAt
      if (elapsed >= CRACK_DURATION_MS) {
        state.beginEmerging()
      }
      return
    }
    if (phase === 'emerging' && emergeStartedAt !== null) {
      const elapsed = now - emergeStartedAt
      if (elapsed >= EMERGE_DURATION_MS) {
        state.goLive()
      }
      return
    }
  })
  return null
}

function PreLiveTarget({
  spawnX,
  spawnZ,
  targetRef,
  userTargetGoalRef,
}: {
  spawnX: number
  spawnZ: number
  targetRef: MutableRefObject<THREE.Vector3>
  userTargetGoalRef: MutableRefObject<THREE.Vector3>
}) {
  useEffect(() => {
    targetRef.current.set(spawnX, 0, spawnZ)
    userTargetGoalRef.current.set(spawnX, 0, spawnZ)
  }, [spawnX, spawnZ, targetRef, userTargetGoalRef])

  useFrame(() => {
    const phase = useGameStore.getState().phase
    if (phase !== 'live') {
      targetRef.current.set(spawnX, 0, spawnZ)
    }
  })

  return null
}

function SceneContent() {
  useInitEggs()
  const phase = useGameStore((s) => s.phase)
  const eggs = useGameStore((s) => s.eggs)
  const selectedEggId = useGameStore((s) => s.selectedEggId)
  const dragon = useGameStore((s) => s.dragon)
  const selectEgg = useGameStore((s) => s.selectEgg)
  const { isLoading: eggsLoading } = useEggPairs()

  const targetRef = useRef(new THREE.Vector3(0, 0, 0))
  const userTargetGoalRef = useRef(new THREE.Vector3(0, 0, 0))

  const stlKeyForLoad =
    phase === 'shaking' || phase === 'cracking' || phase === 'emerging' || phase === 'live'
      ? dragon?.stl_key ?? null
      : null
  const { data: dragonSegments } = useStlSegments(stlKeyForLoad)
  const segmentsReady = !!dragonSegments && dragonSegments.length > 0

  const selectedEgg = eggs.find((e) => e.id === selectedEggId) ?? null
  const spawnX = selectedEgg?.x ?? 0
  const spawnZ = selectedEgg?.z ?? 0

  const showEggs =
    phase === 'choosing' ||
    phase === 'confirming' ||
    phase === 'shaking' ||
    phase === 'cracking'

  const showDragon =
    (phase === 'emerging' || phase === 'live') && dragon !== null && segmentsReady

  return (
    <>
      <Grid
        position={[0, 0.001, 0]}
        args={[100, 100]}
        cellSize={1}
        cellColor="#1a1a1a"
        sectionSize={5}
        sectionColor="#2e2e2e"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid
      />
      <FloorClickHandler
        userTargetGoalRef={userTargetGoalRef}
        scale={phase === 'live' ? DRAGON_SCALE_FINAL : 1}
        origin={{ x: spawnX, z: spawnZ }}
      />
      {phase === 'live' && (
        <TargetController
          targetRef={targetRef}
          userTargetGoalRef={userTargetGoalRef}
          config={CREATURE_DEFAULTS.lizard}
          showAttractor={false}
        />
      )}
      {phase !== 'live' && (
        <PreLiveTarget
          spawnX={spawnX}
          spawnZ={spawnZ}
          targetRef={targetRef}
          userTargetGoalRef={userTargetGoalRef}
        />
      )}
      {showEggs && !eggsLoading && eggs.map((egg, i) => (
        <EggMesh
          key={egg.id}
          id={egg.id}
          topKey={egg.topKey}
          bottomKey={egg.bottomKey}
          position={[egg.x, 0, egg.z]}
          bobPhase={i * 1.7}
          isSelected={selectedEggId === egg.id}
          dimmed={phase === 'confirming' && selectedEggId !== egg.id}
          onClick={() => phase === 'choosing' && selectEgg(egg.id)}
        />
      ))}
      {showDragon && dragon && dragonSegments && (
        <HatchingDragon
          modelConfig={dragon}
          segments={dragonSegments}
          spawnX={spawnX}
          spawnZ={spawnZ}
          targetRef={targetRef}
        />
      )}
      <PhaseDriver segmentsReady={segmentsReady} />
    </>
  )
}

export function HomeScene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 11], fov: 50 }}
      style={{ background: '#080808', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 12, 8]} intensity={1.1} />
      <directionalLight position={[-6, 6, -6]} intensity={0.4} color="#9ab" />
      <pointLight position={[0, 6, 4]} intensity={0.6} color="#ffe7c2" />
      <OrbitControls
        makeDefault
        enablePan={false}
        target={[0, 0.8, 0]}
        minDistance={6}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
      />
      <SceneContent />
    </Canvas>
  )
}
