'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useR2Files, useStlLoader, useDragonRigs, useLoadRig, useVariants } from '../_lib/hooks'
import { useSharedStore } from '../_lib/sharedStore'
import { R2FileNode, DragonRigRow } from '../_lib/types'
import type { DragonStage } from '@/app/game/dragons.types'

const DRAGON_STAGES: DragonStage[] = ['egg', 'baby', 'adult', 'winged']

function FileNode({
  node,
  depth,
  onSelect,
  selectedKey,
  disabled,
}: {
  node: R2FileNode
  depth: number
  onSelect: (key: string) => void
  selectedKey: string | null
  disabled: boolean
}) {
  const [open, setOpen] = useState(depth === 0)
  const isStl = !node.isFolder && node.name.toLowerCase().endsWith('.stl')

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <span className="text-white/30">{open ? '▾' : '▸'}</span>
          <span>{node.name}</span>
        </button>
        {open && node.children?.map((child) => (
          <FileNode
            key={child.key}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedKey={selectedKey}
            disabled={disabled}
          />
        ))}
      </div>
    )
  }

  if (!isStl) return null

  return (
    <button
      onClick={() => onSelect(node.key)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 w-full text-left px-2 py-1.5 text-xs rounded transition-colors',
        selectedKey === node.key
          ? 'bg-violet-600/30 text-violet-300'
          : 'text-white/60 hover:bg-white/8 hover:text-white/90',
        disabled && 'opacity-40 pointer-events-none'
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <span className="text-white/30">◆</span>
      <span>{node.name}</span>
    </button>
  )
}

function RigRow({
  rig,
  onSelect,
  loading,
}: {
  rig: DragonRigRow
  onSelect: (rig: DragonRigRow) => void
  loading: boolean
}) {
  const filename = rig.stl_key.split('/').pop() ?? rig.stl_key
  return (
    <button
      onClick={() => onSelect(rig)}
      disabled={loading}
      className="flex flex-col gap-0.5 w-full text-left px-2 py-2 text-xs rounded transition-colors text-white/60 hover:bg-white/8 hover:text-white/90 disabled:opacity-50 disabled:pointer-events-none"
    >
      <span className="text-white/90 font-medium capitalize">{rig.variant_name} — {rig.stage}</span>
      <span className="text-white/30">{filename}</span>
    </button>
  )
}

const selectCls =
  'h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white outline-none'

export function PickSidebar() {
  const stlKey = useSharedStore((s) => s.stlKey)
  const setStlKey = useSharedStore((s) => s.setStlKey)
  const variantId = useSharedStore((s) => s.variantId)
  const setVariantId = useSharedStore((s) => s.setVariantId)
  const stage = useSharedStore((s) => s.stage)
  const setStage = useSharedStore((s) => s.setStage)
  const [tab, setTab] = useState<'new' | 'load'>('new')

  const { data: files, isLoading: filesLoading } = useR2Files()
  const { loadStl, loading: stlLoading } = useStlLoader()

  const { data: variants, isLoading: variantsLoading } = useVariants()
  const { data: rigs, isLoading: rigsLoading } = useDragonRigs()
  const { loadFromRig, loading: rigLoading } = useLoadRig()

  const loading = stlLoading || rigLoading
  const targetReady = !!variantId && !!stage

  function handleSelect(key: string) {
    if (loading || !targetReady) return
    setStlKey(key)
    loadStl(key)
  }

  return (
    <div className="flex flex-col gap-4 p-4 text-white">
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        <button
          onClick={() => setTab('new')}
          className={cn(
            'flex-1 py-1 text-xs rounded-md transition-colors',
            tab === 'new' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
          )}
        >
          New
        </button>
        <button
          onClick={() => setTab('load')}
          className={cn(
            'flex-1 py-1 text-xs rounded-md transition-colors',
            tab === 'load' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
          )}
        >
          Load
        </button>
      </div>

      {tab === 'new' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Target
            </h3>
            <select
              value={variantId ?? ''}
              onChange={(e) => setVariantId(e.target.value)}
              disabled={variantsLoading}
              className={selectCls}
            >
              <option value="">Select a variant…</option>
              {variants?.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <select
              value={stage ?? ''}
              onChange={(e) => setStage(e.target.value as DragonStage)}
              className={selectCls}
            >
              <option value="">Select a stage…</option>
              {DRAGON_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
              Select STL File
            </h3>
            {!targetReady && (
              <p className="text-[10px] text-amber-300/70 mb-2">
                Choose a variant and stage first.
              </p>
            )}
            {filesLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-6 bg-white/8 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {files?.map((node) => (
                  <FileNode
                    key={node.key}
                    node={node}
                    depth={0}
                    onSelect={handleSelect}
                    selectedKey={stlKey}
                    disabled={!targetReady}
                  />
                ))}
                {!files?.length && (
                  <p className="text-xs text-white/30 px-2">No files found in bucket.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'load' && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
            Saved Rigs
          </h3>
          {rigsLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/8 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {rigs?.map((rig) => (
                <RigRow
                  key={rig.id}
                  rig={rig}
                  onSelect={loadFromRig}
                  loading={loading}
                />
              ))}
              {!rigs?.length && (
                <p className="text-xs text-white/30 px-2">No saved rigs.</p>
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <div className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
          Loading & segmenting mesh…
        </div>
      )}
    </div>
  )
}
