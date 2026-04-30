'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { listEggPairsAction, listDragonConfigsAction } from './page.actions'
import { useGameStore } from './page.stores'
import { EggSlot } from './page.types'

const EGG_OFFSETS_X = [-3.2, 0, 3.2]
const EGG_Z = 0
const TARGET_HEIGHT = 1.6

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (copy.length > 0 && out.length < n) {
    const i = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}

export function useEggPairs() {
  return useQuery({
    queryKey: ['egg-pairs'],
    queryFn: listEggPairsAction,
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
  const { data: pairs } = useEggPairs()
  const { eggs, setEggs } = useGameStore()

  useEffect(() => {
    if (!pairs || eggs.length > 0) return
    const picks = pickRandom(pairs, 3)
    const slots: EggSlot[] = picks.map((p, i) => ({
      id: p.id,
      topKey: p.topKey,
      bottomKey: p.bottomKey,
      x: EGG_OFFSETS_X[i] ?? 0,
      z: EGG_Z,
    }))
    setEggs(slots)
  }, [pairs, eggs.length, setEggs])
}

async function fetchAndParseStl(key: string) {
  const r = await fetch(`/api/r2?key=${encodeURIComponent(key)}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buffer = await r.arrayBuffer()
  const loader = new STLLoader()
  const geometry = loader.parse(buffer)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

export function useEggGeometryPair(topKey: string | null, bottomKey: string | null) {
  return useQuery({
    queryKey: ['egg-geometry-pair', topKey, bottomKey],
    queryFn: async () => {
      const [top, bottom] = await Promise.all([
        fetchAndParseStl(topKey!),
        fetchAndParseStl(bottomKey!),
      ])

      top.computeBoundingBox()
      bottom.computeBoundingBox()
      const tbb = top.boundingBox!
      const bbb = bottom.boundingBox!
      const minY = Math.min(tbb.min.y, bbb.min.y)
      const maxY = Math.max(tbb.max.y, bbb.max.y)
      const sizeY = Math.max(maxY - minY, 0.0001)
      const scale = TARGET_HEIGHT / sizeY

      top.scale(scale, scale, scale)
      bottom.scale(scale, scale, scale)

      top.computeBoundingBox()
      bottom.computeBoundingBox()
      const tbb2 = top.boundingBox!
      const bbb2 = bottom.boundingBox!
      const minX = Math.min(tbb2.min.x, bbb2.min.x)
      const maxX = Math.max(tbb2.max.x, bbb2.max.x)
      const minY2 = Math.min(tbb2.min.y, bbb2.min.y)
      const minZ = Math.min(tbb2.min.z, bbb2.min.z)
      const maxZ = Math.max(tbb2.max.z, bbb2.max.z)
      const cx = (minX + maxX) / 2
      const cz = (minZ + maxZ) / 2
      const ty = -minY2

      top.translate(-cx, ty, -cz)
      bottom.translate(-cx, ty, -cz)

      top.computeVertexNormals()
      bottom.computeVertexNormals()

      top.computeBoundingBox()
      bottom.computeBoundingBox()
      const seamY = (top.boundingBox!.min.y + bottom.boundingBox!.max.y) / 2
      const hingeZ = bottom.boundingBox!.max.z

      return { top, bottom, seamY, hingeZ }
    },
    enabled: !!topKey && !!bottomKey,
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
