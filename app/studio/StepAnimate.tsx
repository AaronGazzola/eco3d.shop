'use client'

import { useStudioStore } from './page.stores'
import { SliderField } from '../game/ConfigPanel.primitives'
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

export function StepAnimate() {
  return (
    <div className={cn('flex flex-col gap-4 p-4 text-white')}>
      <ModelOpacityRow />
    </div>
  )
}
