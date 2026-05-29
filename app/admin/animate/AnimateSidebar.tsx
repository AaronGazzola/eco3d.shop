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
      {hint ? <span className="text-white/30 text-[9px] font-mono">{hint}</span> : null}
    </div>
  )
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
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
  const simRecording = useAnimateStore((s) => s.simRecording)
  const setSimRecording = useAnimateStore((s) => s.setSimRecording)
  const simDiagnostics = useAnimateStore((s) => s.simDiagnostics)
  const lastCapturePath = useAnimateStore((s) => s.lastCapturePath)

  const chainJoints = useMemo(() => {
    const chain = flattenSkeleton(buildSkeletonTree(groups))
    if (chain.length <= 1) return [] as BodyGroup[]
    return chain.slice(1)
  }, [groups])

  return (
    <div className="flex flex-col gap-4 p-4 text-xs text-white/60">
      <p className="text-white/40 text-[10px] uppercase tracking-widest">Simulate — Phase A3 (zero-force solver)</p>

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
            onClick={() => setSimRecording(!simRecording)}
            className={cn(
              'flex-1 py-1.5 rounded-md transition-colors',
              simRecording
                ? 'bg-rose-600/40 text-rose-200 animate-pulse'
                : 'bg-white/10 text-white/70 hover:text-white'
            )}
          >
            {simRecording ? 'Stop' : 'Record'}
          </button>
        </div>
        {lastCapturePath ? (
          <p className="text-emerald-300/70 text-[10px] break-all font-mono">{lastCapturePath}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-white/40 text-[10px] uppercase tracking-widest">Diagnostics</p>
        <DiagnosticRow label="Kinetic energy" value={simDiagnostics.kineticEnergy.toExponential(2)} />
        <DiagnosticRow label="COM drift" value={simDiagnostics.comDriftFromStart.toExponential(2)} />
      </div>

      <div
        className={cn(
          'flex flex-col gap-4 transition-opacity',
          simRunning ? 'opacity-40 pointer-events-none' : 'opacity-100'
        )}
      >
      <div className="flex flex-col gap-3">
        <p className="text-white/40 text-[10px] uppercase tracking-widest">Root</p>
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
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Chain joints</p>
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
        <p className="text-white/40 text-[10px] leading-relaxed">
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

      <p className="leading-relaxed text-white/40 text-[10px]">
        Zero-force solver (Phase A3). Pose the body while paused, click Run, then Kick
        translation — it should drift in a straight line at constant speed with KE flat
        and no spin. Reset re-seeds from the current pose. See{' '}
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
