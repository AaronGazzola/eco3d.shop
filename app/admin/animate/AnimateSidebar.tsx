'use client'

import { cn } from '@/lib/utils'
import { useAnimateStore } from './animateStore'
import { CalibrateTab } from './CalibrateTab'

function PoseSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-white/60 text-[10px]">{label}</span>
        <span className="font-mono text-white/70 text-[10px]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
      {hint ? <span className="text-white/45 text-[9px] font-mono">{hint}</span> : null}
    </div>
  )
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55">{label}</span>
      <span className="font-mono text-white/70">{value}</span>
    </div>
  )
}

function SimulateTab() {
  const simRecording = useAnimateStore((s) => s.simRecording)
  const setSimRecording = useAnimateStore((s) => s.setSimRecording)
  const simDiagnostics = useAnimateStore((s) => s.simDiagnostics)
  const lastCapturePath = useAnimateStore((s) => s.lastCapturePath)
  const cpgDrive = useAnimateStore((s) => s.cpgDrive)
  const cpgExcitability = useAnimateStore((s) => s.cpgExcitability)
  const cpgRunning = useAnimateStore((s) => s.cpgRunning)
  const cpgRecording = useAnimateStore((s) => s.cpgRecording)
  const setCpgDrive = useAnimateStore((s) => s.setCpgDrive)
  const setCpgExcitability = useAnimateStore((s) => s.setCpgExcitability)
  const setCpgRunning = useAnimateStore((s) => s.setCpgRunning)
  const setCpgRecording = useAnimateStore((s) => s.setCpgRecording)
  const coupledRunning = useAnimateStore((s) => s.coupledRunning)
  const setCoupledRunning = useAnimateStore((s) => s.setCoupledRunning)
  const environmentEnabled = useAnimateStore((s) => s.environmentEnabled)
  const setEnvironmentEnabled = useAnimateStore((s) => s.setEnvironmentEnabled)
  const planarConstraint = useAnimateStore((s) => s.planarConstraint)
  const setPlanarConstraint = useAnimateStore((s) => s.setPlanarConstraint)
  const muscleAlpha = useAnimateStore((s) => s.muscleAlpha)
  const muscleBeta = useAnimateStore((s) => s.muscleBeta)
  const muscleDamping = useAnimateStore((s) => s.muscleDamping)
  const setMuscleAlpha = useAnimateStore((s) => s.setMuscleAlpha)
  const setMuscleBeta = useAnimateStore((s) => s.setMuscleBeta)
  const setMuscleDamping = useAnimateStore((s) => s.setMuscleDamping)

  return (
    <div className="flex flex-col gap-4 p-4 text-xs text-white/60">
      <div className="flex flex-col gap-2 pb-3 border-b border-white/10">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Environment</p>
        <button
          onClick={() => setEnvironmentEnabled(!environmentEnabled)}
          className={cn(
            'py-1.5 rounded-md transition-colors',
            environmentEnabled
              ? 'bg-sky-600/40 text-sky-200'
              : 'bg-white/10 text-white/70 hover:text-white'
          )}
        >
          {environmentEnabled ? 'Drag ON' : 'Drag OFF'}
        </button>
        <p className="text-white/45 text-[10px] leading-relaxed">
          3D anisotropic swimming drag (neutral-buoyancy water, gravity off). Enables forward
          thrust.
        </p>
        <button
          onClick={() => setPlanarConstraint(!planarConstraint)}
          className={cn(
            'py-1.5 rounded-md transition-colors',
            planarConstraint
              ? 'bg-amber-600/40 text-amber-200'
              : 'bg-white/10 text-white/70 hover:text-white'
          )}
        >
          {planarConstraint ? 'Planar lock ON' : 'Planar lock OFF'}
        </button>
        <p className="text-white/45 text-[10px] leading-relaxed">
          Post-step projection that forces the body into the horizontal plane (stops floating).
          Toggle OFF to see the raw 3D physics (it will float/tilt).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Locomotion — CPG drive (3D)</p>
        <PoseSlider
          label="drive"
          value={cpgDrive}
          min={0}
          max={3}
          step={0.01}
          onChange={setCpgDrive}
          format={(v) => v.toFixed(2)}
        />
        <PoseSlider
          label="excitability"
          value={cpgExcitability}
          min={0}
          max={2}
          step={0.01}
          onChange={setCpgExcitability}
          format={(v) => v.toFixed(2)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setCoupledRunning(!coupledRunning)}
            className={cn(
              'flex-1 py-1.5 rounded-md transition-colors',
              coupledRunning
                ? 'bg-cyan-600/40 text-cyan-200'
                : 'bg-white/10 text-white/70 hover:text-white'
            )}
          >
            {coupledRunning ? 'Pause CPG drive' : 'Run CPG drive'}
          </button>
          <button
            onClick={() => setSimRecording(!simRecording)}
            disabled={!coupledRunning}
            className={cn(
              'flex-1 py-1.5 rounded-md transition-colors',
              simRecording
                ? 'bg-rose-600/40 text-rose-200 animate-pulse'
                : 'bg-white/10 text-white/70 hover:text-white disabled:opacity-40 disabled:hover:text-white/70'
            )}
          >
            {simRecording ? 'Stop' : 'Record'}
          </button>
        </div>
        <p className="text-white/45 text-[10px] leading-relaxed">
          CPG → Ekeberg muscles (via Rapier joint motor) → 3D body. Drag off → undulates in place;
          Drag on → swims forward, head-first. Calibrated defaults: drive 2.0 / exc 0.15 / α 1.0.
        </p>
        {lastCapturePath ? (
          <p className="text-emerald-300/70 text-[10px] break-all font-mono">{lastCapturePath}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Muscle (Ekeberg)</p>
        <PoseSlider
          label="α active gain"
          hint="paper 0.4, calibrated 1.0 for our body scale — drives the bend"
          value={muscleAlpha}
          min={0}
          max={5}
          step={0.05}
          onChange={setMuscleAlpha}
          format={(v) => v.toFixed(2)}
        />
        <PoseSlider
          label="β stiffness"
          hint="paper 1.2 — holds the joint back toward 0"
          value={muscleBeta}
          min={0}
          max={20}
          step={0.1}
          onChange={setMuscleBeta}
          format={(v) => v.toFixed(2)}
        />
        <PoseSlider
          label="δ damping"
          hint="paper 0.1 — motor damping (was a 2.0 band-aid before the motor fix)"
          value={muscleDamping}
          min={0}
          max={20}
          step={0.05}
          onChange={setMuscleDamping}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Diagnostics</p>
        <DiagnosticRow label="Kinetic energy" value={simDiagnostics.kineticEnergy.toExponential(2)} />
        <DiagnosticRow label="COM drift (forward)" value={simDiagnostics.comDriftFromStart.toExponential(2)} />
        <DiagnosticRow label="Max joint / cap" value={`${(simDiagnostics.maxJointFracOfCap * 100).toFixed(0)}%`} />
        <DiagnosticRow label="comY (float)" value={simDiagnostics.comYDrift.toFixed(3)} />
        <DiagnosticRow label="Max tilt (off-plane)" value={`${simDiagnostics.maxTiltDeg.toFixed(1)}°`} />
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">CPG preview (signal only)</p>
        <div className="flex gap-2">
          <button
            onClick={() => setCpgRunning(!cpgRunning)}
            className={cn(
              'flex-1 py-1.5 rounded-md transition-colors',
              cpgRunning
                ? 'bg-violet-600/40 text-violet-200'
                : 'bg-white/10 text-white/70 hover:text-white'
            )}
          >
            {cpgRunning ? 'Pause CPG' : 'Run CPG'}
          </button>
          <button
            onClick={() => setCpgRecording(!cpgRecording)}
            disabled={!cpgRunning}
            className={cn(
              'flex-1 py-1.5 rounded-md transition-colors',
              cpgRecording
                ? 'bg-rose-600/40 text-rose-200 animate-pulse'
                : 'bg-white/10 text-white/70 hover:text-white disabled:opacity-40 disabled:hover:text-white/70'
            )}
          >
            {cpgRecording ? 'Stop' : 'Record'}
          </button>
        </div>
        <p className="text-white/45 text-[10px] leading-relaxed">
          Axial double chain (Knüsel 2020), no body. Capture shows the head→tail wave as
          diagonal stripes. Expected ν ≈ drive·exc·1.1 Hz.
        </p>
      </div>

      <p className="leading-relaxed text-white/55 text-[10px]">
        Body runs in Rapier (3D). See{' '}
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
                : 'text-white/55 hover:text-white/70'
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
                : 'text-white/55 hover:text-white/70'
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
