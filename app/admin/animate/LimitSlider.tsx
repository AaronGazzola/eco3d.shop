'use client'

import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type Thumb = 'low' | 'high' | 'value'

interface LimitSliderProps {
  min: number
  max: number
  low: number
  high: number
  value: number
  mirrored?: boolean
  onLowChange: (low: number) => void
  onHighChange: (high: number) => void
  onValueChange: (value: number) => void
  className?: string
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function LimitSlider({
  min,
  max,
  low,
  high,
  value,
  mirrored = false,
  onLowChange,
  onHighChange,
  onValueChange,
  className,
}: LimitSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<Thumb | null>(null)
  const pendingXRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const propsRef = useRef({ low, high, value, min, max, mirrored, onLowChange, onHighChange, onValueChange })
  useEffect(() => {
    propsRef.current = { low, high, value, min, max, mirrored, onLowChange, onHighChange, onValueChange }
  })

  const pctOf = (n: number) => ((n - min) / (max - min)) * 100

  const valueFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current
    if (!track) return 0
    const { min: lo, max: hi } = propsRef.current
    const rect = track.getBoundingClientRect()
    const t = clamp((clientX - rect.left) / rect.width, 0, 1)
    return lo + t * (hi - lo)
  }, [])

  const flushDrag = useCallback(() => {
    rafRef.current = null
    const clientX = pendingXRef.current
    pendingXRef.current = null
    if (clientX == null) return
    const which = dragRef.current
    if (!which) return
    const { low, high, value, min, max, mirrored, onLowChange, onHighChange, onValueChange } = propsRef.current
    const raw = valueFromClientX(clientX)
    if (which === 'low') {
      if (mirrored) {
        const magnitude = clamp(Math.abs(raw), 0, Math.max(Math.abs(min), Math.abs(max)))
        onLowChange(-magnitude)
        onHighChange(magnitude)
        if (value < -magnitude) onValueChange(-magnitude)
        else if (value > magnitude) onValueChange(magnitude)
      } else {
        const next = clamp(raw, min, high)
        onLowChange(next)
        if (value < next) onValueChange(next)
      }
    } else if (which === 'high') {
      if (mirrored) {
        const magnitude = clamp(Math.abs(raw), 0, Math.max(Math.abs(min), Math.abs(max)))
        onHighChange(magnitude)
        onLowChange(-magnitude)
        if (value > magnitude) onValueChange(magnitude)
        else if (value < -magnitude) onValueChange(-magnitude)
      } else {
        const next = clamp(raw, low, max)
        onHighChange(next)
        if (value > next) onValueChange(next)
      }
    } else {
      onValueChange(clamp(raw, low, high))
    }
  }, [valueFromClientX])

  const scheduleDrag = useCallback((clientX: number) => {
    pendingXRef.current = clientX
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(flushDrag)
  }, [flushDrag])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  const onPointerDown = useCallback(
    (which: Thumb) => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = which
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      scheduleDrag(e.clientX)
    },
    [scheduleDrag]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      scheduleDrag(e.clientX)
    },
    [scheduleDrag]
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (pendingXRef.current !== null) {
      flushDrag()
    }
    dragRef.current = null
    if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    }
  }, [flushDrag])

  const lowPct = pctOf(low)
  const highPct = pctOf(high)
  const valuePct = pctOf(value)

  return (
    <div className={cn('relative h-6 select-none', className)}>
      <div
        ref={trackRef}
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/10"
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-violet-500/40"
        style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
      />
      <div
        onPointerDown={onPointerDown('low')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-sm bg-white/40 hover:bg-white/70 cursor-grab active:cursor-grabbing touch-none"
        style={{ left: `${lowPct}%` }}
      />
      <div
        onPointerDown={onPointerDown('high')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-sm bg-white/40 hover:bg-white/70 cursor-grab active:cursor-grabbing touch-none"
        style={{ left: `${highPct}%` }}
      />
      <div
        onPointerDown={onPointerDown('value')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-400 border border-white shadow cursor-grab active:cursor-grabbing touch-none"
        style={{ left: `${valuePct}%` }}
      />
    </div>
  )
}
