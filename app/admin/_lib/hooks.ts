'use client'

import { createElement, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser-client'
import { CustomToast } from '@/components/CustomToast'
import { useAuthStore } from '@/app/layout.stores'
import { getCurrentProfileAction } from '@/app/layout.actions'
import {
  listR2FilesAction,
  getSignedUrlAction,
  saveModelConfigAction,
  listModelConfigsAction,
} from './actions'
import { ModelConfigRow, SegmentData } from './types'
import { useSharedStore } from './sharedStore'

export function useIsStudioAdmin() {
  const { user, profile, loading } = useAuthStore()
  return {
    loading,
    isAdmin: !!user && profile?.role === 'admin',
  }
}

export function useStudioLogin() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error(error)
        throw new Error('Invalid email or password')
      }
      return data
    },
    onSuccess: async () => {
      const profile = await getCurrentProfileAction()
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        await queryClient.invalidateQueries({ queryKey: ['auth'] })
        toast.custom(() =>
          createElement(CustomToast, {
            variant: 'error',
            title: 'Access denied',
            message: 'This account is not authorized to access the admin area.',
          }),
        )
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
    onError: (error) => {
      toast.custom(() =>
        createElement(CustomToast, {
          variant: 'error',
          title: 'Sign in failed',
          message: error.message,
        }),
      )
    },
  })
}

export function useR2Files() {
  return useQuery({
    queryKey: ['r2-files'],
    queryFn: listR2FilesAction,
  })
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

function runDetectSegmentsInWorker(positions: Float32Array): Promise<Float32Array[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../group/segmentDetector.worker.ts', import.meta.url))
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

export function useStlLoader() {
  const setSegments = useSharedStore((s) => s.setSegments)
  const restoreSegments = useSharedStore((s) => s.restoreSegments)
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

  return { loadStl, loading }
}

export function useSaveConfig() {
  const configId = useSharedStore((s) => s.configId)
  const stlKey = useSharedStore((s) => s.stlKey)
  const groups = useSharedStore((s) => s.groups)
  const modelRotation = useSharedStore((s) => s.modelRotation)
  const setConfigId = useSharedStore((s) => s.setConfigId)
  const setConfigName = useSharedStore((s) => s.setConfigName)
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
  const loadConfig = useSharedStore((s) => s.loadConfig)
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

export function useEnsureStlLoaded() {
  const { loadStl } = useStlLoader()
  const trigger = () => {
    const { stlKey, segments } = useSharedStore.getState()
    if (stlKey && segments.length === 0) loadStl(stlKey, true)
  }
  return trigger
}
