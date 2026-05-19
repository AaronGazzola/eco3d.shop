'use client'

import { cn } from '@/lib/utils'
import { useStudioStore } from './page.stores'

export function StepAnimate() {
  const attractor = useStudioStore((s) => s.attractor)
  const setAttractor = useStudioStore((s) => s.setAttractor)
  const strains = useStudioStore((s) => s.strains)
  const footPhases = useStudioStore((s) => s.footPhases)

  return (
    <div className={cn('flex flex-col gap-3 p-4 text-xs text-white/70')}>
      <p className="text-white/90 font-medium text-sm">Step 5 — Front Feet Step</p>
      <p>
        When a planted foot&apos;s strain crosses the threshold it lifts, arcs to where
        the hip wants it, and replants. With both feet equally strained, the
        inside-of-turn foot wins. Once it lands, the hip&apos;s rotation commits and the
        S-curve becomes permanent.
      </p>
      <p className="text-white/50">
        Click far to the side. Watch the green (left) or violet (right) foot marker lift
        and replant. Foot markers are world-pinned; leg geometry doesn&apos;t track yet.
      </p>
      <div className="rounded bg-white/5 px-2 py-1.5 font-mono text-[11px] text-white/80">
        <div>L front: {footPhases.leftFront} · strain {strains.leftFront.toFixed(3)}</div>
        <div>R front: {footPhases.rightFront} · strain {strains.rightFront.toFixed(3)}</div>
      </div>
      <div className="rounded bg-white/5 px-2 py-1.5 font-mono text-[11px] text-white/80">
        {attractor
          ? `attractor: (${attractor.x.toFixed(2)}, ${attractor.y.toFixed(2)}, ${attractor.z.toFixed(2)})`
          : 'attractor: null'}
      </div>
      <button
        onClick={() => setAttractor(null)}
        disabled={!attractor}
        className={cn(
          'self-start rounded border border-white/20 px-2 py-1 text-[11px]',
          attractor ? 'text-white/80 hover:bg-white/10' : 'text-white/30'
        )}
      >
        Clear attractor
      </button>
    </div>
  )
}
