'use client'

import { Slider } from '@/components/ui/slider'

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="font-mono text-white/80">{value.toFixed(2)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3 mt-1">
      {children}
    </h3>
  )
}

export function Divider() {
  return <div className="border-t border-white/8 my-1" />
}
