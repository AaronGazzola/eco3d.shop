'use client'

import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSharedStore } from '../_lib/sharedStore'
import { EXCITABILITY_AXIAL } from '@/app/game/locomotion/oscillator'
import { useLocomotionStore } from './locomotionStore'
import type { LocomotionSnapshot } from './LocomotionScene'

function Slider({
  label,
  value,
  min,
  max,
  step,
  digits,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  digits: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-violet-400"
      />
      <span className="text-[10px] text-white/50 w-10 text-right font-mono">
        {value.toFixed(digits)}
      </span>
    </div>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/40">{label}</span>
      <span className="text-[10px] text-white/70 font-mono">{value}</span>
    </div>
  )
}

export function LocomotionSidebar() {
  const groups = useSharedStore((s) => s.groups)

  const drive = useLocomotionStore((s) => s.drive)
  const bendGain = useLocomotionStore((s) => s.bendGain)
  const thrustGain = useLocomotionStore((s) => s.thrustGain)
  const drag = useLocomotionStore((s) => s.drag)
  const running = useLocomotionStore((s) => s.running)
  const setDrive = useLocomotionStore((s) => s.setDrive)
  const setBendGain = useLocomotionStore((s) => s.setBendGain)
  const setThrustGain = useLocomotionStore((s) => s.setThrustGain)
  const setDrag = useLocomotionStore((s) => s.setDrag)
  const setRunning = useLocomotionStore((s) => s.setRunning)

  const [snapshot, setSnapshot] = useState<LocomotionSnapshot | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(window.__loco ?? null), 200)
    return () => window.clearInterval(id)
  }, [])

  if (groups.length === 0) {
    return (
      <div className="p-4">
        <p className="text-[11px] text-amber-300/70">
          Load a rig with grouped segments in the Pick step before running locomotion.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 text-white">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Locomotion
        </h3>
        <span className="text-[10px] text-white/30">swim</span>
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs gap-1.5"
        onClick={() => setRunning(!running)}
      >
        {running ? <Pause className="size-3" /> : <Play className="size-3" />}
        {running ? 'Pause' : 'Run'}
      </Button>

      <div className="flex flex-col gap-1.5">
        <Slider label="Drive" value={drive} min={0} max={2} step={0.02} digits={2} onChange={setDrive} />
        <Slider
          label="Bend gain"
          value={bendGain}
          min={0}
          max={0.4}
          step={0.005}
          digits={3}
          onChange={setBendGain}
        />
        <Slider
          label="Thrust"
          value={thrustGain}
          min={0}
          max={5}
          step={0.1}
          digits={1}
          onChange={setThrustGain}
        />
        <Slider label="Drag" value={drag} min={1} max={100} step={1} digits={0} onChange={setDrag} />
      </div>

      <div className="flex flex-col gap-1 pt-2 border-t border-white/8">
        <Readout label="Wave frequency" value={`${(drive * EXCITABILITY_AXIAL).toFixed(2)} Hz`} />
        <Readout
          label="Head-to-tail lag"
          value={snapshot ? `${snapshot.totalLagRad.toFixed(2)} rad` : '—'}
        />
        <Readout label="Speed" value={snapshot ? `${snapshot.speed.toFixed(3)} /s` : '—'} />
        <Readout label="Joints" value={`${snapshot ? snapshot.joints.length : 0}`} />
      </div>

      <p className="text-[10px] text-white/25">
        Drive past 3 collapses the wave, matching the paper&apos;s saturation threshold.
      </p>
    </div>
  )
}
