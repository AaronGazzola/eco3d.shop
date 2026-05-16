'use client'

import { useState } from 'react'
import { useStudioStore } from './page.stores'
import { SliderField } from '../game/ConfigPanel.primitives'
import { Checkbox } from '@/components/ui/checkbox'
import { dumpTelemetry, dumpSkeletonSnapshot } from '../game/animations/telemetry'
import { cn } from '@/lib/utils'

function ModelOpacityRow() {
  const modelOpacity = useStudioStore((s) => s.modelOpacity)
  const setModelOpacity = useStudioStore((s) => s.setModelOpacity)
  return (
    <div>
      <SliderField
        label="Model Opacity"
        value={modelOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setModelOpacity(v)}
      />
    </div>
  )
}

function IntentToggleRow() {
  const showIntent = useStudioStore((s) => s.overlayToggles.intent)
  const setOverlayToggle = useStudioStore((s) => s.setOverlayToggle)
  return (
    <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
      <Checkbox
        checked={showIntent}
        onCheckedChange={(v) => setOverlayToggle('intent', v === true)}
      />
      <span>Show Intent</span>
    </label>
  )
}

function CopyButton({ label, getData }: { label: string; getData: () => string | null }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'empty' | 'error'>('idle')

  const handleClick = async () => {
    const data = getData()
    if (!data) {
      setStatus('empty')
      setTimeout(() => setStatus('idle'), 1500)
      return
    }
    try {
      await navigator.clipboard.writeText(data)
      setStatus('copied')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
    setTimeout(() => setStatus('idle'), 1500)
  }

  const displayLabel =
    status === 'copied' ? 'Copied' :
    status === 'empty' ? 'No data' :
    status === 'error' ? 'Error' :
    label

  return (
    <button
      onClick={handleClick}
      className={cn(
        'rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80',
        'hover:bg-white/10 transition-colors'
      )}
    >
      {displayLabel}
    </button>
  )
}

export function StepAnimate() {
  return (
    <div className={cn('flex flex-col gap-4 p-4 text-white')}>
      <ModelOpacityRow />
      <IntentToggleRow />
      <div className="flex flex-col gap-2">
        <CopyButton label="Copy Telemetry" getData={dumpTelemetry} />
        <CopyButton label="Copy Skeleton" getData={dumpSkeletonSnapshot} />
      </div>
    </div>
  )
}
