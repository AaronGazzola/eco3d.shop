'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { pickSimConfig, useAnimateStore } from './animateStore'
import { CalibrateTab } from './CalibrateTab'

function Info({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="info"
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-white/25 text-[8px] leading-none text-white/50 hover:border-white/50 hover:text-white/80"
        >
          i
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-50 text-[11px] leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function Toggle({
  label,
  tip,
  on,
  onChange,
  disabled,
}: {
  label: string
  tip: string
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Switch
        checked={on}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
      <span className="truncate text-sm text-white/75">{label}</span>
      <Info text={tip} />
    </div>
  )
}

function Slider({
  label,
  tip,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  tip: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-1 py-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[11px] text-white/70">{label}</span>
          <Info text={tip} />
        </div>
        <span className="font-mono text-[10px] text-white/60">{format(value)}</span>
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
    </div>
  )
}

function Segmented<T extends string>({
  label,
  tip,
  value,
  options,
  onChange,
}: {
  label: string
  tip: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[11px] text-white/70">{label}</span>
        <Info text={tip} />
      </div>
      <div className="flex gap-0.5 rounded-md bg-white/5 p-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              'rounded px-2 py-0.5 text-[10px] capitalize transition-colors',
              value === o ? 'bg-emerald-600/50 text-emerald-100' : 'text-white/50 hover:text-white'
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-white/55">{label}</span>
      <span className="font-mono text-white/70">{value}</span>
    </div>
  )
}

function Divider() {
  return <div className="my-1.5 border-t border-white/10" />
}

function SimulateTab() {
  const coupledRunning = useAnimateStore((s) => s.coupledRunning)
  const setCoupledRunning = useAnimateStore((s) => s.setCoupledRunning)
  const simRecording = useAnimateStore((s) => s.simRecording)
  const setSimRecording = useAnimateStore((s) => s.setSimRecording)
  const lastCapturePath = useAnimateStore((s) => s.lastCapturePath)
  const simDiagnostics = useAnimateStore((s) => s.simDiagnostics)

  const gravityEnabled = useAnimateStore((s) => s.gravityEnabled)
  const setGravityEnabled = useAnimateStore((s) => s.setGravityEnabled)
  const landLegsEnabled = useAnimateStore((s) => s.landLegsEnabled)
  const setLandLegsEnabled = useAnimateStore((s) => s.setLandLegsEnabled)
  const landGroundEnabled = useAnimateStore((s) => s.landGroundEnabled)
  const setLandGroundEnabled = useAnimateStore((s) => s.setLandGroundEnabled)
  const limbCpgEnabled = useAnimateStore((s) => s.limbCpgEnabled)
  const setLimbCpgEnabled = useAnimateStore((s) => s.setLimbCpgEnabled)
  const legsLocked = useAnimateStore((s) => s.legsLocked)
  const setLegsLocked = useAnimateStore((s) => s.setLegsLocked)
  const environmentEnabled = useAnimateStore((s) => s.environmentEnabled)
  const setEnvironmentEnabled = useAnimateStore((s) => s.setEnvironmentEnabled)

  const cpgDrive = useAnimateStore((s) => s.cpgDrive)
  const setCpgDrive = useAnimateStore((s) => s.setCpgDrive)
  const cpgExcitability = useAnimateStore((s) => s.cpgExcitability)
  const setCpgExcitability = useAnimateStore((s) => s.setCpgExcitability)

  const muscleAlpha = useAnimateStore((s) => s.muscleAlpha)
  const setMuscleAlpha = useAnimateStore((s) => s.setMuscleAlpha)
  const muscleBeta = useAnimateStore((s) => s.muscleBeta)
  const setMuscleBeta = useAnimateStore((s) => s.setMuscleBeta)
  const muscleDamping = useAnimateStore((s) => s.muscleDamping)
  const setMuscleDamping = useAnimateStore((s) => s.setMuscleDamping)

  const bodyFriction = useAnimateStore((s) => s.bodyFriction)
  const setBodyFriction = useAnimateStore((s) => s.setBodyFriction)

  const gripEnabled = useAnimateStore((s) => s.gripEnabled)
  const setGripEnabled = useAnimateStore((s) => s.setGripEnabled)
  const gripLegs = useAnimateStore((s) => s.gripLegs)
  const setGripLegs = useAnimateStore((s) => s.setGripLegs)
  const gripShift = useAnimateStore((s) => s.gripShift)
  const setGripShift = useAnimateStore((s) => s.setGripShift)
  const gripDuration = useAnimateStore((s) => s.gripDuration)
  const setGripDuration = useAnimateStore((s) => s.setGripDuration)
  const gripStrength = useAnimateStore((s) => s.gripStrength)
  const setGripStrength = useAnimateStore((s) => s.setGripStrength)
  const releaseFriction = useAnimateStore((s) => s.releaseFriction)
  const setReleaseFriction = useAnimateStore((s) => s.setReleaseFriction)
  const gripGlowEnabled = useAnimateStore((s) => s.gripGlowEnabled)
  const setGripGlowEnabled = useAnimateStore((s) => s.setGripGlowEnabled)
  const resetSimConfig = useAnimateStore((s) => s.resetSimConfig)

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    useAnimateStore.persist.rehydrate()
  }, [])

  const handleCopy = () => {
    const config = pickSimConfig(useAnimateStore.getState())
    navigator.clipboard
      .writeText(JSON.stringify(config, null, 2))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch((err) => console.error(err))
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-white/10 bg-[#333333] px-4 pt-4 pb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCoupledRunning(!coupledRunning)}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs transition-colors',
                coupledRunning ? 'bg-cyan-600/40 text-cyan-200' : 'bg-white/10 text-white/70 hover:text-white'
              )}
            >
              {coupledRunning ? 'Pause' : 'Run'}
            </button>
            <button
              type="button"
              onClick={() => setSimRecording(!simRecording)}
              disabled={!coupledRunning}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs transition-colors',
                simRecording
                  ? 'animate-pulse bg-rose-600/40 text-rose-200'
                  : 'bg-white/10 text-white/70 hover:text-white disabled:opacity-40 disabled:hover:text-white/70'
              )}
            >
              {simRecording ? 'Stop' : 'Record'}
            </button>
          </div>
          {lastCapturePath ? (
            <p className="break-all font-mono text-[10px] text-emerald-300/70">{lastCapturePath}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 px-4 pt-2 pb-4">

        <Toggle
          label="Gravity"
          tip="Pulls the whole body down (−9.81). Off = neutral buoyancy, like swimming in water."
          on={gravityEnabled}
          onChange={setGravityEnabled}
        />
        <Toggle
          label="Legs"
          tip="Build the four legs as real physics bodies that the trunk can stand on. Off = no legs; the body undulates alone."
          on={landLegsEnabled}
          onChange={setLandLegsEnabled}
        />
        <Toggle
          label="Ground"
          tip="Add the floor plane plus the foot and belly contact points. Off = no floor, nothing to rest on or push against."
          on={landGroundEnabled}
          onChange={setLandGroundEnabled}
        />
        <Toggle
          label="Limb CPG"
          tip="Add the four leg oscillators to the central pattern generator — the rhythm source that will drive the legs."
          on={limbCpgEnabled}
          onChange={setLimbCpgEnabled}
        />
        <Toggle
          label="Lock legs"
          tip="Hold each hip stiff at its rest angle (rigid struts). Off = hips go free so the legs hang and are dragged passively by the body."
          on={legsLocked}
          onChange={setLegsLocked}
        />
        <Toggle
          label="Drag"
          tip="Anisotropic swimming drag — resists sideways motion more than forward, turning the body wave into forward thrust."
          on={environmentEnabled}
          onChange={setEnvironmentEnabled}
        />

        <Divider />

        <Slider
          label="Drive"
          tip="CPG drive — overall activation level. Higher = a faster, stronger body wave."
          value={cpgDrive}
          min={0}
          max={3}
          step={0.01}
          onChange={setCpgDrive}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Excitability"
          tip="CPG excitability — scales how strongly drive raises the undulation frequency."
          value={cpgExcitability}
          min={0}
          max={2}
          step={0.01}
          onChange={setCpgExcitability}
          format={(v) => v.toFixed(2)}
        />

        <Divider />

        <Slider
          label="Muscle α"
          tip="Ekeberg active gain — how hard the muscles bend each joint toward the target angle."
          value={muscleAlpha}
          min={0}
          max={5}
          step={0.05}
          onChange={setMuscleAlpha}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Muscle β"
          tip="Ekeberg passive stiffness — pulls each joint back toward straight (resting shape)."
          value={muscleBeta}
          min={0}
          max={20}
          step={0.1}
          onChange={setMuscleBeta}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Muscle δ"
          tip="Joint motor damping — resists fast joint motion to keep the simulation stable."
          value={muscleDamping}
          min={0}
          max={20}
          step={0.05}
          onChange={setMuscleDamping}
          format={(v) => v.toFixed(2)}
        />

        <Divider />

        <Slider
          label="Body friction"
          tip="Trunk and belly contact friction. Low = the belly slides so the body wave isn't pinned to the floor."
          value={bodyFriction}
          min={0}
          max={1}
          step={0.05}
          onChange={setBodyFriction}
          format={(v) => v.toFixed(2)}
        />

        <Divider />

        <Toggle
          label="Grip"
          tip="Phase-gated foot traction: each foot takes high friction during its stance window and slides the rest of the cycle, so the backward stroke pushes the body forward."
          on={gripEnabled}
          onChange={setGripEnabled}
        />
        {gripEnabled && (
          <>
            <Segmented
              label="Grip legs"
              tip="Which legs grip the floor: the front pair, the back pair, or all four."
              value={gripLegs}
              options={['front', 'back', 'both'] as const}
              onChange={setGripLegs}
            />
            <Slider
              label="Grip start"
              tip="Where in each leg's CPG cycle the foot begins gripping."
              value={gripShift}
              min={0}
              max={1}
              step={0.01}
              onChange={setGripShift}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="Grip duration"
              tip="What fraction of the cycle each foot stays gripped (the window width)."
              value={gripDuration}
              min={0}
              max={1}
              step={0.01}
              onChange={setGripDuration}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="Grip strength"
              tip="The foot's friction during its stance window — the stance traction. 0 = no grip (timing/glow only); higher = more forward pull."
              value={gripStrength}
              min={0}
              max={1}
              step={0.05}
              onChange={setGripStrength}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Release friction"
              tip="Foot friction while NOT gripping. Lower = the foot slides freely between grips."
              value={releaseFriction}
              min={0}
              max={1}
              step={0.05}
              onChange={setReleaseFriction}
              format={(v) => v.toFixed(2)}
            />
            <Toggle
              label="Foot glow"
              tip="Light up each foot while it is inside its grip window — a visual debug of grip timing."
              on={gripGlowEnabled}
              onChange={setGripGlowEnabled}
            />
          </>
        )}

        <Divider />

        <DiagnosticRow label="Kinetic energy" value={simDiagnostics.kineticEnergy.toExponential(2)} />
        <DiagnosticRow label="COM drift (forward)" value={simDiagnostics.comDriftFromStart.toExponential(2)} />
        <DiagnosticRow label="Max joint / cap" value={`${(simDiagnostics.maxJointFracOfCap * 100).toFixed(0)}%`} />
        <DiagnosticRow label="comY (float)" value={simDiagnostics.comYDrift.toFixed(3)} />
        <DiagnosticRow label="Max tilt (off-plane)" value={`${simDiagnostics.maxTiltDeg.toFixed(1)}°`} />

          <Divider />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => resetSimConfig()}
              className="flex-1 rounded-md bg-white/10 py-1.5 text-xs text-white/70 transition-colors hover:text-white"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 rounded-md bg-white/10 py-1.5 text-xs text-white/70 transition-colors hover:text-white"
            >
              {copied ? 'Copied!' : 'Copy config'}
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
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
