'use client'

import { cn } from '@/lib/utils'
import { useAnimateStore } from './animateStore'
import { CalibrateTab } from './CalibrateTab'

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="font-mono text-white/70">{value}</span>
    </div>
  )
}

function SimulateTab() {
  const running = useAnimateStore((s) => s.simRunning)
  const setSimRunning = useAnimateStore((s) => s.setSimRunning)
  const requestSimReset = useAnimateStore((s) => s.requestSimReset)
  const requestSimPerturb = useAnimateStore((s) => s.requestSimPerturb)
  const diagnostics = useAnimateStore((s) => s.simDiagnostics)

  return (
    <div className="flex flex-col gap-4 p-4 text-xs text-white/60">
      <p className="text-white/40 text-[10px] uppercase tracking-widest">Simulate — Phase A</p>

      <div className="flex gap-2">
        <button
          onClick={() => setSimRunning(!running)}
          className={cn(
            'flex-1 py-1.5 rounded-md transition-colors',
            running
              ? 'bg-emerald-600/40 text-emerald-200'
              : 'bg-white/10 text-white/70 hover:text-white'
          )}
        >
          {running ? 'Pause' : 'Run'}
        </button>
        <button
          onClick={requestSimPerturb}
          className="flex-1 py-1.5 rounded-md bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          Perturb
        </button>
        <button
          onClick={requestSimReset}
          className="flex-1 py-1.5 rounded-md bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-white/40 text-[10px] uppercase tracking-widest">Diagnostics</p>
        <DiagnosticRow label="Kinetic energy" value={diagnostics.kineticEnergy.toExponential(2)} />
        <DiagnosticRow label="COM drift" value={diagnostics.comDrift.toExponential(2)} />
        <DiagnosticRow
          label="Max joint / cap"
          value={`${(diagnostics.maxJointFractionOfCap * 100).toFixed(0)}%`}
        />
      </div>

      <p className="leading-relaxed text-white/40 text-[10px]">
        Phase A verification scaffolding: a passive rigid-body chain (no muscles, CPG, or
        environment). Run, then Perturb to kick the chain — it should settle via damping with
        COM drift near zero. Full controls arrive in Phase H. See{' '}
        <span className="font-mono text-white/60">documentation/animation-roadmap.md</span>.
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
