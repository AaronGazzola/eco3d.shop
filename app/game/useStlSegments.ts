'use client'

import { useQuery } from '@tanstack/react-query'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { SegmentData } from '../studio/page.types'

async function fetchAndSegment(stlKey: string): Promise<SegmentData[]> {
  const r = await fetch(`/api/r2?key=${encodeURIComponent(stlKey)}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buffer = await r.arrayBuffer()

  const loader = new STLLoader()
  const geometry = loader.parse(buffer)
  geometry.rotateX(-Math.PI / 2)
  geometry.scale(0.1, 0.1, 0.1)
  geometry.computeBoundingBox()
  const minY = geometry.boundingBox!.min.y
  geometry.translate(0, -minY, 0)
  const positions = geometry.attributes.position.array as Float32Array

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../studio/segmentDetector.worker.ts', import.meta.url))
    const copy = positions.slice()
    worker.onmessage = (e: MessageEvent<{ arrays: ArrayBuffer[] }>) => {
      worker.terminate()
      resolve(e.data.arrays.map((b, i) => ({
        id: `seg-${i}`,
        positions: new Float32Array(b),
        color: '#ffffff',
      })))
    }
    worker.onerror = (err) => { worker.terminate(); reject(err) }
    worker.postMessage({ positions: copy.buffer }, [copy.buffer])
  })
}

export function useStlSegments(stlKey: string | null) {
  return useQuery({
    queryKey: ['stl-segments', stlKey],
    queryFn: () => fetchAndSegment(stlKey!),
    enabled: !!stlKey,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
