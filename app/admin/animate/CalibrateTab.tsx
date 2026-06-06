'use client'

import { useMemo, useCallback, useState } from 'react'
import { Crosshair } from 'lucide-react'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore } from './animateStore'
import { BodyGroup, AngleCaps } from '../_lib/types'
import { effectiveAngleCaps } from '@/app/game/locomotion/chain'
import { defaultWeightFor } from '@/app/game/locomotion/weights'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { LimitSlider } from './LimitSlider'
import { useSaveConfig } from '../_lib/hooks'
import { cn } from '@/lib/utils'

function legPairKey(leg: BodyGroup): string | null {
  if (leg.type !== 'leg-left' && leg.type !== 'leg-right') return null
  return leg.attachedToSpineId ?? null
}

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180
const YAW_RANGE_DEG = 90
const PITCH_RANGE_DEG = 90

function deg(rad: number): number {
  return rad * RAD_TO_DEG
}

function rad(deg: number): number {
  return deg * DEG_TO_RAD
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function DegInput({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  className?: string
}) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      onChange={(e) => {
        const v = parseFloat(e.target.value)
        if (Number.isFinite(v)) onChange(clamp(v, min, max))
      }}
      min={min}
      max={max}
      step={1}
      className={cn(
        'w-14 h-6 rounded bg-white/5 border border-white/15 text-white/90 text-[11px] text-center font-mono outline-none focus:border-violet-400/60',
        className
      )}
    />
  )
}

function SnapButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-6 w-6 flex items-center justify-center rounded border border-white/15 text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
    >
      <Crosshair className="size-3" />
    </button>
  )
}

