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

function Divider() {
  return <div className="my-1.5 border-t border-white/10" />
}

function SimulateTab() {
  const coupledRunning = useAnimateStore((s) => s.coupledRunning)
  const setCoupledRunning = useAnimateStore((s) => s.setCoupledRunning)
  const simRecording = useAnimateStore((s) => s.simRecording)
  const setSimRecording = useAnimateStore((s) => s.setSimRecording)
  const lastCapturePath = useAnimateStore((s) => s.lastCapturePath)

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
  const legFriction = useAnimateStore((s) => s.legFriction)
  const setLegFriction = useAnimateStore((s) => s.setLegFriction)

  const gripEnabled = useAnimateStore((s) => s.gripEnabled)
  const setGripEnabled = useAnimateStore((s) => s.setGripEnabled)
  const gripFeet = useAnimateStore((s) => s.gripFeet)
  const setGripFoot = useAnimateStore((s) => s.setGripFoot)
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

  const stepEnabled = useAnimateStore((s) => s.stepEnabled)
  const setStepEnabled = useAnimateStore((s) => s.setStepEnabled)
  const sweepAmount = useAnimateStore((s) => s.sweepAmount)
  const setSweepAmount = useAnimateStore((s) => s.setSweepAmount)
  const sweepSpeed = useAnimateStore((s) => s.sweepSpeed)
  const setSweepSpeed = useAnimateStore((s) => s.setSweepSpeed)
  const liftAmount = useAnimateStore((s) => s.liftAmount)
  const setLiftAmount = useAnimateStore((s) => s.setLiftAmount)
  const legStiffness = useAnimateStore((s) => s.legStiffness)
  const setLegStiffness = useAnimateStore((s) => s.setLegStiffness)
  const legDamping = useAnimateStore((s) => s.legDamping)
  const setLegDamping = useAnimateStore((s) => s.setLegDamping)

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
        <Slider
          label="Leg friction"
          tip="Foot contact friction while a foot is gripping — the traction the grip pulls the body forward with."
          value={legFriction}
          min={0}
          max={1}
          step={0.05}
          onChange={setLegFriction}
          format={(v) => v.toFixed(2)}
        />

        <Divider />

        <Toggle
          label="Step"
          tip="Actively drive the legs: each hip sweeps the leg back during stance (the grip window) and forward + up during swing, synced to the same phase as grip. Off = legs hold at rest."
          on={stepEnabled}
          onChange={setStepEnabled}
        />
        {stepEnabled && (
          <>
            <Slider
              label="Sweep amount"
              tip="How far each leg swings fore/aft, as a fraction of the leg's calibrated angle caps (1 = full forward/back range). Stays within the caps."
              value={sweepAmount}
              min={0}
              max={1}
              step={0.05}
              onChange={setSweepAmount}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="Sweep speed"
              tip="Gain of the fore/aft motor — how firmly the leg holds/reaches its commanded sweep angle (mass-independent, servo-like). Higher = stiffer, snappier."
              value={sweepSpeed}
              min={0}
              max={10000}
              step={100}
              onChange={setSweepSpeed}
              format={(v) => v.toFixed(0)}
            />
            <Slider
              label="Lift amount"
              tip="How high the foot raises off the ground during swing (clearance)."
              value={liftAmount}
              min={0}
              max={1.5}
              step={0.05}
              onChange={setLiftAmount}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Leg stiffness"
              tip="Gain of the up/down (lift) motor — how firmly the leg holds its angle against the body's weight (mass-independent, servo-like). The anti-sag knob."
              value={legStiffness}
              min={0}
              max={10000}
              step={100}
              onChange={setLegStiffness}
              format={(v) => v.toFixed(0)}
            />
            <Slider
              label="Leg damping"
              tip="Damping on both hip motors — settles oscillation. For a firm, non-springy hold use roughly 2×√(stiffness)."
              value={legDamping}
              min={0}
              max={500}
              step={10}
              onChange={setLegDamping}
              format={(v) => v.toFixed(0)}
            />
          </>
        )}

        <Divider />

        <Toggle
          label="Grip"
          tip="Each foot pins to the floor during its window of the gait cycle, levering the body forward over the planted foot."
          on={gripEnabled}
          onChange={setGripEnabled}
        />
        {gripEnabled && (
          <>
            <div className="flex items-start justify-between gap-2 py-0.5">
              <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
                <span className="truncate text-[11px] text-white/70">Grip feet</span>
                <Info text="Toggle grip per foot (front/back × left/right). A foot turned off still shows its glow timing but doesn't grip." />
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {(['FL', 'FR', 'BL', 'BR'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setGripFoot(f, !gripFeet[f])}
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] transition-colors',
                      gripFeet[f] ? 'bg-emerald-600/50 text-emerald-100' : 'bg-white/5 text-white/40 hover:text-white'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
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
              tip="0 = timing and glow run but the foot never physically plants. Above 0 = the foot plants and pulls."
              value={gripStrength}
              min={0}
              max={1}
              step={0.01}
              onChange={setGripStrength}
              format={(v) => `${Math.round(v * 100)}%`}
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
