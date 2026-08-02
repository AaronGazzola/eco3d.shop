'use client'

import { useEffect, useMemo } from 'react'
import { Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { useSharedStore } from '../_lib/sharedStore'
import type { BodyGroup } from '../_lib/types'
import { useAnimateStore } from './animateStore'
import { useSaveAnimations } from './page.hooks'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180
const JOINT_RANGE_DEG = 60
const ROOT_RANGE = 4
const ROOT_YAW_RANGE_DEG = 45

function orderJoints(groups: BodyGroup[]): BodyGroup[] {
  const head = groups.filter((g) => g.type === 'head')
  const spines = groups.filter((g) => g.type === 'spine')
  const tail = groups.filter((g) => g.type === 'tail')
  const legsFor = (spineId: string) =>
    groups.filter(
      (g) => (g.type === 'leg-left' || g.type === 'leg-right') && g.attachedToSpineId === spineId,
    )
  const orphanLegs = groups.filter(
    (g) =>
      (g.type === 'leg-left' || g.type === 'leg-right') &&
      !groups.some((p) => p.id === g.attachedToSpineId),
  )

  const out: BodyGroup[] = [...head]
  for (const spine of spines) {
    out.push(spine)
    out.push(...legsFor(spine.id))
  }
  out.push(...tail, ...orphanLegs)
  return out
}

function DegreeSlider({
  label,
  value,
  range,
  onChange,
}: {
  label: string
  value: number
  range: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-9 shrink-0">{label}</span>
      <input
        type="range"
        min={-range}
        max={range}
        step={1}
        value={Math.round(value * RAD_TO_DEG)}
        onChange={(e) => onChange(parseFloat(e.target.value) * DEG_TO_RAD)}
        className="flex-1 accent-violet-400"
      />
      <span className="text-[10px] text-white/50 w-9 text-right font-mono">
        {Math.round(value * RAD_TO_DEG)}°
      </span>
    </div>
  )
}

function ValueSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-9 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-violet-400"
      />
      <span className="text-[10px] text-white/50 w-9 text-right font-mono">
        {value.toFixed(step < 1 ? 2 : 0)}
        {suffix}
      </span>
    </div>
  )
}

