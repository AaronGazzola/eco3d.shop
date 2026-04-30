'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { listEggKeysAction, listDragonConfigsAction } from './page.actions'
import { useGameStore } from './page.stores'
import { EggSlot } from './page.types'

const EGG_OFFSETS_X = [-3.2, 0, 3.2]
const EGG_Z = 0

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (copy.length > 0 && out.length < n) {
    const i = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}

export function useEggKeys() {
  return useQuery({
    queryKey: ['egg-keys'],
    queryFn: listEggKeysAction,
    staleTime: Infinity,
  })
}

export function useDragonConfigs() {
  return useQuery({
    queryKey: ['dragon-configs'],
    queryFn: listDragonConfigsAction,
    staleTime: Infinity,
  })
}

export function useInitEggs() {
  const { data: eggKeys } = useEggKeys()
  const { eggs, setEggs } = useGameStore()

  useEffect(() => {
    if (!eggKeys || eggs.length > 0) return
    const picks = pickRandom(eggKeys, 3)
    const slots: EggSlot[] = picks.map((key, i) => ({
      key,
      x: EGG_OFFSETS_X[i] ?? 0,
      z: EGG_Z,
    }))
    setEggs(slots)
  }, [eggKeys, eggs.length, setEggs])
}

export function useEggGeometry(key: string | null) {
  return useQuery({
    queryKey: ['egg-geometry', key],
    queryFn: async () => {
      const r = await fetch(`/api/r2?key=${encodeURIComponent(key!)}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buffer = await r.arrayBuffer()
      const loader = new STLLoader()
      const geometry = loader.parse(buffer)
      geometry.rotateX(-Math.PI / 2)
      geometry.computeBoundingBox()
      const bb = geometry.boundingBox!
      const sizeY = bb.max.y - bb.min.y
      const targetHeight = 1.6
      const scale = targetHeight / Math.max(sizeY, 0.0001)
      geometry.scale(scale, scale, scale)
      geometry.computeBoundingBox()
      const minY = geometry.boundingBox!.min.y
      const cx = (geometry.boundingBox!.min.x + geometry.boundingBox!.max.x) / 2
      const cz = (geometry.boundingBox!.min.z + geometry.boundingBox!.max.z) / 2
      geometry.translate(-cx, -minY, -cz)
      geometry.computeVertexNormals()
      return geometry
    },
    enabled: !!key,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useHatchDragon() {
  const { data: dragons } = useDragonConfigs()
  const phase = useGameStore((s) => s.phase)
  const beginHatching = useGameStore((s) => s.beginHatching)

  function start() {
    if (!dragons || dragons.length === 0 || phase !== 'confirming') return
    const picked = dragons[Math.floor(Math.random() * dragons.length)]
    beginHatching(picked)
  }

  return { start, ready: !!dragons && dragons.length > 0 }
}
