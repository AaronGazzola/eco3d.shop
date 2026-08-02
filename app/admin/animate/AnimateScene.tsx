'use client'

import { useCallback, useMemo, useRef } from 'react'
import { StudioCanvas, CameraController } from '../_lib/StudioCanvas'
import { useSharedStore } from '../_lib/sharedStore'
import { AnimatedDragon } from '@/app/game/AnimatedDragon'
import type { Cycle } from '@/app/game/animation.types'
import { useAnimateStore } from './animateStore'

const EMPTY_CYCLE: Cycle = { keyframes: [], speed: 1, amplitude: 1 }

function SceneContent() {
  const groups = useSharedStore((s) => s.groups)
  const segments = useSharedStore((s) => s.segments)
  const modelRotation = useSharedStore((s) => s.modelRotation)

  const cycles = useAnimateStore((s) => s.cycles)
  const selectedCycle = useAnimateStore((s) => s.selectedCycle)
  const playing = useAnimateStore((s) => s.playing)
  const scrubPhase = useAnimateStore((s) => s.scrubPhase)
  const setScrubPhase = useAnimateStore((s) => s.setScrubPhase)

  const cycle = useMemo(() => cycles[selectedCycle] ?? EMPTY_CYCLE, [cycles, selectedCycle])

  const lastReported = useRef(0)

  const handlePhase = useCallback(
    (phase: number) => {
      if (Math.abs(phase - lastReported.current) < 0.1) return
      lastReported.current = phase
      setScrubPhase(phase)
    },
    [setScrubPhase],
  )

  return (
    <group rotation={modelRotation}>
      <AnimatedDragon
        groups={groups}
        segments={segments}
        cycle={cycle}
        playing={playing}
        phase={playing ? undefined : scrubPhase}
        onPhase={handlePhase}
      />
    </group>
  )
}

export function AnimateScene() {
  const cameraPreset = useAnimateStore((s) => s.cameraPreset)
  const setCameraPreset = useAnimateStore((s) => s.setCameraPreset)

  return (
    <StudioCanvas>
      <SceneContent />
      <CameraController preset={cameraPreset} onConsumed={() => setCameraPreset(null)} />
    </StudioCanvas>
  )
}
