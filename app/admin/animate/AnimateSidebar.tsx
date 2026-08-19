'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { pickSimConfig, useAnimateStore, buildConfigLink, EMBED_PATH } from './animateStore'
import { useSharedStore } from '../_lib/sharedStore'
import { presetsForEngine, findSimPreset, applyPreset } from './simPresets'
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
  const frontDrive = useAnimateStore((s) => s.frontDrive)
  const setFrontDrive = useAnimateStore((s) => s.setFrontDrive)
  const frontSegments = useAnimateStore((s) => s.frontSegments)
  const setFrontSegments = useAnimateStore((s) => s.setFrontSegments)
  const turnBias = useAnimateStore((s) => s.turnBias)
  const setTurnBias = useAnimateStore((s) => s.setTurnBias)
  const limbDrive = useAnimateStore((s) => s.limbDrive)
  const setLimbDrive = useAnimateStore((s) => s.setLimbDrive)
  const feedbackIpsi = useAnimateStore((s) => s.feedbackIpsi)
  const setFeedbackIpsi = useAnimateStore((s) => s.setFeedbackIpsi)
  const feedbackContra = useAnimateStore((s) => s.feedbackContra)
  const setFeedbackContra = useAnimateStore((s) => s.setFeedbackContra)

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

  const simEngine = useAnimateStore((s) => s.simEngine)
  const setSimEngine = useAnimateStore((s) => s.setSimEngine)

  const stepEnabled = useAnimateStore((s) => s.stepEnabled)
  const setStepEnabled = useAnimateStore((s) => s.setStepEnabled)
  const stepFeet = useAnimateStore((s) => s.stepFeet)
  const setStepFoot = useAnimateStore((s) => s.setStepFoot)
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
  const footThrustEnabled = useAnimateStore((s) => s.footThrustEnabled)
  const setFootThrustEnabled = useAnimateStore((s) => s.setFootThrustEnabled)
  const footThrustGain = useAnimateStore((s) => s.footThrustGain)
  const setFootThrustGain = useAnimateStore((s) => s.setFootThrustGain)
  const footThrustShift = useAnimateStore((s) => s.footThrustShift)
  const footThrustShiftHind = useAnimateStore((s) => s.footThrustShiftHind)
  const setFootThrustShiftHind = useAnimateStore((s) => s.setFootThrustShiftHind)
  const setFootThrustShift = useAnimateStore((s) => s.setFootThrustShift)
  const waveNose = useAnimateStore((s) => s.waveNose)
  const setWaveNose = useAnimateStore((s) => s.setWaveNose)
  const waveShoulder = useAnimateStore((s) => s.waveShoulder)
  const setWaveShoulder = useAnimateStore((s) => s.setWaveShoulder)
  const waveHip = useAnimateStore((s) => s.waveHip)
  const setWaveHip = useAnimateStore((s) => s.setWaveHip)
  const waveTailMid = useAnimateStore((s) => s.waveTailMid)
  const setWaveTailMid = useAnimateStore((s) => s.setWaveTailMid)
  const waveTailTip = useAnimateStore((s) => s.waveTailTip)
  const setWaveTailTip = useAnimateStore((s) => s.setWaveTailTip)
  const headIsolated = useAnimateStore((s) => s.headIsolated)
  const setHeadIsolated = useAnimateStore((s) => s.setHeadIsolated)
  const plantHoldEnabled = useAnimateStore((s) => s.plantHoldEnabled)
  const setPlantHoldEnabled = useAnimateStore((s) => s.setPlantHoldEnabled)
  const plantHoldGain = useAnimateStore((s) => s.plantHoldGain)
  const setPlantHoldGain = useAnimateStore((s) => s.setPlantHoldGain)
  const gravityY = useAnimateStore((s) => s.gravityY)
  const setGravityY = useAnimateStore((s) => s.setGravityY)
  const tankEnabled = useAnimateStore((s) => s.tankEnabled)
  const setTankEnabled = useAnimateStore((s) => s.setTankEnabled)
  const tankWidth = useAnimateStore((s) => s.tankWidth)
  const setTankWidth = useAnimateStore((s) => s.setTankWidth)
  const tankHeight = useAnimateStore((s) => s.tankHeight)
  const setTankHeight = useAnimateStore((s) => s.setTankHeight)
  const tankDepth = useAnimateStore((s) => s.tankDepth)
  const roamMargin = useAnimateStore((s) => s.roamMargin)
  const setRoamMargin = useAnimateStore((s) => s.setRoamMargin)
  const roamGain = useAnimateStore((s) => s.roamGain)
  const setRoamGain = useAnimateStore((s) => s.setRoamGain)
  const roamDamping = useAnimateStore((s) => s.roamDamping)
  const setRoamDamping = useAnimateStore((s) => s.setRoamDamping)
  const roamHeadingAxisWeight = useAnimateStore((s) => s.roamHeadingAxisWeight)
  const setRoamHeadingAxisWeight = useAnimateStore((s) => s.setRoamHeadingAxisWeight)
  const setTankDepth = useAnimateStore((s) => s.setTankDepth)

  const resetSimConfig = useAnimateStore((s) => s.resetSimConfig)

  const frozen = useAnimateStore((s) => s.frozen)
  const setFrozen = useAnimateStore((s) => s.setFrozen)
  const playSpeed = useAnimateStore((s) => s.playSpeed)
  const setPlaySpeed = useAnimateStore((s) => s.setPlaySpeed)
  const requestStep = useAnimateStore((s) => s.requestStep)
  const simTime = useAnimateStore((s) => s.simTime)
  const overlays = useAnimateStore((s) => s.overlays)
  const toggleOverlay = useAnimateStore((s) => s.toggleOverlay)
  const isolateLimb = useAnimateStore((s) => s.isolateLimb)
  const setIsolateLimb = useAnimateStore((s) => s.setIsolateLimb)

  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [overlayLinkCopied, setOverlayLinkCopied] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')
  const configId = useSharedStore((s) => s.configId)

  // Hydration is owned by useConfigLink in page.tsx (rehydrate → then apply the link on top). Doing it
  // here too would re-run after the link applied and clobber the link's config with the saved one.

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

  const enginePresets = presetsForEngine(simEngine)

  const handleSelectPreset = (name: string) => {
    setSelectedPreset(name)
    const preset = findSimPreset(name, simEngine)
    if (!preset) return
    applyPreset(preset)
  }

  // Presets are scoped to the engine, so switching engines invalidates the current selection.
  const handleSelectEngine = (e: typeof simEngine) => {
    setSimEngine(e)
    setSelectedPreset('')
  }

  const isMujoco = simEngine === 'mujoco'

  const copyLink = (path: string | undefined, mark: (v: boolean) => void) => {
    navigator.clipboard
      .writeText(buildConfigLink(path))
      .then(() => {
        mark(true)
        setTimeout(() => mark(false), 1500)
      })
      .catch((err) => console.error(err))
  }

  const handleCopyLink = () => copyLink(undefined, setLinkCopied)
  const handleCopyOverlayLink = () => copyLink(EMBED_PATH, setOverlayLinkCopied)

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
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-white/55">Engine</span>
            <div className="flex flex-1 gap-1">
              {(['rapier', 'mujoco'] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handleSelectEngine(e)}
                  className={cn(
                    'flex-1 rounded px-2 py-1 text-[11px] transition-colors',
                    simEngine === e ? 'bg-cyan-600/40 text-cyan-200' : 'bg-white/10 text-white/60 hover:text-white'
                  )}
                >
                  {e === 'rapier' ? 'Rapier' : 'MuJoCo'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-white/55">Preset</span>
            <select
              value={selectedPreset}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/80 focus:border-violet-500/60 focus:outline-none"
            >
              <option value="">Select a config…</option>
              {enginePresets.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {lastCapturePath ? (
            <p className="break-all font-mono text-[10px] text-emerald-300/70">{lastCapturePath}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 px-4 pt-2 pb-4">

        <div className="flex items-center justify-between gap-2 py-0.5">
          <span className="text-[11px] text-white/70">Playback</span>
          <span className="font-mono text-[10px] text-white/60">
            {frozen ? 'frozen' : `${playSpeed.toFixed(2)}x`} · t={simTime.toFixed(2)}s
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFrozen(!frozen)}
            disabled={!coupledRunning}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs transition-colors disabled:opacity-40',
              frozen ? 'bg-amber-600/40 text-amber-200' : 'bg-white/10 text-white/70 hover:text-white'
            )}
          >
            {frozen ? 'Play' : 'Freeze'}
          </button>
          <button
            type="button"
            onClick={() => { setFrozen(true); requestStep(1) }}
            disabled={!coupledRunning}
            className="flex-1 rounded-md bg-white/10 py-1.5 text-xs text-white/70 transition-colors hover:text-white disabled:opacity-40"
          >
            Step +1
          </button>
        </div>
        <Slider
          label="Speed"
          tip="Slow-motion playback multiplier (0.1x–1x). Scales how fast wall-time feeds the fixed-step sim. 1x = real-time."
          value={playSpeed}
          min={0.1}
          max={1}
          step={0.05}
          onChange={setPlaySpeed}
          format={(v) => `${v.toFixed(2)}x`}
        />
        <div className="flex items-center justify-between gap-2 py-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[11px] text-white/70">Overlays</span>
            <Info text="Read-only visual overlays for isolating the gait. wave = body-wave phase + max-forward reach markers; stance = legs green (grip/power-stroke) / red (swing). Rendered in Increment B." />
          </div>
          <div className="flex gap-0.5">
            {(['wave', 'stance'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => toggleOverlay(o)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] transition-colors',
                  overlays.includes(o) ? 'bg-violet-600/50 text-violet-100' : 'bg-white/5 text-white/40 hover:text-white'
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 py-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[11px] text-white/70">Isolate limb</span>
            <Info text="Dim everything except one limb to inspect it alone. Rendered in Increment B." />
          </div>
          <select
            value={isolateLimb ?? ''}
            onChange={(e) => setIsolateLimb(e.target.value || null)}
            className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/80 focus:border-violet-500/60 focus:outline-none"
          >
            <option value="">none</option>
            {(['FL', 'FR', 'BL', 'BR'] as const).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {!isMujoco && (
          <>
        <Divider />

        <Toggle
          label="Gravity"
          tip="Pulls the whole body down (−9.81). Off = neutral buoyancy, like swimming in water."
          on={gravityEnabled}
          onChange={setGravityEnabled}
        />
        <Toggle
          label="Isolate spine"
          tip="One-click axial isolation: turns Legs AND Limb CPG off together so the spine produces a single continuous undulation with no limb oscillators coupling into it — the pure core CPG wave. Turn off to restore both."
          on={!landLegsEnabled && !limbCpgEnabled}
          onChange={(v) => {
            setLandLegsEnabled(!v)
            setLimbCpgEnabled(!v)
          }}
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
          </>
        )}

        <Toggle
          label="Drag"
          tip="Anisotropic swimming drag — resists sideways motion more than forward, turning the body wave into forward thrust. Works under MuJoCo too (per-segment resistive force)."
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
        <Slider
          label="Front segments"
          tip="Differential drive (paper's forward-stepping): how many rostral-most spine segments get the lower Front drive instead of the global Drive. 0 = off (whole body on one drive)."
          value={frontSegments}
          min={0}
          max={10}
          step={1}
          onChange={setFrontSegments}
          format={(v) => v.toFixed(0)}
        />
        <Slider
          label="Front drive"
          tip="Drive sent to the front segments when Front segments > 0. Lower than Drive tunes the body wave (paper uses ~0.6 front vs ~1.0 body)."
          value={frontDrive}
          min={0}
          max={3}
          step={0.01}
          onChange={setFrontDrive}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Turn bias"
          tip="Paper's left/right differential CPG drive (turning). Positive weakens the left side (axial + limbs) and the body curves to its own left; negative curves it right; 0 = off (straight)."
          value={turnBias}
          min={-1}
          max={1}
          step={0.01}
          onChange={setTurnBias}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Limb drive"
          tip="Paper Fig 6B: an independent, usually LOWER drive for the four limb oscillators (they used 0.63 vs axial 0.98). Keeping limbs slow + active (below their d_th=1.27) lets the limb→axial coupling impose a STANDING wave for walking. 0 = off (limbs follow the global Drive)."
          value={limbDrive}
          min={0}
          max={3}
          step={0.01}
          onChange={setLimbDrive}
          format={(v) => (v > 0 ? v.toFixed(2) : 'off')}
        />
        <Slider
          label="Feedback ipsi"
          tip="Paper Fig 6C: axial proprioceptive (stretch-receptor) feedback weight, ipsilateral. The actual body curvature is fed back into the CPG to entrain it to the body — the second standing-wave mechanism. Paper's standing setting: ipsi −0.65, contra +0.65. 0 = off."
          value={feedbackIpsi}
          min={-2}
          max={2}
          step={0.05}
          onChange={setFeedbackIpsi}
          format={(v) => (v !== 0 ? v.toFixed(2) : 'off')}
        />
        <Slider
          label="Feedback contra"
          tip="Paper Fig 6C: axial proprioceptive feedback weight, contralateral. Paper used w_ipsi = −w_contra = −0.65 for standing waves (so contra = +0.65). 0 = off."
          value={feedbackContra}
          min={-2}
          max={2}
          step={0.05}
          onChange={setFeedbackContra}
          format={(v) => (v !== 0 ? v.toFixed(2) : 'off')}
        />

        <Divider />

        <Slider
          label="Muscle α"
          tip="Ekeberg active gain — how hard the muscles bend each joint toward the target angle. Higher than the original ~5 is often needed for vigorous swim (tuning sweep peaked around 18–42)."
          value={muscleAlpha}
          min={0}
          max={50}
          step={0.1}
          onChange={setMuscleAlpha}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Muscle β"
          tip="Ekeberg passive stiffness — pulls each joint back toward straight (resting shape). Sweep showed 18–35 is the productive range for swim."
          value={muscleBeta}
          min={0}
          max={50}
          step={0.1}
          onChange={setMuscleBeta}
          format={(v) => v.toFixed(2)}
        />
        {!isMujoco && (
          <Slider
            label="Muscle δ"
            tip="Joint motor damping — resists fast joint motion. Higher δ trades a little speed for cleaner heading (less drift)."
            value={muscleDamping}
            min={0}
            max={40}
            step={0.1}
            onChange={setMuscleDamping}
            format={(v) => v.toFixed(2)}
          />
        )}
        {!isMujoco && (
          <>
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
          </>
        )}

        <Divider />

        <Toggle
          label="Step"
          tip="Actively drive the legs: each hip sweeps the leg back during stance (the grip window) and forward + up during swing, synced to the same phase as grip. Off = legs hold at rest."
          on={stepEnabled}
          onChange={setStepEnabled}
        />
        {stepEnabled && (
          <>
            <div className="flex items-start justify-between gap-2 py-0.5">
              <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
                <span className="truncate text-[11px] text-white/70">Sweep feet</span>
                <Info text="Toggle sweep per foot (front/back × left/right). A foot turned off holds perpendicular (no fore/aft swing) — use to isolate one leg." />
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {(['FL', 'FR', 'BL', 'BR'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStepFoot(f, !stepFeet[f])}
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] transition-colors',
                      stepFeet[f] ? 'bg-emerald-600/50 text-emerald-100' : 'bg-white/5 text-white/40 hover:text-white'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
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
              tip="Gain of the fore/aft leg servo — how firmly the leg holds/reaches its commanded sweep angle. Under MuJoCo this is the sweep hip actuator's kp (rigid-peg stiffness); mass-independent, servo-like."
              value={sweepSpeed}
              min={0}
              max={200000}
              step={1000}
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
              tip="Gain of the up/down (lift) leg servo — how firmly the leg holds its angle against the body's weight. Under MuJoCo this is the lift hip actuator's kp (rigid-peg stiffness). The anti-sag / anti-floppy knob."
              value={legStiffness}
              min={0}
              max={200000}
              step={1000}
              onChange={setLegStiffness}
              format={(v) => v.toFixed(0)}
            />
            <Slider
              label="Leg damping"
              tip="Damping (kv) on both hip servos — settles wobble so the leg tracks its angle rigidly instead of springing. For a firm, non-springy hold use roughly 2×√(stiffness)."
              value={legDamping}
              min={0}
              max={2000}
              step={10}
              onChange={setLegDamping}
              format={(v) => v.toFixed(0)}
            />
          </>
        )}

        <Divider />

        <Toggle
          label="Foot thrust"
          tip="Each foot pushes BACKWARD along its own hip's forward axis while it sweeps back, in proportion to how fast it sweeps. A force, not a pin — it removes no joint freedom, so the body wave is untouched. This replaces the retired grip."
          on={footThrustEnabled}
          onChange={setFootThrustEnabled}
        />
        <Slider
          label="Thrust gain"
          tip="Peak push per foot at mid back-stroke, in newtons. Positive drives the body forward; NEGATIVE brakes, which is the only way this body can stop quickly — drag alone takes over 12 seconds."
          value={footThrustGain}
          min={-40}
          max={40}
          step={0.5}
          onChange={setFootThrustGain}
          format={(v) => v.toFixed(1)}
        />
        <Slider
          label="Thrust start (front)"
          tip="Where in the front legs' CPG cycle the back stroke begins. The push is zero across the whole forward stroke and peaks half way through the back stroke."
          value={footThrustShift}
          min={0}
          max={1}
          step={0.01}
          onChange={setFootThrustShift}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Thrust start (hind)"
          tip="The same for the hind legs, which need their own value: at any given CPG phase the front feet are at maximum forward reach while the hind feet are at maximum backward, half a cycle apart. Sharing one value makes the hind legs push while sweeping forward."
          value={footThrustShiftHind}
          min={0}
          max={1}
          step={0.01}
          onChange={setFootThrustShiftHind}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <Toggle
          label="Plant hold"
          tip="Moves the whole body each step so the feet whose plant window is open stay on the floor spots they were standing on when the window opened. The legs stay rigid and never sweep. Several planted feet can only be held on average, because a rigid leg welds its foot to the body. MuJoCo only."
          on={plantHoldEnabled}
          onChange={setPlantHoldEnabled}
        />
        <Slider
          label="Plant hold · strength"
          tip="How much of the measured foot error is corrected each step. Low values pull the body toward the correction, 1.0 snaps it there and tends to buzz against the velocity the solver just integrated."
          value={plantHoldGain}
          min={0}
          max={1}
          step={0.05}
          onChange={setPlantHoldGain}
          format={(v) => v.toFixed(2)}
        />

        <Divider />

        <Slider
          label="Gravity"
          tip="The downward pull on the whole body. Zero is flight: the creature floats and the body wave alone moves it, pushing against the water-like drag exactly as it does when swimming. Changing this rebuilds the physics model, so the run restarts."
          value={gravityY}
          min={-9.81}
          max={0}
          step={0.01}
          onChange={setGravityY}
          format={(v) => (v === 0 ? 'off' : v.toFixed(2))}
        />
        <Toggle
          label="Tank"
          tip="Encloses the creature in a box instead of standing it on an endless floor. Needed with gravity off, because nothing else stops a floating body drifting away for ever. The creature bounces off a wall the same way it would bounce off anything else — there is no special case for walls. Rebuilds the physics model."
          on={tankEnabled}
          onChange={setTankEnabled}
        />
        <Slider
          label="Tank · width"
          tip="How far the tank reaches across, along the direction the creature faces at rest. The body is about 17.8 units nose to tail, so this is roughly how many body lengths of room there are to travel."
          value={tankWidth}
          min={20}
          max={200}
          step={1}
          onChange={setTankWidth}
          format={(v) => v.toFixed(0)}
        />
        <Slider
          label="Tank · height"
          tip="How far the tank reaches upward from the floor the creature would otherwise stand on."
          value={tankHeight}
          min={10}
          max={120}
          step={1}
          onChange={setTankHeight}
          format={(v) => v.toFixed(0)}
        />
        <Slider
          label="Tank · depth"
          tip="How far the tank reaches toward and away from the viewer. This is the direction that reads as distance on the overlay, where a creature further away is drawn smaller."
          value={tankDepth}
          min={10}
          max={200}
          step={1}
          onChange={setTankDepth}
          format={(v) => v.toFixed(0)}
        />

        <Divider />

        <Slider
          label="Roam · heading source"
          tip="Which direction the steering believes the creature is going. 0 reads the direction it has TRAVELLED, averaged over 2.5 s, which is honest about motion but lags a turn by that window. 1 reads the direction the body POINTS, fitted across the whole trunk, which responds at once but says nothing about sideways slip. In between blends the two."
          value={roamHeadingAxisWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={setRoamHeadingAxisWeight}
          format={(v) => (v === 0 ? 'travel' : v === 1 ? 'body axis' : v.toFixed(2))}
        />
        <Slider
          label="Roam · margin"
          tip="How close to a side wall the creature must be, in world units, before it starts turning away. 0 switches roaming off. A margin larger than the tank's half-depth means the controller never releases, which is what makes it steer constantly."
          value={roamMargin}
          min={0}
          max={60}
          step={1}
          onChange={setRoamMargin}
          format={(v) => (v === 0 ? 'off' : v.toFixed(0))}
        />
        <Slider
          label="Roam · gain"
          tip="How hard the creature turns once inside the margin. Also the ceiling on the steering signal: the ramp and the heading error are each at most 1, so a gain above 1 can reach the hard stop."
          value={roamGain}
          min={0}
          max={2}
          step={0.05}
          onChange={setRoamGain}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Roam · damping"
          tip="Opposes the turn in proportion to how fast the creature is already turning, to stop it overshooting the centre and settling into a circle. The turn rate behind it is measured across a single physics step, so this saturates readily."
          value={roamDamping}
          min={0}
          max={2}
          step={0.05}
          onChange={setRoamDamping}
          format={(v) => (v === 0 ? 'off' : v.toFixed(2))}
        />

        <Divider />

        <Toggle
          label="Isolate head"
          tip="Excludes the head from the body wave outright, so it stops adding a swing of its own. It does NOT hold the head steady in the world — the head is held straight relative to the neck, and the neck still waves. Aiming the head at a target comes later."
          on={headIsolated}
          onChange={setHeadIsolated}
        />
        <Slider
          label="Wave · nose (0%)"
          tip="Drive multiplier at the tip of the nose. The five wave sliders set the amplitude profile along the spine and are blended smoothly between. 1.0 everywhere is the unshaped wave."
          value={waveNose}
          min={0}
          max={2}
          step={0.05}
          onChange={setWaveNose}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Wave · shoulder (25%)"
          tip="Drive multiplier a quarter of the way down the body, which on this rig sits almost exactly on the front girdle. Set against the hip slider to make the two girdles rotate by the same amount."
          value={waveShoulder}
          min={0}
          max={2}
          step={0.05}
          onChange={setWaveShoulder}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Wave · hip (50%)"
          tip="Drive multiplier half way down the body, which on this rig sits almost exactly on the hind girdle."
          value={waveHip}
          min={0}
          max={2}
          step={0.05}
          onChange={setWaveHip}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Wave · mid-tail (75%)"
          tip="Drive multiplier three quarters of the way down the body. Half this rig's length lies behind the hind girdle, so both tail sliders act on tail."
          value={waveTailMid}
          min={0}
          max={2}
          step={0.05}
          onChange={setWaveTailMid}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Wave · tail tip (100%)"
          tip="Drive multiplier at the very end of the tail. The tail swings furthest, so this is usually the first slider to come down when evening out the wave."
          value={waveTailTip}
          min={0}
          max={2}
          step={0.05}
          onChange={setWaveTailTip}
          format={(v) => v.toFixed(2)}
        />

        <Divider />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { resetSimConfig(); setSelectedPreset('') }}
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
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 rounded-md bg-white/10 py-1.5 text-xs text-white/70 transition-colors hover:text-white"
            >
              {linkCopied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleCopyOverlayLink}
            disabled={!configId}
            className="mt-2 w-full rounded-md bg-white/10 py-1.5 text-xs text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:text-white/25"
          >
            {overlayLinkCopied ? 'Copied!' : 'Copy overlay link'}
          </button>
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