function GroupCalibrator({ group }: { group: BodyGroup }) {
  const caps = effectiveAngleCaps(group)
  const setGroupAngleCaps = useSharedStore((s) => s.setGroupAngleCaps)
  const setGroupNodeWeight = useSharedStore((s) => s.setGroupNodeWeight)
  const groups = useSharedStore((s) => s.groups)
  const calibratingYaw = useAnimateStore((s) => s.calibratingYaw)
  const calibratingPitch = useAnimateStore((s) => s.calibratingPitch)
  const setCalibratingYaw = useAnimateStore((s) => s.setCalibratingYaw)
  const setCalibratingPitch = useAnimateStore((s) => s.setCalibratingPitch)
  const legPairMirroredOverrides = useAnimateStore((s) => s.legPairMirroredOverrides)
  const setLegPairMirrored = useAnimateStore((s) => s.setLegPairMirrored)

  const yawForward = caps.yaw
  const yawBackward = caps.yawBack ?? caps.yaw
  const yawForwardDeg = deg(yawForward)
  const yawBackwardDeg = deg(yawBackward)
  const pitchUpDeg = deg(caps.pitchUp)
  const pitchDownDeg = deg(caps.pitchDown)

  const isLeg = group.type === 'leg-left' || group.type === 'leg-right'
  const pairKey = isLeg ? legPairKey(group) : null
  const pairedLeg = useMemo(() => {
    if (!pairKey || !isLeg) return null
    const oppositeType = group.type === 'leg-left' ? 'leg-right' : 'leg-left'
    return groups.find((g) => g.type === oppositeType && g.attachedToSpineId === pairKey) ?? null
  }, [groups, pairKey, isLeg, group.type])
  const mirrored = pairKey ? legPairMirroredOverrides[pairKey] ?? true : false

  const updateCaps = useCallback(
    (partial: Partial<AngleCaps>) => {
      const next: AngleCaps = {
        yaw: caps.yaw,
        yawBack: caps.yawBack,
        pitchUp: caps.pitchUp,
        pitchDown: caps.pitchDown,
        ...partial,
      }
      setGroupAngleCaps(group.id, next)
      if (isLeg && mirrored && pairedLeg) {
        const pairedCaps = effectiveAngleCaps(pairedLeg)
        const swappedPartial: Partial<AngleCaps> = {}
        if ('yaw' in partial) swappedPartial.yawBack = partial.yaw
        if ('yawBack' in partial) swappedPartial.yaw = partial.yawBack
        if ('pitchUp' in partial) swappedPartial.pitchUp = partial.pitchUp
        if ('pitchDown' in partial) swappedPartial.pitchDown = partial.pitchDown
        const pairedNext: AngleCaps = {
          yaw: pairedCaps.yaw,
          yawBack: pairedCaps.yawBack,
          pitchUp: pairedCaps.pitchUp,
          pitchDown: pairedCaps.pitchDown,
          ...swappedPartial,
        }
        setGroupAngleCaps(pairedLeg.id, pairedNext)
      }
    },
    [caps, group.id, setGroupAngleCaps, isLeg, mirrored, pairedLeg]
  )

  const weight = group.nodeWeight ?? defaultWeightFor(group.type)

  return (
    <div className="flex flex-col gap-3 pl-3 pr-1 pb-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/55">
          <span>Weight (kg){isLeg ? ' — all legs' : ''}</span>
          <input
            type="number"
            value={weight}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (Number.isFinite(v)) setGroupNodeWeight(group.id, clamp(v, 0.1, 10))
            }}
            className="w-16 h-6 rounded bg-white/5 border border-white/15 text-white/90 text-[11px] text-center font-mono outline-none focus:border-violet-400/60"
          />
        </div>
        <input
          type="range"
          value={weight}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(e) => setGroupNodeWeight(group.id, clamp(parseFloat(e.target.value), 0.1, 10))}
          className="w-full accent-violet-400"
        />
      </div>
      {isLeg && pairKey && pairedLeg && (
        <label className="flex items-center gap-2 text-[11px] text-white/70 cursor-pointer select-none">
          <Checkbox
            checked={mirrored}
            onCheckedChange={(checked) => setLegPairMirrored(pairKey, checked === true)}
          />
          <span>Mirror legs</span>
          <span className="text-white/45">(pair with {pairedLeg.name})</span>
        </label>
      )}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/55">
          <span>{isLeg ? 'Yaw (← back / fwd →, independent)' : 'Yaw (L/R, symmetric)'}</span>
          <div className="flex items-center gap-1.5">
            {isLeg ? (
              <>
                <span className="text-white/60">←</span>
                <DegInput
                  value={yawBackwardDeg}
                  min={0}
                  max={YAW_RANGE_DEG}
                  onChange={(v) => {
                    updateCaps({ yawBack: rad(v) })
                    if (calibratingYaw < -rad(v)) setCalibratingYaw(-rad(v))
                  }}
                />
                <SnapButton
                  title="Set backward cap to current slider position"
                  onClick={() => {
                    const mag = Math.min(Math.abs(calibratingYaw), rad(YAW_RANGE_DEG))
                    updateCaps({ yawBack: mag })
                  }}
                />
                <span className="text-white/60">→</span>
                <DegInput
                  value={yawForwardDeg}
                  min={0}
                  max={YAW_RANGE_DEG}
                  onChange={(v) => {
                    updateCaps({ yaw: rad(v) })
                    if (calibratingYaw > rad(v)) setCalibratingYaw(rad(v))
                  }}
                />
                <SnapButton
                  title="Set forward cap to current slider position"
                  onClick={() => {
                    const mag = Math.min(Math.abs(calibratingYaw), rad(YAW_RANGE_DEG))
                    updateCaps({ yaw: mag })
                  }}
                />
              </>
            ) : (
              <>
                <DegInput
                  value={yawForwardDeg}
                  min={0}
                  max={YAW_RANGE_DEG}
                  onChange={(v) => {
                    updateCaps({ yaw: rad(v), yawBack: rad(v) })
                    if (calibratingYaw > rad(v)) setCalibratingYaw(rad(v))
                    else if (calibratingYaw < -rad(v)) setCalibratingYaw(-rad(v))
                  }}
                />
                <span className="text-white/55">°</span>
                <SnapButton
                  title="Set yaw cap to current slider position"
                  onClick={() => {
                    const mag = Math.min(Math.abs(calibratingYaw), rad(YAW_RANGE_DEG))
                    updateCaps({ yaw: mag, yawBack: mag })
                  }}
                />
              </>
            )}
          </div>
        </div>
        <LimitSlider
          min={-rad(YAW_RANGE_DEG)}
          max={rad(YAW_RANGE_DEG)}
          low={-yawBackward}
          high={yawForward}
          value={calibratingYaw}
          mirrored={!isLeg}
          onLowChange={(v) => {
            const mag = Math.abs(v)
            if (isLeg) updateCaps({ yawBack: mag })
            else updateCaps({ yaw: mag, yawBack: mag })
          }}
          onHighChange={(v) => {
            const mag = Math.abs(v)
            if (isLeg) updateCaps({ yaw: mag })
            else updateCaps({ yaw: mag, yawBack: mag })
          }}
          onValueChange={setCalibratingYaw}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/55">
          <span>Pitch (↑ / ↓, independent)</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/60">↓</span>
            <DegInput
              value={pitchDownDeg}
              min={0}
              max={PITCH_RANGE_DEG}
              onChange={(v) => {
                updateCaps({ pitchDown: rad(v) })
                if (calibratingPitch < -rad(v)) setCalibratingPitch(-rad(v))
              }}
            />
            <SnapButton
              title="Set pitch-down cap to current slider position"
              onClick={() => {
                const mag = Math.min(Math.abs(calibratingPitch), rad(PITCH_RANGE_DEG))
                updateCaps({ pitchDown: mag })
              }}
            />
            <span className="text-white/60">↑</span>
            <DegInput
              value={pitchUpDeg}
              min={0}
              max={PITCH_RANGE_DEG}
              onChange={(v) => {
                updateCaps({ pitchUp: rad(v) })
                if (calibratingPitch > rad(v)) setCalibratingPitch(rad(v))
              }}
            />
            <SnapButton
              title="Set pitch-up cap to current slider position"
              onClick={() => {
                const mag = Math.min(Math.abs(calibratingPitch), rad(PITCH_RANGE_DEG))
                updateCaps({ pitchUp: mag })
              }}
            />
          </div>
        </div>
        <LimitSlider
          min={-rad(PITCH_RANGE_DEG)}
          max={rad(PITCH_RANGE_DEG)}
          low={-caps.pitchDown}
          high={caps.pitchUp}
          value={calibratingPitch}
          onLowChange={(v) => updateCaps({ pitchDown: Math.abs(v) })}
          onHighChange={(v) => updateCaps({ pitchUp: v })}
          onValueChange={setCalibratingPitch}
        />
      </div>
    </div>
  )
}

