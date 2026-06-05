'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore } from './animateStore'
import { CalibrateTab } from './CalibrateTab'
import { BodyGroup } from '../_lib/types'
import {
  buildSkeletonTree,
  effectiveAngleCaps,
  flattenSkeleton,
} from '@/app/game/locomotion/chain'

const RAD_TO_DEG = 180 / Math.PI
const ROOT_TRANSLATE_BOUND = 5
const ROOT_YAW_BOUND = Math.PI
const JOINT_BOUND = Math.PI / 2

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
  const groups = useSharedStore((s) => s.groups)
  const manualPose = useAnimateStore((s) => s.manualPose)
  const setManualPoseRootX = useAnimateStore((s) => s.setManualPoseRootX)
  const setManualPoseRootZ = useAnimateStore((s) => s.setManualPoseRootZ)
  const setManualPoseRootYaw = useAnimateStore((s) => s.setManualPoseRootYaw)
  const setManualPoseJointAngle = useAnimateStore((s) => s.setManualPoseJointAngle)
  const resetManualPose = useAnimateStore((s) => s.resetManualPose)
  const simRunning = useAnimateStore((s) => s.simRunning)
  const setSimRunning = useAnimateStore((s) => s.setSimRunning)
  const requestSimReset = useAnimateStore((s) => s.requestSimReset)
  const requestSimKick = useAnimateStore((s) => s.requestSimKick)
  const requestSimPerturb = useAnimateStore((s) => s.requestSimPerturb)
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
  const muscleTestRunning = useAnimateStore((s) => s.muscleTestRunning)
  const muscleTestFreq = useAnimateStore((s) => s.muscleTestFreq)
  const muscleTestAmplitude = useAnimateStore((s) => s.muscleTestAmplitude)
  const muscleTestPhasePerSeg = useAnimateStore((s) => s.muscleTestPhasePerSeg)
  const setMuscleTestRunning = useAnimateStore((s) => s.setMuscleTestRunning)
  const setMuscleTestFreq = useAnimateStore((s) => s.setMuscleTestFreq)
  const setMuscleTestAmplitude = useAnimateStore((s) => s.setMuscleTestAmplitude)
  const setMuscleTestPhasePerSeg = useAnimateStore((s) => s.setMuscleTestPhasePerSeg)
  const coupledRunning = useAnimateStore((s) => s.coupledRunning)
  const setCoupledRunning = useAnimateStore((s) => s.setCoupledRunning)
  const environmentEnabled = useAnimateStore((s) => s.environmentEnabled)
  const setEnvironmentEnabled = useAnimateStore((s) => s.setEnvironmentEnabled)

  const chainJoints = useMemo(() => {
    const chain = flattenSkeleton(buildSkeletonTree(groups))
    if (chain.length <= 1) return [] as BodyGroup[]
    return chain.slice(1)
  }, [groups])

  return (
    <div className="flex flex-col gap-4 p-4 text-xs text-white/60">
      <div className="flex flex-col gap-2 pb-3 border-b border-white/10">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Environment (Phase C)</p>
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
          Anisotropic swimming drag (C_n=12, C_t=1.0). Enables forward thrust under B3.
        </p>
      </div>

      <p className="text-white/55 text-[10px] uppercase tracking-widest">Simulate — Phase A4 (damping + limit stops)</p>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSimRunning(!simRunning)}
            className={cn(
              'flex-1 py-1.5 rounded-md transition-colors',
              simRunning
                ? 'bg-emerald-600/40 text-emerald-200'
                : 'bg-white/10 text-white/70 hover:text-white'
            )}
          >
            {simRunning ? 'Pause' : 'Run'}
          </button>
          <button
            onClick={requestSimReset}
            className="flex-1 py-1.5 rounded-md bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={requestSimKick}
            className="flex-1 py-1.5 rounded-md bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            Kick translation
          </button>
          <button
            onClick={requestSimPerturb}
            className="flex-1 py-1.5 rounded-md bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            Kick joints
          </button>
        </div>
        <button
          onClick={() => setSimRecording(!simRecording)}
          className={cn(
            'py-1.5 rounded-md transition-colors',
            simRecording
              ? 'bg-rose-600/40 text-rose-200 animate-pulse'
              : 'bg-white/10 text-white/70 hover:text-white'
          )}
        >
          {simRecording ? 'Stop' : 'Record'}
        </button>
        {lastCapturePath ? (
          <p className="text-emerald-300/70 text-[10px] break-all font-mono">{lastCapturePath}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Diagnostics</p>
        <DiagnosticRow label="Kinetic energy" value={simDiagnostics.kineticEnergy.toExponential(2)} />
        <DiagnosticRow label="COM drift" value={simDiagnostics.comDriftFromStart.toExponential(2)} />
        <DiagnosticRow label="Max joint / cap" value={`${(simDiagnostics.maxJointFracOfCap * 100).toFixed(0)}%`} />
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">CPG (Phase B1)</p>
        <PoseSlider
          label="drive"
          value={cpgDrive}
          min={0}
          max={2}
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
          Axial double chain (Knüsel 2020). Body stays at rest; wave appears in capture as
          diagonal stripes (head→tail). Expected ν ≈ drive·exc·1.1 Hz.
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Muscle test (Phase B2)</p>
        <PoseSlider
          label="frequency (Hz)"
          value={muscleTestFreq}
          min={0}
          max={3}
          step={0.05}
          onChange={setMuscleTestFreq}
          format={(v) => v.toFixed(2)}
        />
        <PoseSlider
          label="amplitude"
          value={muscleTestAmplitude}
          min={0}
          max={50}
          step={0.5}
          onChange={setMuscleTestAmplitude}
          format={(v) => v.toFixed(1)}
        />
        <PoseSlider
          label="phase / segment"
          value={muscleTestPhasePerSeg}
          min={0}
          max={Math.PI}
          step={0.01}
          onChange={setMuscleTestPhasePerSeg}
          format={(v) => `${(v * RAD_TO_DEG).toFixed(0)}°`}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setMuscleTestRunning(!muscleTestRunning)}
            className={cn(
              'flex-1 py-1.5 rounded-md transition-colors',
              muscleTestRunning
                ? 'bg-amber-600/40 text-amber-200'
                : 'bg-white/10 text-white/70 hover:text-white'
            )}
          >
            {muscleTestRunning ? 'Pause muscle test' : 'Run muscle test'}
          </button>
          <button
            onClick={() => setSimRecording(!simRecording)}
            disabled={!muscleTestRunning}
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
          Ekeberg α=0.4, β=1.2, γ=0.2, δ=0.1 (Table 5). Drives joints with a clean test
          sinusoid (no CPG). Pause → β·γ·φ stiffness springs joints back toward 0.
          Default amp=20 compensates for our rig&apos;s mass (paper assumes lighter body).
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">CPG drive (Phase B3)</p>
        <p className="text-white/45 text-[10px] leading-relaxed">
          Couples the CPG to the Ekeberg muscles into the body. Uses the drive +
          excitability sliders above. Body undulates head→tail in place (no environment).
        </p>
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
      </div>

      <div
        className={cn(
          'flex flex-col gap-4 transition-opacity',
          simRunning ? 'opacity-40 pointer-events-none' : 'opacity-100'
        )}
      >
      <div className="flex flex-col gap-3">
        <p className="text-white/55 text-[10px] uppercase tracking-widest">Root</p>
        <PoseSlider
          label="x"
          value={manualPose.rootX}
          min={-ROOT_TRANSLATE_BOUND}
          max={ROOT_TRANSLATE_BOUND}
          step={0.01}
          onChange={setManualPoseRootX}
          format={(v) => v.toFixed(2)}
        />
        <PoseSlider
          label="z"
          value={manualPose.rootZ}
          min={-ROOT_TRANSLATE_BOUND}
          max={ROOT_TRANSLATE_BOUND}
          step={0.01}
          onChange={setManualPoseRootZ}
          format={(v) => v.toFixed(2)}
        />
        <PoseSlider
          label="yaw"
          value={manualPose.rootYawRad}
          min={-ROOT_YAW_BOUND}
          max={ROOT_YAW_BOUND}
          step={0.005}
          onChange={setManualPoseRootYaw}
          format={(v) => `${(v * RAD_TO_DEG).toFixed(0)}°`}
        />
      </div>

      {chainJoints.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-white/55 text-[10px] uppercase tracking-widest">Chain joints</p>
          {chainJoints.map((g) => {
            const caps = effectiveAngleCaps(g)
            const yawFwdDeg = caps.yaw * RAD_TO_DEG
            const yawBackDeg = (caps.yawBack ?? caps.yaw) * RAD_TO_DEG
            const label = g.name?.trim() || g.id.slice(0, 8)
            const value = manualPose.jointAnglesRad[g.id] ?? 0
            return (
              <PoseSlider
                key={g.id}
                label={label}
                hint={`cap ±[${yawBackDeg.toFixed(0)}°, ${yawFwdDeg.toFixed(0)}°]`}
                value={value}
                min={-JOINT_BOUND}
                max={JOINT_BOUND}
                step={0.005}
                onChange={(v) => setManualPoseJointAngle(g.id, v)}
                format={(v) => `${(v * RAD_TO_DEG).toFixed(0)}°`}
              />
            )
          })}
        </div>
      ) : (
        <p className="text-white/55 text-[10px] leading-relaxed">
          Load a rig with at least a head + one downstream chain group to see joint sliders.
        </p>
      )}

      <button
        onClick={resetManualPose}
        className="py-1.5 rounded-md bg-white/10 text-white/70 hover:text-white transition-colors"
      >
        Reset pose
      </button>
      </div>

      <p className="leading-relaxed text-white/55 text-[10px]">
        Passive solver (Phase A4): joint damping + soft limit stops. Run, then Kick joints
        — the chain should whip and settle to rest with KE → 0 and Max joint / cap ≤ 100%.
        Pose a joint past its cap and Run to watch the limit stop pull it back. See{' '}
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
