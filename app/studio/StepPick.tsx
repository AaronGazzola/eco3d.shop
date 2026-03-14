'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useR2Files, useStlLoader, useModelConfigs, useLoadConfig } from './page.hooks'
import { useStudioStore } from './page.stores'
import { R2FileNode, ModelConfigRow } from './page.types'

function FileNode({
  node,
  depth,
  onSelect,
  selectedKey,
}: {
  node: R2FileNode
  depth: number
  onSelect: (key: string) => void
  selectedKey: string | null
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
          />
        ))}
      </div>
    )
  }

  if (!isStl) return null

  return (
    <button
      onClick={() => onSelect(node.key)}
      className={cn(
        'flex items-center gap-1.5 w-full text-left px-2 py-1.5 text-xs rounded transition-colors',
        selectedKey === node.key
          ? 'bg-violet-600/30 text-violet-300'
          : 'text-white/60 hover:bg-white/8 hover:text-white/90'
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <span className="text-white/30">◆</span>
      <span>{node.name}</span>
    </button>
  )
}

function ConfigRow({
  config,
  onSelect,
  loading,
}: {
  config: ModelConfigRow
  onSelect: (config: ModelConfigRow) => void
  loading: boolean
}) {
  const filename = config.stl_key.split('/').pop() ?? config.stl_key
  const date = new Date(config.created_at).toLocaleDateString()
  return (
    <button
      onClick={() => onSelect(config)}
      disabled={loading}
      className="flex flex-col gap-0.5 w-full text-left px-2 py-2 text-xs rounded transition-colors text-white/60 hover:bg-white/8 hover:text-white/90 disabled:opacity-50 disabled:pointer-events-none"
    >
      <span className="text-white/90 font-medium">{config.name}</span>
      <span className="text-white/30">{filename} · {date}</span>
    </button>
  )
}

export function StepPick() {
  const { stlKey, setStlKey } = useStudioStore()
  const [tab, setTab] = useState<'new' | 'load'>('new')

  const { data: files, isLoading: filesLoading } = useR2Files()
  const { loadStl, loading: stlLoading } = useStlLoader()

  const { data: configs, isLoading: configsLoading } = useModelConfigs()
  const { loadFromConfig, loading: configLoading } = useLoadConfig()

  const loading = stlLoading || configLoading

  function handleSelect(key: string) {
    if (loading) return
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
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
            Select STL File
          </h3>
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
                />
              ))}
              {!files?.length && (
                <p className="text-xs text-white/30 px-2">No files found in bucket.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'load' && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
            Saved Configurations
          </h3>
          {configsLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/8 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {configs?.map((config) => (
                <ConfigRow
                  key={config.id}
                  config={config}
                  onSelect={loadFromConfig}
                  loading={loading}
                />
              ))}
              {!configs?.length && (
                <p className="text-xs text-white/30 px-2">No saved configurations.</p>
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
