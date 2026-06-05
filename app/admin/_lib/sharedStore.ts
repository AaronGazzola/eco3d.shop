'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { SegmentData, BodyGroup, BodyGroupType, ModelConfigRow, NodeType, AngleCaps } from './types'

const PERSIST_DEBOUNCE_MS = 400

const debouncedLocalStorage: StateStorage = (() => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingKey: string | null = null
  let pendingValue: string | null = null
  const flush = () => {
    if (typeof window === 'undefined') return
    if (pendingKey !== null && pendingValue !== null) {
      try {
        window.localStorage.setItem(pendingKey, pendingValue)
      } catch (err) {
        console.error(err)
      }
    }
    pendingKey = null
    pendingValue = null
    timer = null
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush)
  }
  return {
    getItem: (name) => {
      if (typeof window === 'undefined') return null
      return window.localStorage.getItem(name)
    },
    setItem: (name, value) => {
      if (typeof window === 'undefined') return
      pendingKey = name
      pendingValue = value
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(flush, PERSIST_DEBOUNCE_MS)
    },
    removeItem: (name) => {
      if (typeof window === 'undefined') return
      pendingKey = null
      pendingValue = null
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      window.localStorage.removeItem(name)
    },
  }
})()

const SEGMENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#a855f7', '#22c55e', '#eab308',
]

interface SharedStore {
  stlKey: string | null
  configId: string | null
  configName: string
  segments: SegmentData[]
  groups: BodyGroup[]
  modelRotation: [number, number, number]

  setStlKey: (key: string) => void
  setConfigId: (id: string | null) => void
  setConfigName: (name: string) => void
  loadConfig: (config: ModelConfigRow) => void
  setSegments: (segments: SegmentData[]) => void
  restoreSegments: (segments: SegmentData[]) => void
  rotateModel: (axis: 'x' | 'y' | 'z', delta: number) => void
  createGroup: (name: string, type: BodyGroupType, pendingSegmentIds: string[], attachedToSpineId?: string) => void
  addToGroup: (id: string, pendingSegmentIds: string[]) => void
  deleteGroup: (id: string) => void
  reorderSpineGroups: (newOrderIds: string[]) => void
  setGroupAttachment: (groupId: string, spineGroupId: string) => void
  setGroupNode: (groupId: string, nodeType: NodeType, x: number, y: number, z: number) => void
  setGroupAngleCaps: (groupId: string, caps: AngleCaps) => void
  setGroupNodeWeight: (groupId: string, weight: number) => void
}

export const useSharedStore = create<SharedStore>()(
  persist(
    (set, get) => ({
      stlKey: null,
      configId: null,
      configName: '',
      segments: [],
      groups: [],
      modelRotation: [0, 0, 0],

      setStlKey: (key) => set({ stlKey: key }),

      setConfigId: (id) => set({ configId: id }),

      setConfigName: (name) => set({ configName: name }),

      loadConfig: (config) =>
        set({
          stlKey: config.stl_key,
          configId: config.id,
          configName: config.name,
          groups: config.groups,
          modelRotation: config.model_rotation,
        }),

      setSegments: (raw) =>
        set({
          segments: raw.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] })),
          groups: [],
          modelRotation: [0, 0, 0],
        }),

      restoreSegments: (raw) =>
        set({
          segments: raw.map((s, i) => ({ ...s, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] })),
        }),

      rotateModel: (axis, delta) =>
        set((state) => {
          const r = [...state.modelRotation] as [number, number, number]
          if (axis === 'x') r[0] += delta
          else if (axis === 'y') r[1] += delta
          else r[2] += delta
          return { modelRotation: r }
        }),

      createGroup: (name, type, pendingSegmentIds, attachedToSpineId) => {
        if (pendingSegmentIds.length === 0) return
        const { groups } = get()
        const color = SEGMENT_COLORS[groups.length % SEGMENT_COLORS.length]
        const newGroup: BodyGroup = {
          id: `group-${Date.now()}`,
          name,
          segmentIds: [...pendingSegmentIds],
          color,
          type,
          attachedToSpineId,
        }
        set({ groups: [...groups, newGroup] })
      },

      addToGroup: (id, pendingSegmentIds) =>
        set((state) => {
          if (pendingSegmentIds.length === 0) return state
          return {
            groups: state.groups.map((g) =>
              g.id === id
                ? { ...g, segmentIds: [...new Set([...g.segmentIds, ...pendingSegmentIds])] }
                : g
            ),
          }
        }),

      deleteGroup: (id) =>
        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

      reorderSpineGroups: (newOrderIds) =>
        set((state) => {
          const spineMap = new Map(state.groups.filter((g) => g.type === 'spine').map((g) => [g.id, g]))
          const nonSpine = state.groups.filter((g) => g.type !== 'spine')
          const reordered = newOrderIds.map((id) => spineMap.get(id)).filter(Boolean) as BodyGroup[]
          return { groups: [...nonSpine, ...reordered] }
        }),

      setGroupAttachment: (groupId, spineGroupId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, attachedToSpineId: spineGroupId } : g
          ),
        })),

      setGroupNode: (groupId, nodeType, x, y, z) =>
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g
            switch (nodeType) {
              case 'front': return { ...g, nodeFront: { x, y, z } }
              case 'back': return { ...g, nodeBack: { x, y, z } }
              case 'hipLeft': return { ...g, nodeHipLeft: { x, y, z } }
              case 'hipRight': return { ...g, nodeHipRight: { x, y, z } }
              case 'hip': return g
              case 'foot': return { ...g, nodeFoot: { x, y, z } }
            }
          }),
        })),

      setGroupAngleCaps: (groupId, caps) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, angleCaps: caps } : g)),
        })),

      setGroupNodeWeight: (groupId, weight) =>
        set((state) => {
          const target = state.groups.find((g) => g.id === groupId)
          const gangLegs = target?.type === 'leg-left' || target?.type === 'leg-right'
          return {
            groups: state.groups.map((g) => {
              if (gangLegs) {
                return g.type === 'leg-left' || g.type === 'leg-right'
                  ? { ...g, nodeWeight: weight }
                  : g
              }
              return g.id === groupId ? { ...g, nodeWeight: weight } : g
            }),
          }
        }),
    }),
    {
      name: 'studio-store',
      version: 5,
      storage: createJSONStorage(() => debouncedLocalStorage),
      partialize: (state) => ({
        stlKey: state.stlKey,
        configId: state.configId,
        configName: state.configName,
        groups: state.groups,
        modelRotation: state.modelRotation,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Record<string, unknown>
        if (version < 3) {
          delete state.animationConfig
          delete state.overlayToggles
          delete state.modelOpacity
          delete state.showAttractor
        }
        if (version < 4) {
          const groups = state.groups
          if (Array.isArray(groups)) {
            state.groups = groups.map((g: Record<string, unknown>) => {
              const next = { ...g }
              if ('angleCap' in next) delete next.angleCap
              return next
            })
          }
        }
        if (version < 5) {
          delete state.step
        }
        return state
      },
    }
  )
)
