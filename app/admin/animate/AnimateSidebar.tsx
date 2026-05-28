'use client'

import { cn } from '@/lib/utils'
import { useAnimateStore } from './animateStore'
import { CalibrateTab } from './CalibrateTab'

function SimulateTab() {
  return (
    <div className="flex flex-col gap-3 p-4 text-xs text-white/60">
      <p className="text-white/40 text-[10px] uppercase tracking-widest">Simulate</p>
      <p className="leading-relaxed">
        Locomotion is being rebuilt as a faithful physics recreation of the reference paper
        (Knüsel et al. 2020). The previous kinematic preview has been removed; the rig shows
        its rest pose.
      </p>
      <p className="leading-relaxed text-white/40">
        See <span className="font-mono text-white/60">documentation/animation-roadmap.md</span>{' '}
        for the plan. Controls return per build phase.
      </p>
    </div>
  )
}

export function AnimateSidebar() {
  const activeTab = useAnimateStore((s) => s.animateTab)
  const setAnimateTab = useAnimateStore((s) => s.setAnimateTab)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3">
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => setAnimateTab('simulate')}
            className={cn(
              'flex-1 py-1 text-xs rounded-md transition-colors',
              activeTab === 'simulate'
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            Simulate
          </button>
          <button
            onClick={() => setAnimateTab('calibrate')}
            className={cn(
              'flex-1 py-1 text-xs rounded-md transition-colors',
              activeTab === 'calibrate'
                ? 'bg-amber-600/40 text-amber-300'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            Calibrate
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {activeTab === 'simulate' ? (
          <div className="h-full overflow-y-auto">
            <SimulateTab />
          </div>
        ) : (
          <CalibrateTab />
        )}
      </div>
    </div>
  )
}
