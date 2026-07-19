'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { pickSimConfig, useAnimateStore, encodeSimConfig, SimConfig } from './animateStore'
import { presetsForEngine, findSimPreset } from './simPresets'
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

  const gripEnabled = useAnimateStore((s) => s.gripEnabled)
  const setGripEnabled = useAnimateStore((s) => s.setGripEnabled)
  const simEngine = useAnimateStore((s) => s.simEngine)
  const setSimEngine = useAnimateStore((s) => s.setSimEngine)
  const gripFeet = useAnimateStore((s) => s.gripFeet)
  const setGripFoot = useAnimateStore((s) => s.setGripFoot)
  const gripShift = useAnimateStore((s) => s.gripShift)
  const setGripShift = useAnimateStore((s) => s.setGripShift)
  const gripDuration = useAnimateStore((s) => s.gripDuration)
  const setGripDuration = useAnimateStore((s) => s.setGripDuration)
  const gripSoftness = useAnimateStore((s) => s.gripSoftness)
  const setGripSoftness = useAnimateStore((s) => s.setGripSoftness)
  const girdleBoost = useAnimateStore((s) => s.girdleBoost)
  const setGirdleBoost = useAnimateStore((s) => s.setGirdleBoost)
  const releaseFriction = useAnimateStore((s) => s.releaseFriction)
  const setReleaseFriction = useAnimateStore((s) => s.setReleaseFriction)
  const gripGlowEnabled = useAnimateStore((s) => s.gripGlowEnabled)
  const setGripGlowEnabled = useAnimateStore((s) => s.setGripGlowEnabled)
  const gripSlideAxis = useAnimateStore((s) => s.gripSlideAxis)
  const setGripSlideAxis = useAnimateStore((s) => s.setGripSlideAxis)

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

  const resetSimConfig = useAnimateStore((s) => s.resetSimConfig)
  const applySimConfig = useAnimateStore((s) => s.applySimConfig)

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
  const [selectedPreset, setSelectedPreset] = useState('')

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
    if (preset) applySimConfig({ ...preset.config, simEngine: preset.engine })
  }

  // Presets are scoped to the engine, so switching engines invalidates the current selection.
  const handleSelectEngine = (e: typeof simEngine) => {
    setSimEngine(e)
    setSelectedPreset('')
  }

  const isMujoco = simEngine === 'mujoco'

  const handleCopyLink = () => {
    const st = useAnimateStore.getState()
    const params = new URLSearchParams()
    params.set('tab', st.animateTab)
    params.set('sim', encodeSimConfig(pickSimConfig(st as unknown as SimConfig)))
    if (st.overlays.length > 0) params.set('overlay', st.overlays.join(','))
    const base = window.location.origin + window.location.pathname
    navigator.clipboard
      .writeText(`${base}#${params.toString()}`)
      .then(() => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 1500)
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
          {selectedPreset ? (
            <p className="text-[10px] leading-snug text-white/45">{findSimPreset(selectedPreset, simEngine)?.description}</p>
          ) : null}
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
          label="Grip"
          tip="When on, each foot pins to the floor during its window of the gait cycle, levering the body forward over the planted foot. Off = the timing and glow still run (so the window can be tuned and watched) but no foot plants."
          on={gripEnabled}
          onChange={setGripEnabled}
        />
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
        {isMujoco && (
          <Slider
            label="Grip softness"
            tip="Compliance of the planted-foot pin. 0 = rigid pin (rings against stiff legs); higher relaxes the pin into a spring-damper to smooth the buzz."
            value={gripSoftness}
            min={0}
            max={1}
            step={0.05}
            onChange={setGripSoftness}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        )}
        {isMujoco && (
          <Slider
            label="Girdle force boost"
            tip="Extra spine-servo gain at the leg-bearing (girdle) joints and their neighbours, so the wave holds its amplitude against the grip load instead of being robbed by it. 0 = uniform."
            value={girdleBoost}
            min={0}
            max={6}
            step={0.5}
            onChange={setGirdleBoost}
            format={(v) => `${v.toFixed(1)}×`}
          />
        )}
        {!isMujoco && (
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
        )}
        <Toggle
          label="Foot glow"
          tip="Light up each foot while it is inside its grip window — a visual debug of grip timing."
          on={gripGlowEnabled}
          onChange={setGripGlowEnabled}
        />
        <Toggle
          label="Grip slides on leg axis"
          tip="Pin the planted foot to the leg-axis LINE (free to slide in/out along the leg, even past the foot) instead of a rigid point. Emulates a knee: the hip can travel over the contact without the rigid-arc fighting the body wave. Off = rigid point pin."
          on={gripSlideAxis}
          onChange={setGripSlideAxis}
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