export function CalibrateTab() {
  const groups = useSharedStore((s) => s.groups)
  const setAllNodeWeights = useSharedStore((s) => s.setAllNodeWeights)
  const configName = useSharedStore((s) => s.configName)
  const stlKey = useSharedStore((s) => s.stlKey)
  const calibratingGroupId = useAnimateStore((s) => s.calibratingGroupId)
  const setCalibratingGroup = useAnimateStore((s) => s.setCalibratingGroup)
  const setCalibratingYaw = useAnimateStore((s) => s.setCalibratingYaw)
  const setCalibratingPitch = useAnimateStore((s) => s.setCalibratingPitch)

  const { mutate: saveConfig, isPending: saving } = useSaveConfig()

  const initialWeight = useMemo(() => {
    const axial = groups.find((g) => g.type === 'head' || g.type === 'spine' || g.type === 'tail')
    return axial?.nodeWeight ?? defaultWeightFor('spine')
  }, [groups])
  const [globalWeight, setGlobalWeight] = useState(initialWeight)
  const applyGlobalWeight = useCallback(
    (v: number) => {
      const c = clamp(v, 0.1, 10)
      setGlobalWeight(c)
      setAllNodeWeights(c)
    },
    [setAllNodeWeights]
  )

  const handleResetSliders = useCallback(() => {
    setCalibratingYaw(0)
    setCalibratingPitch(0)
  }, [setCalibratingYaw, setCalibratingPitch])

  const handleSave = useCallback(() => {
    const name = configName.trim()
    if (!name) return
    saveConfig(name)
  }, [configName, saveConfig])

  const orderedGroups = useMemo(() => {
    const result: { group: BodyGroup; nested: boolean }[] = []
    const head = groups.find((g) => g.type === 'head')
    if (head) result.push({ group: head, nested: false })
    const spines = groups.filter((g) => g.type === 'spine')
    for (const spine of spines) {
      result.push({ group: spine, nested: false })
      const attachedLegs = groups.filter(
        (g) =>
          (g.type === 'leg-left' || g.type === 'leg-right') &&
          g.attachedToSpineId === spine.id
      )
      for (const leg of attachedLegs) result.push({ group: leg, nested: true })
    }
    const looseLegs = groups.filter(
      (g) =>
        (g.type === 'leg-left' || g.type === 'leg-right') && !g.attachedToSpineId
    )
    for (const leg of looseLegs) result.push({ group: leg, nested: false })
    const tail = groups.find((g) => g.type === 'tail')
    if (tail) result.push({ group: tail, nested: false })
    return result
  }, [groups])

  if (orderedGroups.length === 0) {
    return (
      <div className="p-4 text-xs text-white/55">
        Define head + spine groups in Step 2 to calibrate joint limits.
      </div>
    )
  }

  const canSave = !!stlKey && configName.trim().length > 0 && !saving

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 p-4 text-xs text-white/70 flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-white/55 text-[10px] uppercase tracking-widest">
            Calibrate joint limits
          </p>
          <button
            onClick={handleResetSliders}
            disabled={!calibratingGroupId}
            className={cn(
              'text-[10px] rounded px-2 py-0.5 border transition-colors',
              calibratingGroupId
                ? 'border-white/20 text-white/70 hover:bg-white/10'
                : 'border-white/10 text-white/40'
            )}
          >
            Reset sliders
          </button>
        </div>
        <p className="text-white/55 text-[10px] leading-relaxed">
          Expand a node to set its bend caps and preview the rotation live. Only one node at a time.
        </p>

        <div className="flex flex-col gap-1.5 pb-3 mt-1 border-b border-white/10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/55">
            <span>All node weights (kg)</span>
            <input
              type="number"
              value={globalWeight}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (Number.isFinite(v)) applyGlobalWeight(v)
              }}
              className="w-16 h-6 rounded bg-white/5 border border-white/15 text-white/90 text-[11px] text-center font-mono outline-none focus:border-violet-400/60"
            />
          </div>
          <input
            type="range"
            value={globalWeight}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(e) => applyGlobalWeight(parseFloat(e.target.value))}
            className="w-full accent-violet-400"
          />
          <span className="text-white/45 text-[9px] leading-relaxed">
            Sets every node (head, spine, tail, legs) to this weight at once. Individual nodes can
            still be overridden below.
          </span>
        </div>

        <Accordion
          type="single"
          collapsible
          value={calibratingGroupId ?? ''}
          onValueChange={(v) => setCalibratingGroup(v || null)}
          className="mt-1"
        >
          {orderedGroups.map(({ group: g, nested }) => (
            <AccordionItem
              key={g.id}
              value={g.id}
              className={cn('border-white/10', nested && 'ml-4')}
            >
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="text-xs text-white/80 truncate">{g.name}</span>
                  <span className="text-[10px] text-white/45 ml-auto mr-2 shrink-0">
                    {g.type}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                {calibratingGroupId === g.id && <GroupCalibrator group={g} />}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className="border-t border-white/8 p-4 shrink-0">
        <Button
          size="sm"
          className="h-7 text-xs w-full"
          disabled={!canSave}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save Calibration'}
        </Button>
        {!stlKey ? (
          <p className="text-[10px] text-white/45 text-center pt-1">
            Load or save a model in Step 2 first.
          </p>
        ) : configName.trim().length === 0 ? (
          <p className="text-[10px] text-white/45 text-center pt-1">
            Name the configuration in Step 2 before saving.
          </p>
        ) : null}
      </div>
    </div>
  )
}
