'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { listModelConfigsAction } from '../studio/page.actions'
import { ModelConfigRow } from '../studio/page.types'
import { useCreatureStore } from '../page.stores'

function ConfigRow({
  config,
  selected,
  onClick,
}: {
  config: ModelConfigRow
  selected: boolean
  onClick: () => void
}) {
  const filename = config.stl_key.split('/').pop() ?? config.stl_key
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-0.5 w-full px-3 py-2 rounded text-left transition-colors',
        selected
          ? 'bg-violet-500/20 border border-violet-500/40'
          : 'hover:bg-white/5 border border-transparent'
      )}
    >
      <span className="text-xs font-medium text-white/80">{config.name}</span>
      <span className="text-[10px] text-white/30 truncate">{filename}</span>
    </button>
  )
}

export function ModelList() {
  const { selectedConfig, setSelectedConfig } = useCreatureStore()

  const { data: configs, isLoading } = useQuery({
    queryKey: ['model-configs'],
    queryFn: listModelConfigsAction,
  })

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
      </div>
    )
  }

  if (!configs?.length) {
    return <p className="px-3 py-2 text-[10px] text-white/30">No models saved yet.</p>
  }

  return (
    <div className="flex flex-col gap-0.5">
      {configs.map((config) => (
        <ConfigRow
          key={config.id}
          config={config}
          selected={selectedConfig?.id === config.id}
          onClick={() => setSelectedConfig(selectedConfig?.id === config.id ? null : config)}
        />
      ))}
    </div>
  )
}
