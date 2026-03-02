'use client'

import { useState } from 'react'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { cn } from '@/lib/utils'
import { useR2Files } from './page.hooks'
import { useStudioStore } from './page.stores'
import { detectSegments } from './segmentDetector'
import { SegmentData, R2FileNode } from './page.types'

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

export function StepPick() {
  const { stlKey, setStlKey, setSegments } = useStudioStore()
  const { data: files, isLoading: filesLoading } = useR2Files()
  const [loading, setLoading] = useState(false)

  function handleSelect(key: string) {
    if (loading) return
    setStlKey(key)
    setLoading(true)

    fetch(`/api/r2?key=${encodeURIComponent(key)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then((buffer) => {
        const loader = new STLLoader()
        const geometry = loader.parse(buffer)
        const positions = geometry.attributes.position.array as Float32Array
        const componentArrays = detectSegments(positions)

        let minY = Infinity
        for (const arr of componentArrays) {
          for (let i = 1; i < arr.length; i += 3) {
            if (arr[i] < minY) minY = arr[i]
          }
        }
        for (const arr of componentArrays) {
          for (let i = 1; i < arr.length; i += 3) {
            arr[i] -= minY
          }
        }

        const segments: SegmentData[] = componentArrays.map((arr, i) => ({
          id: `seg-${i}`,
          positions: arr,
          color: '#ffffff',
        }))
        setSegments(segments)
        setLoading(false)
      })
      .catch((err) => {
        console.error('STL load failed', err)
        setLoading(false)
      })
  }

  return (
    <div className="flex flex-col gap-4 p-4 text-white">
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
      {loading && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <div className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
          Loading & segmenting mesh…
        </div>
      )}
    </div>
  )
}
