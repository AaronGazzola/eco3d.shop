'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { listR2FilesAction, getSignedUrlAction, saveModelConfigAction, listModelConfigsAction } from './page.actions'
import { ModelConfigRow } from './page.types'
import { useStudioStore } from './page.stores'
import { SegmentData } from './page.types'

export function useR2Files() {
  return useQuery({
    queryKey: ['r2-files'],
    queryFn: listR2FilesAction,
  })
}

export function useStlLoader() {
  const { setSegments, restoreSegments } = useStudioStore()
  const [loading, setLoading] = useState(false)

  async function loadStl(key: string, keepGroups = false) {
    setLoading(true)
    try {
      const r = await fetch(`/api/r2?key=${encodeURIComponent(key)}`)
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

      const componentArrays = await runDetectSegmentsInWorker(positions)

      const segments: SegmentData[] = componentArrays.map((arr, i) => ({
        id: `seg-${i}`,
        positions: arr,
        color: '#ffffff',
      }))
      if (keepGroups) restoreSegments(segments)
      else setSegments(segments)
    } catch (err) {
      console.error('STL load failed', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  function runDetectSegmentsInWorker(positions: Float32Array): Promise<Float32Array[]> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./segmentDetector.worker.ts', import.meta.url))
      const copy = positions.slice()
      worker.onmessage = (e: MessageEvent<{ arrays: ArrayBuffer[] }>) => {
        worker.terminate()
        resolve(e.data.arrays.map((b) => new Float32Array(b)))
      }
      worker.onerror = (err) => {
        worker.terminate()
        reject(err)
      }
      worker.postMessage({ positions: copy.buffer }, [copy.buffer])
    })
  }

  return { loadStl, loading }
}

export function useSignedUrl(key: string | null) {
  return useQuery({
    queryKey: ['signed-url', key],
    queryFn: () => getSignedUrlAction(key!),
    enabled: !!key,
  })
}

export function useModelConfigs() {
  return useQuery({
    queryKey: ['model-configs'],
    queryFn: listModelConfigsAction,
  })
}

export function useSaveConfig() {
  const { configId, configName, stlKey, groups, modelRotation, setConfigId, setConfigName } = useStudioStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) =>
      saveModelConfigAction({
        id: configId,
        stlKey: stlKey!,
        name,
        groups,
        modelRotation,
      }),
    onSuccess: (saved) => {
      setConfigId(saved.id)
      setConfigName(saved.name)
      queryClient.invalidateQueries({ queryKey: ['model-configs'] })
    },
    onError: (err) => console.error(err),
  })
}

export function useLoadConfig() {
  const { loadConfig } = useStudioStore()
  const { loadStl } = useStlLoader()
  const [loading, setLoading] = useState(false)

  async function loadFromConfig(config: ModelConfigRow) {
    setLoading(true)
    try {
      loadConfig(config)
      await loadStl(config.stl_key, true)
    } finally {
      setLoading(false)
    }
  }

  return { loadFromConfig, loading }
}
