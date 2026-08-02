'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraController, StudioCanvas } from '../_lib/StudioCanvas'
import { useSharedStore } from '../_lib/sharedStore'
import { AnimatedDragon } from '@/app/game/AnimatedDragon'
import { axialChain } from '@/app/game/locomotion/network'
import { chainSegments } from '@/app/game/locomotion/swim'
import { useLocomotion } from '@/app/game/locomotion/useLocomotion'
import type { LocomotionStats } from '@/app/game/locomotion/useLocomotion'
import type { Cycle } from '@/app/game/animation.types'
import { useLocomotionStore } from './locomotionStore'

const EMPTY_CYCLE: Cycle = { keyframes: [], speed: 1, amplitude: 1 }

export interface LocomotionSnapshot {
  t: number
  drive: number
  speed: number
  totalLagRad: number
  joints: { id: string; bendRad: number }[]
  nodes: { id: string; x: number; y: number; z: number }[]
}

declare global {
  interface Window {
    __loco?: LocomotionSnapshot
  }
}

function SceneContent() {
  const groups = useSharedStore((s) => s.groups)
  const segments = useSharedStore((s) => s.segments)
  const modelRotation = useSharedStore((s) => s.modelRotation)

  const drive = useLocomotionStore((s) => s.drive)
  const bendGain = useLocomotionStore((s) => s.bendGain)
  const thrustGain = useLocomotionStore((s) => s.thrustGain)
  const drag = useLocomotionStore((s) => s.drag)
  const running = useLocomotionStore((s) => s.running)

  const { poseSource, getStats, getPose, reset } = useLocomotion({
    groups,
    drive,
    bendGain,
    thrustGain,
    drag,
    running,
  })

  const elapsed = useRef(0)

  useEffect(() => {
    reset()
    elapsed.current = 0
  }, [groups, reset])

  useFrame((_, delta) => {
    if (typeof window === 'undefined') return
    if (running) elapsed.current += delta
    const stats: LocomotionStats = getStats()
    const chain = axialChain(groups)
    const pose = getPose()
    const segments = chainSegments(groups, pose)
    window.__loco = {
      t: elapsed.current,
      drive,
      speed: stats.speed,
      totalLagRad: stats.totalLagRad,
      joints: chain.map((g, i) => ({ id: g.id, bendRad: stats.bends[i] ?? 0 })),
      nodes: segments.map((s) => ({
        id: s.id,
        x: s.midX + pose.root.x,
        y: 0,
        z: s.midZ + pose.root.z,
      })),
    }
  })

  return (
    <group rotation={modelRotation}>
      <AnimatedDragon
        groups={groups}
        segments={segments}
        cycle={EMPTY_CYCLE}
        poseSource={poseSource}
      />
    </group>
  )
}

export function LocomotionScene() {
  const cameraPreset = useLocomotionStore((s) => s.cameraPreset)
  const setCameraPreset = useLocomotionStore((s) => s.setCameraPreset)

  return (
    <StudioCanvas>
      <SceneContent />
      <CameraController preset={cameraPreset} onConsumed={() => setCameraPreset(null)} />
    </StudioCanvas>
  )
}