export function AnimateSidebar() {
  const groups = useSharedStore((s) => s.groups)
  const configId = useSharedStore((s) => s.configId)
  const configName = useSharedStore((s) => s.configName)
  const rigAnimations = useSharedStore((s) => s.animations)

  const cycles = useAnimateStore((s) => s.cycles)
  const selectedCycle = useAnimateStore((s) => s.selectedCycle)
  const selectedKeyframeIndex = useAnimateStore((s) => s.selectedKeyframeIndex)
  const playing = useAnimateStore((s) => s.playing)
  const scrubPhase = useAnimateStore((s) => s.scrubPhase)
  const dirty = useAnimateStore((s) => s.dirty)
  const loadFromRig = useAnimateStore((s) => s.loadFromRig)
  const setSelectedKeyframeIndex = useAnimateStore((s) => s.setSelectedKeyframeIndex)
  const setPlaying = useAnimateStore((s) => s.setPlaying)
  const setScrubPhase = useAnimateStore((s) => s.setScrubPhase)
  const setSpeed = useAnimateStore((s) => s.setSpeed)
  const setAmplitude = useAnimateStore((s) => s.setAmplitude)
  const addKeyframe = useAnimateStore((s) => s.addKeyframe)
  const deleteKeyframe = useAnimateStore((s) => s.deleteKeyframe)
  const moveKeyframe = useAnimateStore((s) => s.moveKeyframe)
  const setJointOffset = useAnimateStore((s) => s.setJointOffset)
  const setRootOffset = useAnimateStore((s) => s.setRootOffset)
  const resetKeyframe = useAnimateStore((s) => s.resetKeyframe)

  const { mutate: saveAnimations, isPending: saving } = useSaveAnimations()

  useEffect(() => {
    if (groups.length > 0) loadFromRig(rigAnimations, groups)
  }, [rigAnimations, groups, loadFromRig])

  const cycle = cycles[selectedCycle]
  const keyframes = cycle?.keyframes ?? []
  const pose = keyframes[selectedKeyframeIndex]
  const orderedJoints = useMemo(() => orderJoints(groups), [groups])

  if (groups.length === 0) {
    return (
      <div className="p-4">
        <p className="text-[11px] text-amber-300/70">
          Load a rig with grouped segments in the Pick step before animating.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 text-white">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Animate
        </h3>
        <span className="text-[10px] text-white/30 capitalize">{selectedCycle}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
        </Button>
        <input
          type="range"
          min={0}
          max={0.999}
          step={0.001}
          value={scrubPhase}
          onChange={(e) => {
            setPlaying(false)
            setScrubPhase(parseFloat(e.target.value))
          }}
          className="flex-1 accent-violet-400"
        />
        <span className="text-[10px] text-white/40 w-8 text-right font-mono">
          {Math.round(scrubPhase * 100)}%
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <ValueSlider
          label="Speed"
          value={cycle?.speed ?? 1}
          min={0.1}
          max={4}
          step={0.1}
          suffix="x"
          onChange={setSpeed}
        />
        <ValueSlider
          label="Amp"
          value={cycle?.amplitude ?? 1}
          min={0}
          max={2}
          step={0.05}
          suffix="x"
          onChange={setAmplitude}
        />
      </div>

      <div className="flex flex-col gap-1 pt-2 border-t border-white/8">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            Keyframes ({keyframes.length})
          </span>
          <button
            onClick={addKeyframe}
            className="text-[10px] text-white/40 hover:text-white flex items-center gap-1"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>
        {keyframes.map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 cursor-pointer transition-colors',
              i === selectedKeyframeIndex ? 'bg-white/15' : 'hover:bg-white/5',
            )}
            onClick={() => setSelectedKeyframeIndex(i)}
          >
            <span className="text-xs text-white/70 flex-1">Frame {i + 1}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                moveKeyframe(i, -1)
              }}
              disabled={i === 0}
              className="text-white/30 hover:text-white/70 disabled:opacity-20 text-xs px-0.5"
            >
              ▲
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                moveKeyframe(i, 1)
              }}
              disabled={i === keyframes.length - 1}
              className="text-white/30 hover:text-white/70 disabled:opacity-20 text-xs px-0.5"
            >
              ▼
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteKeyframe(i)
              }}
              className="text-white/20 hover:text-red-400 px-0.5"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
        {keyframes.length === 0 && (
          <p className="text-[10px] text-white/25 py-2 text-center">
            No keyframes. Add one to start posing.
          </p>
        )}
      </div>

      {pose && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              Pose · frame {selectedKeyframeIndex + 1}
            </span>
            <button
              onClick={resetKeyframe}
              className="text-[10px] text-white/40 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>

          <Accordion type="multiple" className="w-full">
            <AccordionItem value="root" className="border-white/8">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">
                Root
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-1.5 pb-3">
                <ValueSlider
                  label="Fwd"
                  value={pose.root.x}
                  min={-ROOT_RANGE}
                  max={ROOT_RANGE}
                  step={0.05}
                  onChange={(v) => setRootOffset('x', v)}
                />
                <ValueSlider
                  label="Side"
                  value={pose.root.z}
                  min={-ROOT_RANGE}
                  max={ROOT_RANGE}
                  step={0.05}
                  onChange={(v) => setRootOffset('z', v)}
                />
                <DegreeSlider
                  label="Turn"
                  value={pose.root.yawRad}
                  range={ROOT_YAW_RANGE_DEG}
                  onChange={(v) => setRootOffset('yawRad', v)}
                />
              </AccordionContent>
            </AccordionItem>

            {orderedJoints.map((g) => {
              const joint = pose.joints[g.id] ?? { yawRad: 0, pitchRad: 0 }
              const isLeg = g.type === 'leg-left' || g.type === 'leg-right'
              return (
                <AccordionItem key={g.id} value={g.id} className="border-white/8">
                  <AccordionTrigger className="text-xs py-2 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="flex flex-col gap-1.5 pb-3">
                    <DegreeSlider
                      label={isLeg ? 'Swing' : 'Yaw'}
                      value={joint.yawRad}
                      range={JOINT_RANGE_DEG}
                      onChange={(v) => setJointOffset(g.id, 'yawRad', v)}
                    />
                    <DegreeSlider
                      label={isLeg ? 'Lift' : 'Pitch'}
                      value={joint.pitchRad}
                      range={JOINT_RANGE_DEG}
                      onChange={(v) => setJointOffset(g.id, 'pitchRad', v)}
                    />
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-white/8">
        {configId ? (
          <>
            <p className="text-[11px] text-white/60 capitalize">{configName}</p>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={saving || !dirty}
              onClick={() => saveAnimations(cycles)}
            >
              {saving ? 'Saving…' : dirty ? 'Save Animations' : 'Saved'}
            </Button>
          </>
        ) : (
          <p className="text-[10px] text-amber-300/70 text-center py-1">
            Save the rig in the Group step before saving animations.
          </p>
        )}
      </div>
    </div>
  )
}
