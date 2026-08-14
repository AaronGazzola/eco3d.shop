'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSharedStore } from '@/app/admin/_lib/sharedStore'
import { useLoadRig } from '@/app/admin/_lib/hooks'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { applyPreset } from '@/app/admin/animate/simPresets'
import { resolveMotion } from './motion/resolve'
import { createWorld, World } from './core/world'
import { WorldState } from './core/types'
import { DrivableHost } from './hosts'
import { paintSegments } from './palette'
import { CreatureDressing } from './AnimatedModel'

const TICK_MS = 1000

export function useGameSession(host: DrivableHost | null) {
  const worldRef = useRef<World | null>(null)
  const [snapshot, setSnapshot] = useState<WorldState | null>(null)
  const [failed, setFailed] = useState(false)
  const { loadFromRigId } = useLoadRig()
  const groups = useSharedStore((s) => s.groups)
  const segments = useSharedStore((s) => s.segments)
  const appliedMotion = useRef<string | null>(null)
  const started = useRef(false)

  if (host && !worldRef.current) worldRef.current = createWorld(host)

  useEffect(() => {
    if (!host) return
    loadFromRigId(host.getSave().rigId).catch((err) => {
      console.error('game: rig load failed', err)
      setFailed(true)
    })
    // The loader is recreated on every render; running this once per host is the whole intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host])

  const ready = groups.length > 0 && segments.length > 0

  useEffect(() => {
    if (!ready || started.current) return
    useAnimateStore.getState().setCoupledRunning(true)
    started.current = true
  }, [ready])

  useEffect(() => {
    const world = worldRef.current
    if (!world || !ready) return
    const id = setInterval(() => {
      world.tick(TICK_MS / 1000)
      setSnapshot({ ...world.state() })
    }, TICK_MS)
    setSnapshot({ ...world.state() })
    return () => clearInterval(id)
  }, [ready])

  useEffect(() => {
    if (!ready || !snapshot) return
    const requested = snapshot.creature.motion
    if (appliedMotion.current === requested) return
    const resolved = resolveMotion(requested)
    applyPreset(resolved.preset)
    appliedMotion.current = requested
  }, [ready, snapshot])

  const dressing = useMemo<CreatureDressing | null>(() => {
    if (segments.length === 0) return null
    return { segmentColors: paintSegments(segments.map((s) => s.id)) }
  }, [segments])

  return { ready, failed, dressing, snapshot, world: worldRef.current }
}
