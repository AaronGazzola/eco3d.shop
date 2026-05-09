'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Activity,
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  Eye,
  Footprints,
  GripVertical,
  Heart,
  Layers as LayersIcon,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Radio,
  Save,
  SlidersHorizontal,
  Spline,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type LayerKind =
  | 'spine-wave'
  | 'head-track'
  | 'foot-planter'
  | 'hip-sway'
  | 'tail-curl'
  | 'idle-breath'
  | 'spine-curl'
  | 'eye-blink'
  | 'pose-blend'
  | 'noise'
  | 'custom'

type ParamSpec =
  | { kind: 'number'; min: number; max: number; step: number; unit?: string }
  | { kind: 'enum'; options: string[] }

type ParamMode = 'constant' | 'curve' | 'signal'

interface CurveParam {
  head: number
  tail: number
}

interface SignalParam {
  signalId: string
  gain: number
  bias: number
}

interface LayerSpec {
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  defaults: Record<string, number | string>
  params: Record<string, ParamSpec>
  bindable?: string[]
}

const LAYER_SPECS: Record<LayerKind, LayerSpec> = {
  'spine-wave': {
    name: 'Spine Wave',
    icon: Waves,
    color: 'text-cyan-300',
    defaults: { amplitude: 0.4, frequency: 1.2, phaseSpeed: 1 },
    params: {
      amplitude: { kind: 'number', min: 0, max: 1.5, step: 0.05 },
      frequency: { kind: 'number', min: 0, max: 3, step: 0.1, unit: 'Hz' },
      phaseSpeed: { kind: 'number', min: 0, max: 3, step: 0.1 },
    },
    bindable: ['amplitude', 'frequency'],
  },
  'head-track': {
    name: 'Head Track',
    icon: Target,
    color: 'text-violet-300',
    defaults: { smoothing: 0.6, maxAngle: 1.4 },
    params: {
      smoothing: { kind: 'number', min: 0, max: 1, step: 0.05 },
      maxAngle: { kind: 'number', min: 0, max: Math.PI, step: 0.05, unit: 'rad' },
    },
    bindable: ['smoothing'],
  },
  'foot-planter': {
    name: 'Foot Planter',
    icon: Footprints,
    color: 'text-emerald-300',
    defaults: { cadence: 1.2, stride: 1.5, lift: 0.3, gait: 'walk' },
    params: {
      cadence: { kind: 'number', min: 0, max: 3, step: 0.05, unit: 'Hz' },
      stride: { kind: 'number', min: 0, max: 3, step: 0.1 },
      lift: { kind: 'number', min: 0, max: 1, step: 0.05 },
      gait: { kind: 'enum', options: ['walk', 'trot', 'pace', 'gallop'] },
    },
    bindable: ['cadence', 'stride'],
  },
  'hip-sway': {
    name: 'Hip Sway',
    icon: Wind,
    color: 'text-amber-300',
    defaults: { amplitude: 0.2, frequency: 1 },
    params: {
      amplitude: { kind: 'number', min: 0, max: 0.8, step: 0.05 },
      frequency: { kind: 'number', min: 0, max: 2, step: 0.1, unit: 'Hz' },
    },
    bindable: ['amplitude', 'frequency'],
  },
  'tail-curl': {
    name: 'Tail Curl',
    icon: Spline,
    color: 'text-rose-300',
    defaults: { curvature: 0.3, propagation: 0.7 },
    params: {
      curvature: { kind: 'number', min: -1, max: 1, step: 0.05 },
      propagation: { kind: 'number', min: 0, max: 1, step: 0.05 },
    },
    bindable: ['curvature'],
  },
  'idle-breath': {
    name: 'Idle Breath',
    icon: Heart,
    color: 'text-pink-300',
    defaults: { rate: 0.4, depth: 0.15 },
    params: {
      rate: { kind: 'number', min: 0, max: 2, step: 0.05, unit: 'Hz' },
      depth: { kind: 'number', min: 0, max: 0.5, step: 0.05 },
    },
    bindable: ['rate', 'depth'],
  },
  'spine-curl': {
    name: 'Spine Curl',
    icon: Activity,
    color: 'text-orange-300',
    defaults: { amount: 0.6, easing: 0.5 },
    params: {
      amount: { kind: 'number', min: -1, max: 1, step: 0.05 },
      easing: { kind: 'number', min: 0, max: 1, step: 0.05 },
    },
    bindable: ['amount'],
  },
  'eye-blink': {
    name: 'Eye Blink',
    icon: Eye,
    color: 'text-sky-300',
    defaults: { rate: 0.2, duration: 0.1 },
    params: {
      rate: { kind: 'number', min: 0, max: 1, step: 0.05, unit: 'Hz' },
      duration: { kind: 'number', min: 0.05, max: 0.5, step: 0.05, unit: 's' },
    },
    bindable: ['rate'],
  },
  'pose-blend': {
    name: 'Pose Blend',
    icon: Bookmark,
    color: 'text-fuchsia-300',
    defaults: { amount: 0.6, easeIn: 0.3 },
    params: {
      amount: { kind: 'number', min: 0, max: 1, step: 0.05 },
      easeIn: { kind: 'number', min: 0, max: 2, step: 0.05, unit: 's' },
    },
    bindable: ['amount'],
  },
  noise: {
    name: 'Motion Noise',
    icon: Sparkles,
    color: 'text-lime-300',
    defaults: { amplitude: 0.1, frequency: 0.4, octaves: 2 },
    params: {
      amplitude: { kind: 'number', min: 0, max: 0.5, step: 0.02 },
      frequency: { kind: 'number', min: 0, max: 2, step: 0.05, unit: 'Hz' },
      octaves: { kind: 'number', min: 1, max: 4, step: 1 },
    },
    bindable: ['amplitude'],
  },
  custom: {
    name: 'Custom Node',
    icon: Zap,
    color: 'text-yellow-300',
    defaults: {},
    params: {},
  },
}

interface SpineGroup {
  id: string
  name: string
  type: 'head' | 'spine' | 'tail'
}

interface LegPair {
  id: string
  name: string
  attachedToId: string
}

interface SpringConfig {
  stiffness: number
  damping: number
}

interface Skeleton {
  id: string
  name: string
  spineGroups: SpineGroup[]
  legPairs: LegPair[]
  springs: Record<string, SpringConfig>
}

function defaultSprings(groups: SpineGroup[]): Record<string, SpringConfig> {
  const out: Record<string, SpringConfig> = {}
  for (const g of groups) {
    out[g.id] = {
      stiffness: g.type === 'tail' ? 0.4 : g.type === 'head' ? 0.85 : 0.65,
      damping: g.type === 'tail' ? 0.2 : 0.45,
    }
  }
  return out
}

const PRESET_SKELETONS: Skeleton[] = (
  [
    {
      id: 'dragon',
      name: 'Dragon (long-spine)',
      spineGroups: [
        { id: 'head', name: 'Head', type: 'head' },
        { id: 'neck', name: 'Neck', type: 'spine' },
        { id: 'shoulders', name: 'Shoulders', type: 'spine' },
        { id: 'midback', name: 'Mid-back', type: 'spine' },
        { id: 'hips', name: 'Hips', type: 'spine' },
        { id: 'tail-base', name: 'Tail base', type: 'spine' },
        { id: 'tail-mid', name: 'Tail mid', type: 'tail' },
        { id: 'tail-tip', name: 'Tail tip', type: 'tail' },
      ] as SpineGroup[],
      legPairs: [
        { id: 'front', name: 'Front legs', attachedToId: 'shoulders' },
        { id: 'back', name: 'Back legs', attachedToId: 'hips' },
      ],
    },
    {
      id: 'hatchling',
      name: 'Hatchling (compact)',
      spineGroups: [
        { id: 'head', name: 'Head', type: 'head' },
        { id: 'shoulders', name: 'Shoulders', type: 'spine' },
        { id: 'hips', name: 'Hips', type: 'spine' },
        { id: 'tail', name: 'Tail', type: 'tail' },
      ] as SpineGroup[],
      legPairs: [
        { id: 'front', name: 'Front legs', attachedToId: 'shoulders' },
        { id: 'back', name: 'Back legs', attachedToId: 'hips' },
      ],
    },
    {
      id: 'wyvern',
      name: 'Wyvern (1 pair)',
      spineGroups: [
        { id: 'head', name: 'Head', type: 'head' },
        { id: 'neck', name: 'Neck', type: 'spine' },
        { id: 'body', name: 'Body', type: 'spine' },
        { id: 'hips', name: 'Hips', type: 'spine' },
        { id: 'tail', name: 'Tail', type: 'tail' },
      ] as SpineGroup[],
      legPairs: [{ id: 'back', name: 'Back legs', attachedToId: 'hips' }],
    },
  ] as Omit<Skeleton, 'springs'>[]
).map((s) => ({ ...s, springs: defaultSprings(s.spineGroups) }))

interface SignalDef {
  id: string
  label: string
  unit?: string
  category: 'world' | 'personality'
  min: number
  max: number
}

const SIGNALS: SignalDef[] = [
  { id: 'velocity', label: 'velocity', unit: 'u/s', category: 'world', min: 0, max: 6 },
  { id: 'distance', label: 'distance to target', unit: 'u', category: 'world', min: 0, max: 12 },
  { id: 'turnRate', label: 'turn rate', unit: 'rad/s', category: 'world', min: -2, max: 2 },
  { id: 'idleTime', label: 'idle time', unit: 's', category: 'world', min: 0, max: 10 },
  { id: 'energy', label: 'energy', category: 'personality', min: 0, max: 1 },
  { id: 'alertness', label: 'alertness', category: 'personality', min: 0, max: 1 },
  { id: 'weight', label: 'weight', category: 'personality', min: 0, max: 1 },
  { id: 'mood', label: 'mood', category: 'personality', min: -1, max: 1 },
]

interface Personality {
  energy: number
  alertness: number
  weight: number
  mood: number
}

const DEFAULT_PERSONALITY: Personality = {
  energy: 0.6,
  alertness: 0.5,
  weight: 0.5,
  mood: 0.0,
}

interface LayerTiming {
  start: number
  duration: number
  easeIn: number
  easeOut: number
}

interface Layer {
  id: string
  kind: LayerKind
  target: string
  weight: number
  muted: boolean
  expanded: boolean
  phaseDelay: number
  drivenBy: string | null
  paramModes: Record<string, ParamMode>
  paramExtras: Record<string, CurveParam | SignalParam>
  params: Record<string, number | string>
  timing?: LayerTiming
  poseId?: string
}

interface Behavior {
  id: string
  name: string
  mode: 'loop' | 'timeline'
  duration: number
  layers: Layer[]
}

interface PoseSpec {
  id: string
  name: string
  description: string
  spineDeflections: number[]
  curvature: number
}

interface TriggerSpec {
  id: string
  event: string
  action: string
  threshold: number
}

const SAMPLE_POSES: PoseSpec[] = [
  {
    id: 'curled',
    name: 'Curled',
    description: 'Tight tail curl, head tucked',
    spineDeflections: [0, 0.1, 0.2, 0.4, 0.5, 0.4, 0.2, 0.1],
    curvature: 0.6,
  },
  {
    id: 'alert',
    name: 'Alert',
    description: 'Head up, body tense, tail extended',
    spineDeflections: [-0.2, -0.1, 0, 0.05, 0.1, 0.05, 0, -0.05],
    curvature: -0.2,
  },
  {
    id: 'crouched',
    name: 'Crouched',
    description: 'Low body, ready to pounce',
    spineDeflections: [0.1, 0.2, 0.3, 0.35, 0.3, 0.2, 0.1, 0],
    curvature: 0.3,
  },
]

const SAMPLE_TRIGGERS: TriggerSpec[] = [
  { id: 't1', event: 'click_target', action: 'fire:Hatch', threshold: 0 },
  { id: 't2', event: 'idle_seconds', action: 'switch:Idle', threshold: 4 },
  { id: 't3', event: 'velocity_above', action: 'modulate:energy', threshold: 3 },
]

const EVENT_OPTIONS = [
  'click_target',
  'idle_seconds',
  'velocity_above',
  'distance_below',
  'turn_above',
]

const ACTION_OPTIONS = [
  'switch:Wander',
  'switch:Idle',
  'switch:Hatch',
  'fire:Hatch',
  'modulate:energy',
  'modulate:alertness',
]

interface TargetOption {
  id: string
  label: string
}

function targetsForLayer(kind: LayerKind, skel: Skeleton): TargetOption[] {
  switch (kind) {
    case 'spine-wave':
    case 'spine-curl':
    case 'noise':
      return [
        { id: 'all', label: 'All spine' },
        { id: 'head', label: 'Head end' },
        { id: 'mid', label: 'Mid body' },
        { id: 'tail', label: 'Tail end' },
        ...skel.spineGroups
          .filter((g) => g.type === 'spine')
          .map((g) => ({ id: `g:${g.id}`, label: g.name })),
      ]
    case 'foot-planter': {
      return [
        { id: 'all', label: 'All legs' },
        ...skel.legPairs.map((p) => {
          const hip = skel.spineGroups.find((g) => g.id === p.attachedToId)
          return { id: `pair:${p.id}`, label: hip ? `${p.name} · ${hip.name}` : p.name }
        }),
      ]
    }
    case 'hip-sway': {
      const hipIds = Array.from(new Set(skel.legPairs.map((p) => p.attachedToId)))
      return [
        ...(hipIds.length > 1 ? [{ id: 'all', label: 'All hips' }] : []),
        ...hipIds.map((id) => {
          const g = skel.spineGroups.find((sg) => sg.id === id)
          return { id: `g:${id}`, label: g?.name ?? id }
        }),
      ]
    }
    case 'tail-curl':
      return [{ id: 'tail', label: 'Tail' }]
    case 'head-track':
    case 'eye-blink':
      return [{ id: 'head', label: 'Head' }]
    case 'idle-breath':
      return [{ id: 'all', label: 'Whole body' }]
    case 'pose-blend':
      return [{ id: 'whole-body', label: 'Whole body' }]
    case 'custom':
      return [{ id: 'custom', label: 'Custom' }]
  }
}

function defaultTargetFor(kind: LayerKind, skel: Skeleton): string {
  return targetsForLayer(kind, skel)[0]?.id ?? 'all'
}

let _idCounter = 0
const uid = (k: string) => `${k}-${++_idCounter}-${Date.now().toString(36).slice(-3)}`

function makeLayer(kind: LayerKind, skel: Skeleton, weight = 1, expanded = false): Layer {
  const spec = LAYER_SPECS[kind]
  const paramModes: Record<string, ParamMode> = {}
  for (const k of Object.keys(spec.params)) paramModes[k] = 'constant'
  return {
    id: uid(kind),
    kind,
    target: defaultTargetFor(kind, skel),
    weight,
    muted: false,
    expanded,
    phaseDelay: 0,
    drivenBy: null,
    paramModes,
    paramExtras: {},
    params: { ...spec.defaults },
    timing: { start: 0, duration: 2, easeIn: 0.2, easeOut: 0.4 },
  }
}

function makeInitialBehaviors(skel: Skeleton): Behavior[] {
  return [
    {
      id: 'wander',
      name: 'Wander',
      mode: 'loop',
      duration: 4,
      layers: [
        makeLayer('head-track', skel, 1, true),
        makeLayer('spine-wave', skel, 0.6),
        makeLayer('foot-planter', skel, 1),
        makeLayer('hip-sway', skel, 0.4),
        makeLayer('noise', skel, 0.3),
      ],
    },
    {
      id: 'hatch',
      name: 'Hatch',
      mode: 'timeline',
      duration: 4,
      layers: [
        { ...makeLayer('pose-blend', skel, 1, true), poseId: 'curled', timing: { start: 0, duration: 1.2, easeIn: 0, easeOut: 0.4 } },
        { ...makeLayer('spine-curl', skel, 0.8), timing: { start: 0.6, duration: 1.6, easeIn: 0.3, easeOut: 0.5 } },
        { ...makeLayer('idle-breath', skel, 1.2), timing: { start: 0, duration: 4, easeIn: 0.5, easeOut: 0 } },
        { ...makeLayer('pose-blend', skel, 1), poseId: 'alert', timing: { start: 2.4, duration: 1.6, easeIn: 0.6, easeOut: 0 } },
        { ...makeLayer('head-track', skel, 0.3), timing: { start: 2.8, duration: 1.2, easeIn: 0.4, easeOut: 0 } },
      ],
    },
    {
      id: 'idle',
      name: 'Idle',
      mode: 'loop',
      duration: 4,
      layers: [
        makeLayer('idle-breath', skel, 1, true),
        makeLayer('head-track', skel, 0.4),
        makeLayer('hip-sway', skel, 0.2),
        makeLayer('eye-blink', skel, 1),
      ],
    },
  ]
}

function MiniSlider({
  value,
  min,
  max,
  step,
  onChange,
  thumb = 'violet',
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  thumb?: 'violet' | 'cyan' | 'emerald'
}) {
  const thumbClass =
    thumb === 'cyan'
      ? '[&::-webkit-slider-thumb]:bg-cyan-400 [&::-moz-range-thumb]:bg-cyan-400'
      : thumb === 'emerald'
      ? '[&::-webkit-slider-thumb]:bg-emerald-400 [&::-moz-range-thumb]:bg-emerald-400'
      : '[&::-webkit-slider-thumb]:bg-violet-400 [&::-moz-range-thumb]:bg-violet-400'
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={cn(
        'w-full h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer',
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
        '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer',
        '[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
        thumbClass
      )}
    />
  )
}

function NumericRow({
  label,
  value,
  spec,
  onChange,
  prefix,
}: {
  label: string
  value: number
  spec: { min: number; max: number; step: number; unit?: string }
  onChange: (v: number) => void
  prefix?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[88px_1fr_60px] items-center gap-2 py-1">
      <div className="flex items-center gap-1.5 min-w-0">
        {prefix}
        <span className="text-[11px] text-white/40 truncate">{label}</span>
      </div>
      <MiniSlider value={value} min={spec.min} max={spec.max} step={spec.step} onChange={onChange} />
      <span className="text-[11px] font-mono text-white/70 text-right truncate">
        {value.toFixed(2)}
        {spec.unit && <span className="text-white/30 ml-0.5">{spec.unit}</span>}
      </span>
    </div>
  )
}

function ChipsRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: TargetOption[]
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-2 py-1">
      <span className="text-[11px] text-white/40 truncate pt-1">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap',
              value === opt.id
                ? 'bg-violet-500/20 text-violet-200 border-violet-500/40'
                : 'bg-white/3 text-white/45 border-white/10 hover:text-white/70'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ModeToggle({
  value,
  onChange,
  bindable,
}: {
  value: ParamMode
  onChange: (m: ParamMode) => void
  bindable: boolean
}) {
  const modes: { id: ParamMode; symbol: string; tip: string; disabled?: boolean }[] = [
    { id: 'constant', symbol: '=', tip: 'constant value' },
    { id: 'curve', symbol: '↗', tip: 'curve along chain (head → tail)' },
    { id: 'signal', symbol: '~', tip: 'bound to signal', disabled: !bindable },
  ]
  return (
    <div className="inline-flex items-center rounded border border-white/10 overflow-hidden shrink-0">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => !m.disabled && onChange(m.id)}
          disabled={m.disabled}
          title={m.tip}
          className={cn(
            'w-5 h-5 text-[10px] font-mono leading-none flex items-center justify-center transition-colors',
            value === m.id
              ? 'bg-violet-500/30 text-violet-200'
              : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white/65',
            m.disabled && 'opacity-30 cursor-not-allowed'
          )}
        >
          {m.symbol}
        </button>
      ))}
    </div>
  )
}

function ParamRow({
  label,
  spec,
  layerKey,
  layer,
  onUpdate,
  bindable,
}: {
  label: string
  spec: ParamSpec
  layerKey: string
  layer: Layer
  onUpdate: (patch: Partial<Layer>) => void
  bindable: boolean
}) {
  if (spec.kind === 'enum') {
    return (
      <ChipsRow
        label={label}
        value={(layer.params[layerKey] as string) ?? spec.options[0]}
        options={spec.options.map((o) => ({ id: o, label: o }))}
        onChange={(v) => onUpdate({ params: { ...layer.params, [layerKey]: v } })}
      />
    )
  }
  const mode = layer.paramModes[layerKey] ?? 'constant'
  const setMode = (m: ParamMode) => {
    const newModes = { ...layer.paramModes, [layerKey]: m }
    const newExtras = { ...layer.paramExtras }
    if (m === 'curve' && !newExtras[layerKey]) {
      const v = (layer.params[layerKey] as number) ?? spec.min
      newExtras[layerKey] = { head: v, tail: v }
    }
    if (m === 'signal' && !('signalId' in (newExtras[layerKey] ?? {}))) {
      newExtras[layerKey] = { signalId: 'energy', gain: 1, bias: 0 }
    }
    onUpdate({ paramModes: newModes, paramExtras: newExtras })
  }
  const toggle = <ModeToggle value={mode} onChange={setMode} bindable={bindable} />
  if (mode === 'curve') {
    const extra = (layer.paramExtras[layerKey] as CurveParam) ?? { head: spec.min, tail: spec.min }
    return (
      <div className="grid grid-cols-[88px_1fr] items-center gap-2 py-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {toggle}
          <span className="text-[11px] text-white/40 truncate">{label}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-violet-400/70 font-mono w-7 shrink-0">head</span>
            <MiniSlider
              value={extra.head}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              thumb="violet"
              onChange={(v) =>
                onUpdate({
                  paramExtras: { ...layer.paramExtras, [layerKey]: { ...extra, head: v } },
                })
              }
            />
            <span className="text-[10px] font-mono text-white/65 w-8 text-right">
              {extra.head.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-cyan-400/70 font-mono w-7 shrink-0">tail</span>
            <MiniSlider
              value={extra.tail}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              thumb="cyan"
              onChange={(v) =>
                onUpdate({
                  paramExtras: { ...layer.paramExtras, [layerKey]: { ...extra, tail: v } },
                })
              }
            />
            <span className="text-[10px] font-mono text-white/65 w-8 text-right">
              {extra.tail.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    )
  }
  if (mode === 'signal') {
    const extra =
      (layer.paramExtras[layerKey] as SignalParam) ?? { signalId: 'energy', gain: 1, bias: 0 }
    return (
      <div className="grid grid-cols-[88px_1fr] items-center gap-2 py-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {toggle}
          <span className="text-[11px] text-white/40 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={extra.signalId}
            onChange={(e) =>
              onUpdate({
                paramExtras: {
                  ...layer.paramExtras,
                  [layerKey]: { ...extra, signalId: e.target.value },
                },
              })
            }
            className="text-[10px] font-mono bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-violet-200 outline-none"
          >
            <optgroup label="Personality">
              {SIGNALS.filter((s) => s.category === 'personality').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="World">
              {SIGNALS.filter((s) => s.category === 'world').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          </select>
          <span className="text-[9px] text-white/30 font-mono">×</span>
          <MiniSlider
            value={extra.gain}
            min={0}
            max={2}
            step={0.05}
            thumb="emerald"
            onChange={(v) =>
              onUpdate({
                paramExtras: { ...layer.paramExtras, [layerKey]: { ...extra, gain: v } },
              })
            }
          />
          <span className="text-[10px] font-mono text-white/65 w-8 text-right">
            {extra.gain.toFixed(2)}
          </span>
        </div>
      </div>
    )
  }
  return (
    <NumericRow
      label={label}
      value={(layer.params[layerKey] as number) ?? spec.min}
      spec={spec}
      onChange={(v) => onUpdate({ params: { ...layer.params, [layerKey]: v } })}
      prefix={toggle}
    />
  )
}

function targetLabel(kind: LayerKind, target: string, skel: Skeleton): string {
  return targetsForLayer(kind, skel).find((t) => t.id === target)?.label ?? target
}

function PoseThumbnail({ pose, size = 56 }: { pose: PoseSpec; size?: number }) {
  const W = size
  const H = size
  const cx = W / 2
  const N = pose.spineDeflections.length
  const segLen = (H - 12) / Math.max(1, N - 1)
  const points = pose.spineDeflections.map((d, i) => {
    const x = cx + d * 18
    const y = 6 + i * segLen
    return { x, y }
  })
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="rounded bg-black/40 border border-white/8"
    >
      <path
        d={points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')}
        fill="none"
        stroke="#a78bfa"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 2.5 : 1.5} fill="#22d3ee" fillOpacity={0.8} />
      ))}
    </svg>
  )
}

function LayerHeader({
  layer,
  spec,
  skel,
  onUpdate,
  onRemove,
  onToggleMute,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  layer: Layer
  spec: LayerSpec
  skel: Skeleton
  onUpdate: (patch: Partial<Layer>) => void
  onRemove: () => void
  onToggleMute: () => void
  onToggleExpand: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const Icon = spec.icon
  const hasBindings = Object.values(layer.paramModes).some((m) => m === 'signal')
  const hasCurves = Object.values(layer.paramModes).some((m) => m === 'curve')
  return (
    <div className="flex items-center gap-2 p-2 sm:p-3">
      <button
        className="text-white/20 hover:text-white/50 cursor-grab touch-none shrink-0 hidden sm:block"
        aria-label="Drag handle"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onToggleExpand}
        className="text-white/40 hover:text-white/70 shrink-0"
        aria-label={layer.expanded ? 'Collapse' : 'Expand'}
      >
        {layer.expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
      <Icon className={cn('w-4 h-4 shrink-0', spec.color)} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white/85 truncate">{spec.name}</span>
          {layer.phaseDelay > 0 && (
            <span className="text-[9px] font-mono text-amber-300/70">
              +{layer.phaseDelay.toFixed(2)}s
            </span>
          )}
          {layer.drivenBy && (
            <span className="text-[9px] font-mono text-cyan-300/70">↪</span>
          )}
          {hasBindings && <span className="text-[9px] font-mono text-emerald-300/70">~</span>}
          {hasCurves && <span className="text-[9px] font-mono text-violet-300/70">↗</span>}
        </div>
        <span className="text-[10px] text-white/40 truncate font-mono">
          → {targetLabel(layer.kind, layer.target, skel)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-2 w-24">
          <MiniSlider
            value={layer.weight}
            min={0}
            max={1.5}
            step={0.05}
            onChange={(v) => onUpdate({ weight: v })}
          />
          <span className="text-[10px] font-mono text-white/60 w-7 text-right">
            {layer.weight.toFixed(2)}
          </span>
        </div>
        <button
          onClick={onToggleMute}
          className={cn(
            'p-1.5 rounded transition-colors',
            layer.muted
              ? 'text-white/30 hover:text-white/50'
              : 'text-emerald-400/70 hover:text-emerald-400'
          )}
          aria-label={layer.muted ? 'Unmute' : 'Mute'}
        >
          {layer.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <div className="hidden sm:flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="text-white/20 hover:text-white/60 disabled:opacity-20 leading-none"
            aria-label="Move up"
          >
            <ChevronDown className="w-3 h-3 rotate-180" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="text-white/20 hover:text-white/60 disabled:opacity-20 leading-none"
            aria-label="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 text-white/30 hover:text-rose-400 transition-colors"
          aria-label="Remove layer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function LayerExpanded({
  layer,
  spec,
  skel,
  behavior,
  poses,
  onUpdate,
}: {
  layer: Layer
  spec: LayerSpec
  skel: Skeleton
  behavior: Behavior
  poses: PoseSpec[]
  onUpdate: (patch: Partial<Layer>) => void
}) {
  const targets = targetsForLayer(layer.kind, skel)
  const otherLayers = behavior.layers.filter((l) => l.id !== layer.id)
  return (
    <div className="px-3 pb-3 pt-1 border-t border-white/5">
      <Section label="target">
        <div className="space-y-1">
          {targets.length > 1 && (
            <ChipsRow
              label="part"
              value={layer.target}
              options={targets}
              onChange={(v) => onUpdate({ target: v })}
            />
          )}
          {layer.kind === 'pose-blend' && (
            <ChipsRow
              label="pose"
              value={layer.poseId ?? '__none__'}
              options={[
                { id: '__none__', label: '—' },
                ...poses.map((p) => ({ id: p.id, label: p.name })),
              ]}
              onChange={(v) => onUpdate({ poseId: v === '__none__' ? undefined : v })}
            />
          )}
        </div>
      </Section>
      <Section label="timing">
        <div className="space-y-1">
          <NumericRow
            label="phase delay"
            value={layer.phaseDelay}
            spec={{ min: 0, max: 0.6, step: 0.02, unit: 's' }}
            onChange={(v) => onUpdate({ phaseDelay: v })}
          />
          <ChipsRow
            label="driven by"
            value={layer.drivenBy ?? '__global__'}
            options={[
              { id: '__global__', label: 'global clock' },
              ...otherLayers.map((l) => ({
                id: l.id,
                label: LAYER_SPECS[l.kind].name,
              })),
            ]}
            onChange={(v) => onUpdate({ drivenBy: v === '__global__' ? null : v })}
          />
          {behavior.mode === 'timeline' && layer.timing && (
            <>
              <NumericRow
                label="start"
                value={layer.timing.start}
                spec={{ min: 0, max: behavior.duration, step: 0.05, unit: 's' }}
                onChange={(v) =>
                  onUpdate({ timing: { ...layer.timing!, start: v } })
                }
              />
              <NumericRow
                label="duration"
                value={layer.timing.duration}
                spec={{ min: 0.1, max: behavior.duration, step: 0.05, unit: 's' }}
                onChange={(v) =>
                  onUpdate({ timing: { ...layer.timing!, duration: v } })
                }
              />
              <NumericRow
                label="ease in"
                value={layer.timing.easeIn}
                spec={{ min: 0, max: 1, step: 0.05, unit: 's' }}
                onChange={(v) =>
                  onUpdate({ timing: { ...layer.timing!, easeIn: v } })
                }
              />
              <NumericRow
                label="ease out"
                value={layer.timing.easeOut}
                spec={{ min: 0, max: 1, step: 0.05, unit: 's' }}
                onChange={(v) =>
                  onUpdate({ timing: { ...layer.timing!, easeOut: v } })
                }
              />
            </>
          )}
        </div>
      </Section>
      {Object.keys(spec.params).length > 0 && (
        <Section label="parameters">
          <div className="space-y-1">
            {Object.entries(spec.params).map(([key, ps]) => (
              <ParamRow
                key={key}
                label={key}
                spec={ps}
                layerKey={key}
                layer={layer}
                onUpdate={onUpdate}
                bindable={(spec.bindable ?? []).includes(key)}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5 mt-1">
        {label}
      </div>
      {children}
    </div>
  )
}

function LayerCard(props: {
  layer: Layer
  skel: Skeleton
  behavior: Behavior
  poses: PoseSpec[]
  onUpdate: (patch: Partial<Layer>) => void
  onRemove: () => void
  onToggleMute: () => void
  onToggleExpand: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const spec = LAYER_SPECS[props.layer.kind]
  return (
    <div
      className={cn(
        'rounded-lg border bg-black/20 transition-colors',
        props.layer.muted ? 'border-white/5 opacity-50' : 'border-white/10'
      )}
    >
      <LayerHeader {...props} spec={spec} />
      {!props.layer.muted && props.layer.expanded === false && props.layer.weight === 0 ? null : null}
      <div className="md:hidden px-3 pb-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-white/30">weight</span>
        <MiniSlider
          value={props.layer.weight}
          min={0}
          max={1.5}
          step={0.05}
          onChange={(v) => props.onUpdate({ weight: v })}
        />
        <span className="text-[10px] font-mono text-white/60 w-7 text-right">
          {props.layer.weight.toFixed(2)}
        </span>
      </div>
      {props.layer.expanded && (
        <LayerExpanded
          layer={props.layer}
          spec={spec}
          skel={props.skel}
          behavior={props.behavior}
          poses={props.poses}
          onUpdate={props.onUpdate}
        />
      )}
    </div>
  )
}

function PaletteItem({ kind, onClick }: { kind: LayerKind; onClick: () => void }) {
  const spec = LAYER_SPECS[kind]
  const Icon = spec.icon
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-white/8 bg-black/20 hover:bg-white/5 hover:border-white/20 transition-all text-left group"
    >
      <Icon className={cn('w-4 h-4 shrink-0', spec.color)} />
      <span className="text-sm text-white/75 truncate">{spec.name}</span>
      <Plus className="w-3.5 h-3.5 ml-auto text-white/20 group-hover:text-white/60 shrink-0" />
    </button>
  )
}

function PosesPanel({
  poses,
  onAdd,
  onApply,
}: {
  poses: PoseSpec[]
  onAdd: () => void
  onApply: (poseId: string) => void
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5 text-violet-300/80 hover:text-violet-200 hover:bg-violet-500/10 transition-all text-xs"
      >
        <Save className="w-3.5 h-3.5" />
        Capture pose from current state
      </button>
      <div className="space-y-1.5">
        {poses.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2.5 p-2 rounded-lg border border-white/8 bg-black/20"
          >
            <PoseThumbnail pose={p} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/85 truncate">{p.name}</div>
              <div className="text-[10px] text-white/40 leading-snug">{p.description}</div>
            </div>
            <button
              onClick={() => onApply(p.id)}
              className="text-[10px] px-2 py-1 rounded border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition-colors shrink-0"
            >
              Use
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SignalRow({
  signal,
  liveValue,
  controlled,
  onChange,
}: {
  signal: SignalDef
  liveValue: number
  controlled: boolean
  onChange?: (v: number) => void
}) {
  const t = (liveValue - signal.min) / (signal.max - signal.min || 1)
  const norm = Math.max(0, Math.min(1, t))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/55 font-mono">{signal.label}</span>
        <span className="text-white/65 font-mono">
          {liveValue.toFixed(2)}
          {signal.unit && <span className="text-white/30 ml-0.5">{signal.unit}</span>}
        </span>
      </div>
      {controlled && onChange ? (
        <MiniSlider
          value={liveValue}
          min={signal.min}
          max={signal.max}
          step={0.01}
          thumb="emerald"
          onChange={onChange}
        />
      ) : (
        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400/60 rounded-full transition-all"
            style={{ width: `${norm * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

function SignalsPanel({
  personality,
  onPersonalityChange,
  worldSignals,
}: {
  personality: Personality
  onPersonalityChange: (p: Personality) => void
  worldSignals: Record<string, number>
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
          Personality dials
        </div>
        <div className="space-y-3">
          {SIGNALS.filter((s) => s.category === 'personality').map((s) => (
            <SignalRow
              key={s.id}
              signal={s}
              liveValue={(personality as unknown as Record<string, number>)[s.id] ?? 0}
              controlled
              onChange={(v) => onPersonalityChange({ ...personality, [s.id]: v })}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
          World signals
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse" />
        </div>
        <div className="space-y-3">
          {SIGNALS.filter((s) => s.category === 'world').map((s) => (
            <SignalRow
              key={s.id}
              signal={s}
              liveValue={worldSignals[s.id] ?? 0}
              controlled={false}
            />
          ))}
        </div>
      </div>
      <div className="border-t border-white/8 pt-3 text-[10px] text-white/35 leading-relaxed">
        Bind any layer parameter to one of these signals via the <span className="font-mono text-emerald-300/80">~</span> mode toggle on its parameter row.
      </div>
    </div>
  )
}

function TriggersPanel({
  triggers,
  behaviors,
  onUpdate,
  onRemove,
  onAdd,
}: {
  triggers: TriggerSpec[]
  behaviors: Behavior[]
  onUpdate: (id: string, patch: Partial<TriggerSpec>) => void
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 text-emerald-300/80 hover:text-emerald-200 hover:bg-emerald-500/10 transition-all text-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        New trigger rule
      </button>
      <div className="space-y-1.5">
        {triggers.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-white/8 bg-black/20 p-2.5 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-emerald-400/70 shrink-0" />
              <select
                value={t.event}
                onChange={(e) => onUpdate(t.id, { event: e.target.value })}
                className="flex-1 text-[11px] font-mono bg-black/40 border border-white/10 rounded px-1.5 py-1 text-white/85 outline-none"
              >
                {EVENT_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onRemove(t.id)}
                className="text-white/30 hover:text-rose-400 transition-colors shrink-0"
                aria-label="Remove trigger"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 font-mono shrink-0">→</span>
              <select
                value={t.action}
                onChange={(e) => onUpdate(t.id, { action: e.target.value })}
                className="flex-1 text-[11px] font-mono bg-black/40 border border-white/10 rounded px-1.5 py-1 text-violet-200 outline-none"
              >
                <optgroup label="Switch behavior">
                  {behaviors.map((b) => (
                    <option key={`s-${b.id}`} value={`switch:${b.name}`}>
                      switch:{b.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Fire clip">
                  {behaviors
                    .filter((b) => b.mode === 'timeline')
                    .map((b) => (
                      <option key={`f-${b.id}`} value={`fire:${b.name}`}>
                        fire:{b.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Modulate">
                  {SIGNALS.filter((s) => s.category === 'personality').map((s) => (
                    <option key={`m-${s.id}`} value={`modulate:${s.id}`}>
                      modulate:{s.id}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            {(t.event === 'idle_seconds' ||
              t.event === 'velocity_above' ||
              t.event === 'distance_below' ||
              t.event === 'turn_above') && (
              <NumericRow
                label="threshold"
                value={t.threshold}
                spec={{ min: 0, max: 10, step: 0.1 }}
                onChange={(v) => onUpdate(t.id, { threshold: v })}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function spineMask(target: string, skel: Skeleton): number[] {
  const N = skel.spineGroups.length
  const mask = new Array(N).fill(0)
  if (target === 'all') return mask.fill(1)
  if (target === 'tail') {
    for (let i = 0; i < N; i++) {
      const g = skel.spineGroups[i]
      const t = i / Math.max(1, N - 1)
      mask[i] = g.type === 'tail' ? 1 : t < 0.5 ? 0 : Math.pow((t - 0.5) * 2, 1.6)
    }
    return mask
  }
  if (target === 'head') {
    for (let i = 0; i < N; i++) {
      const g = skel.spineGroups[i]
      const t = i / Math.max(1, N - 1)
      mask[i] = g.type === 'head' ? 1 : t > 0.4 ? 0 : Math.pow((0.4 - t) / 0.4, 1.6)
    }
    return mask
  }
  if (target === 'mid') {
    for (let i = 0; i < N; i++) {
      const t = i / Math.max(1, N - 1)
      mask[i] = Math.max(0, 1 - Math.abs(t - 0.5) * 4)
    }
    return mask
  }
  if (target.startsWith('g:')) {
    const id = target.slice(2)
    const idx = skel.spineGroups.findIndex((g) => g.id === id)
    if (idx >= 0) {
      mask[idx] = 1
      if (idx > 0) mask[idx - 1] = 0.4
      if (idx < N - 1) mask[idx + 1] = 0.4
    }
    return mask
  }
  return mask
}

function hipMask(target: string, skel: Skeleton): number[] {
  const N = skel.spineGroups.length
  const mask = new Array(N).fill(0)
  const hipIds = new Set(skel.legPairs.map((p) => p.attachedToId))
  if (target === 'all') {
    skel.spineGroups.forEach((g, i) => {
      if (hipIds.has(g.id)) mask[i] = 1
    })
    return mask
  }
  if (target.startsWith('g:')) {
    const id = target.slice(2)
    const idx = skel.spineGroups.findIndex((g) => g.id === id)
    if (idx >= 0) mask[idx] = 1
    return mask
  }
  return mask
}

function legPairMatches(target: string, pairId: string): boolean {
  if (target === 'all') return true
  if (target.startsWith('pair:')) return target.slice(5) === pairId
  return false
}

function gaitPhases(gait: string): [number, number, number, number] {
  if (gait === 'trot') return [0, 0.5, 0.5, 0]
  if (gait === 'pace') return [0, 0.5, 0, 0.5]
  if (gait === 'gallop') return [0, 0.07, 0.5, 0.57]
  return [0, 0.5, 0.75, 0.25]
}

function resolveParam(
  layer: Layer,
  key: string,
  jointT: number,
  signals: Record<string, number>
): number {
  const mode = layer.paramModes[key] ?? 'constant'
  if (mode === 'curve') {
    const e = layer.paramExtras[key] as CurveParam | undefined
    if (e) return e.head + (e.tail - e.head) * jointT
  }
  if (mode === 'signal') {
    const e = layer.paramExtras[key] as SignalParam | undefined
    const base = (layer.params[key] as number) ?? 0
    if (e) {
      const sig = signals[e.signalId] ?? 0
      const def = SIGNALS.find((s) => s.id === e.signalId)
      const norm = def ? (sig - def.min) / (def.max - def.min || 1) : sig
      return base * (e.bias + Math.max(0, Math.min(1, norm)) * e.gain)
    }
    return base
  }
  return (layer.params[key] as number) ?? 0
}

function SkeletonPreview({
  layers,
  skel,
  time,
  signals,
  poses,
}: {
  layers: Layer[]
  skel: Skeleton
  time: number
  signals: Record<string, number>
  poses: PoseSpec[]
}) {
  const W = 480
  const H = 280
  const cx = W / 2
  const topY = 30
  const span = H - 60
  const N = skel.spineGroups.length
  const halfW = 28

  const computed = useMemo(() => {
    const segLen = span / Math.max(1, N - 1)
    const breath = layers.find((l) => l.kind === 'idle-breath' && !l.muted)
    const breathScale = breath
      ? 1 +
        Math.sin(time * (breath.params.rate as number) * Math.PI * 2) *
          (breath.params.depth as number) *
          breath.weight *
          0.4
      : 1

    const joints: { x: number; y: number; group: SpineGroup }[] = []
    for (let i = 0; i < N; i++) {
      const x = cx
      const y = topY + i * segLen * breathScale
      joints.push({ x, y, group: skel.spineGroups[i] })
    }

    for (const l of layers.filter((l) => !l.muted)) {
      const tForLayer = time + l.phaseDelay
      if (l.kind === 'spine-wave') {
        const mask = spineMask(l.target, skel)
        for (let i = 0; i < N; i++) {
          const tj = N > 1 ? i / (N - 1) : 0
          const a = resolveParam(l, 'amplitude', tj, signals) * l.weight * 36
          const f = resolveParam(l, 'frequency', tj, signals)
          const ps = (l.params.phaseSpeed as number) ?? 1
          joints[i].x += Math.sin(tForLayer * f * Math.PI * 2 + i * ps * 0.5) * a * mask[i]
        }
      } else if (l.kind === 'spine-curl') {
        const mask = spineMask(l.target, skel)
        for (let i = 0; i < N; i++) {
          const tj = N > 1 ? i / (N - 1) : 0
          const amount = resolveParam(l, 'amount', tj, signals) * l.weight * 70
          const ease = (l.params.easing as number) ?? 0.5
          const t = i / Math.max(1, N - 1)
          joints[i].x += Math.pow(t, 1 + ease * 2) * amount * mask[i]
        }
      } else if (l.kind === 'tail-curl') {
        const c = (l.params.curvature as number) * l.weight * 50
        const p = l.params.propagation as number
        for (let i = 0; i < N; i++) {
          const g = skel.spineGroups[i]
          const t = i / Math.max(1, N - 1)
          if (g.type !== 'tail' && t < 0.6) continue
          const tt = Math.max(0, (t - 0.5) * 2)
          joints[i].x += Math.sin(tForLayer * 1.5 + tt * p * 6) * c * tt
        }
      } else if (l.kind === 'hip-sway') {
        const mask = hipMask(l.target, skel)
        const a = (l.params.amplitude as number) * l.weight * 24
        const f = (l.params.frequency as number) ?? 1
        for (let i = 0; i < N; i++) {
          if (mask[i] > 0) {
            const sign =
              i ===
              skel.spineGroups.findIndex((g) => g.id === skel.legPairs[0]?.attachedToId)
                ? 1
                : -1
            joints[i].x += Math.cos(tForLayer * f * Math.PI * 2) * a * mask[i] * sign
          }
        }
      } else if (l.kind === 'head-track') {
        const a = l.weight * 10
        joints[0].x += Math.sin(tForLayer * 0.7) * a
      } else if (l.kind === 'pose-blend' && l.poseId) {
        const pose = poses.find((p) => p.id === l.poseId)
        if (pose) {
          const amt = (l.params.amount as number) * l.weight
          for (let i = 0; i < Math.min(N, pose.spineDeflections.length); i++) {
            joints[i].x += pose.spineDeflections[i] * amt * 30
          }
        }
      } else if (l.kind === 'noise') {
        const mask = spineMask(l.target, skel)
        const a = (l.params.amplitude as number) * l.weight * 24
        const f = (l.params.frequency as number) ?? 1
        for (let i = 0; i < N; i++) {
          const seed = i * 12.345 + tForLayer * f * 6
          const n = Math.sin(seed) * 0.5 + Math.sin(seed * 2.7) * 0.25 + Math.sin(seed * 5.3) * 0.125
          joints[i].x += n * a * mask[i]
        }
      }
    }

    const legs: {
      anchorX: number
      anchorY: number
      footX: number
      footY: number
      lifted: number
      label: string
      weight: number
    }[] = []

    skel.legPairs.forEach((pair, pairIdx) => {
      let cadence = 0
      let stride = 0
      let lift = 0
      let weight = 0
      let gait = 'walk'
      for (const l of layers) {
        if (l.muted || l.kind !== 'foot-planter') continue
        if (!legPairMatches(l.target, pair.id)) continue
        const c = resolveParam(l, 'cadence', 0.5, signals)
        cadence = Math.max(cadence, c * l.weight)
        const s = resolveParam(l, 'stride', 0.5, signals)
        stride = Math.max(stride, s * 14)
        lift = Math.max(lift, (l.params.lift as number) * l.weight)
        weight = Math.max(weight, l.weight)
        gait = l.params.gait as string
      }
      const ph = gaitPhases(gait)
      const phaseL = pairIdx === 0 ? ph[0] : ph[2]
      const phaseR = pairIdx === 0 ? ph[1] : ph[3]
      const hipIdx = skel.spineGroups.findIndex((g) => g.id === pair.attachedToId)
      if (hipIdx < 0) return
      const hip = joints[hipIdx]
      const labelL = pairIdx === 0 ? 'FL' : 'BL'
      const labelR = pairIdx === 0 ? 'FR' : 'BR'
      legs.push(makeLeg(hip, -1, halfW, (time * cadence + phaseL) % 1, stride, lift, labelL, weight))
      legs.push(makeLeg(hip, 1, halfW, (time * cadence + phaseR) % 1, stride, lift, labelR, weight))
    })

    return { joints, legs }
  }, [layers, skel, time, N, signals, poses])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="spineGradFinal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a78bfa" stopOpacity="0.95" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <line x1={cx} y1={0} x2={cx} y2={H} stroke="#ffffff08" strokeDasharray="2 4" />

      {computed.legs.map((leg, i) => (
        <g key={i}>
          <line
            x1={leg.anchorX}
            y1={leg.anchorY}
            x2={leg.footX}
            y2={leg.footY}
            stroke="#ffffff20"
            strokeWidth={1.5}
            strokeOpacity={0.4 + leg.weight * 0.4}
          />
          <circle
            cx={leg.footX}
            cy={leg.footY}
            r={5 + leg.lifted * 2}
            fill={leg.lifted > 0.3 ? 'transparent' : '#34d399'}
            stroke="#34d399"
            strokeWidth={1.5}
            opacity={0.4 + leg.weight * 0.6}
          />
        </g>
      ))}

      <path
        d={computed.joints
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(' ')}
        fill="none"
        stroke="url(#spineGradFinal)"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {computed.joints.map((p, i) => {
        const isHead = p.group.type === 'head'
        const isTailEnd = p.group.type === 'tail'
        const hipIds = new Set(skel.legPairs.map((lp) => lp.attachedToId))
        const isHip = hipIds.has(p.group.id)
        const r = isHead ? 8 : isHip ? 6 : isTailEnd ? 4 : 4
        const fill = isHead ? '#a78bfa' : isHip ? '#fbbf24' : isTailEnd ? '#22d3ee99' : '#22d3ee'
        return <circle key={i} cx={p.x} cy={p.y} r={r} fill={fill} fillOpacity={isHead ? 1 : 0.85} />
      })}
    </svg>
  )
}

function makeLeg(
  hip: { x: number; y: number },
  side: -1 | 1,
  halfW: number,
  phase: number,
  stride: number,
  lift: number,
  label: string,
  weight: number
) {
  const anchorX = hip.x + side * halfW
  const anchorY = hip.y
  const stepY = Math.sin(phase * Math.PI * 2) * stride
  const liftAmt = Math.max(0, Math.sin(phase * Math.PI)) * lift
  const footX = anchorX + side * (halfW * 0.9)
  const footY = anchorY + stepY
  return { anchorX, anchorY, footX, footY, lifted: liftAmt, label, weight }
}

function TimelineTrack({
  behavior,
  playhead,
}: {
  behavior: Behavior
  playhead: number
}) {
  const lanes = behavior.layers.slice().reverse()
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-300/80" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/80">
            Timeline · {behavior.duration.toFixed(1)}s
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-300/60">
          {playhead.toFixed(2)}s
        </span>
      </div>
      <div className="space-y-1">
        {lanes.map((l) => {
          const t = l.timing ?? { start: 0, duration: behavior.duration, easeIn: 0, easeOut: 0 }
          const left = (t.start / behavior.duration) * 100
          const width = (t.duration / behavior.duration) * 100
          const spec = LAYER_SPECS[l.kind]
          const Icon = spec.icon
          return (
            <div key={l.id} className="relative h-5 rounded bg-black/30 border border-white/5">
              <div
                className="absolute inset-y-0 rounded flex items-center gap-1.5 pl-1.5 pr-2 overflow-hidden"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: l.muted ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.18)',
                  borderLeft: '2px solid rgba(167,139,250,0.5)',
                }}
              >
                <Icon className={cn('w-3 h-3 shrink-0', spec.color, l.muted && 'opacity-40')} />
                <span
                  className={cn(
                    'text-[9px] font-mono truncate',
                    l.muted ? 'text-white/30' : 'text-white/75'
                  )}
                >
                  {spec.name}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div
        className="relative h-1 mt-2 bg-white/5 rounded-full"
      >
        <div
          className="absolute top-0 h-full w-0.5 bg-cyan-400 rounded-full"
          style={{ left: `${(playhead / behavior.duration) * 100}%` }}
        />
      </div>
    </div>
  )
}

type SidebarTab = 'components' | 'poses' | 'signals' | 'triggers'

const TAB_DEFS: { id: SidebarTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'components', label: 'Components', icon: LayersIcon },
  { id: 'poses', label: 'Poses', icon: Bookmark },
  { id: 'signals', label: 'Signals', icon: SlidersHorizontal },
  { id: 'triggers', label: 'Triggers', icon: Radio },
]

export default function WireframePage() {
  const [skelIndex, setSkelIndex] = useState(0)
  const skel = PRESET_SKELETONS[skelIndex]
  const [behaviors, setBehaviors] = useState<Behavior[]>(() => makeInitialBehaviors(PRESET_SKELETONS[0]))
  const [activeBehaviorId, setActiveBehaviorId] = useState<string>('wander')
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('components')
  const [time, setTime] = useState(0)
  const [copied, setCopied] = useState(false)
  const [personality, setPersonality] = useState<Personality>(DEFAULT_PERSONALITY)
  const [poses, setPoses] = useState<PoseSpec[]>(SAMPLE_POSES)
  const [triggers, setTriggers] = useState<TriggerSpec[]>(SAMPLE_TRIGGERS)
  const [springsOpen, setSpringsOpen] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setPaletteOpen(false)
    }
  }, [])

  useEffect(() => {
    const tick = (t: number) => {
      if (startedRef.current === null) startedRef.current = t
      setTime((t - startedRef.current) / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    setBehaviors((prev) =>
      prev.map((b) => ({
        ...b,
        layers: b.layers.map((l) => {
          const valid = targetsForLayer(l.kind, skel).map((t) => t.id)
          return valid.includes(l.target)
            ? l
            : { ...l, target: defaultTargetFor(l.kind, skel) }
        }),
      }))
    )
  }, [skel])

  const active = behaviors.find((b) => b.id === activeBehaviorId) ?? behaviors[0]
  const playhead = active.mode === 'timeline' ? time % active.duration : 0

  const worldSignals = useMemo(
    () => ({
      velocity: 1.5 + Math.sin(time * 0.4) * 1.2 + 1.5,
      distance: 4 + Math.cos(time * 0.3) * 3,
      turnRate: Math.sin(time * 0.6) * 1.5,
      idleTime: (time % 8),
    }),
    [time]
  )

  const allSignals = useMemo(
    () => ({
      ...worldSignals,
      energy: personality.energy,
      alertness: personality.alertness,
      weight: personality.weight,
      mood: personality.mood,
    }),
    [worldSignals, personality]
  )

  const updateActive = (mut: (b: Behavior) => Behavior) =>
    setBehaviors((prev) => prev.map((b) => (b.id === active.id ? mut(b) : b)))

  const updateLayer = (layerId: string, patch: Partial<Layer>) =>
    updateActive((b) => ({
      ...b,
      layers: b.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
    }))

  const removeLayer = (layerId: string) =>
    updateActive((b) => ({ ...b, layers: b.layers.filter((l) => l.id !== layerId) }))

  const moveLayer = (layerId: string, dir: -1 | 1) =>
    updateActive((b) => {
      const idx = b.layers.findIndex((l) => l.id === layerId)
      if (idx < 0) return b
      const ni = idx + dir
      if (ni < 0 || ni >= b.layers.length) return b
      const next = [...b.layers]
      ;[next[idx], next[ni]] = [next[ni], next[idx]]
      return { ...b, layers: next }
    })

  const addLayer = (kind: LayerKind) =>
    updateActive((b) => ({ ...b, layers: [makeLayer(kind, skel, 1, true), ...b.layers] }))

  const addBehavior = () => {
    const id = uid('behavior')
    const name = `Behavior ${behaviors.length + 1}`
    const newB: Behavior = {
      id,
      name,
      mode: 'loop',
      duration: 4,
      layers: [makeLayer('idle-breath', skel, 1, true)],
    }
    setBehaviors((prev) => [...prev, newB])
    setActiveBehaviorId(id)
  }

  const removeBehavior = (id: string) => {
    if (behaviors.length <= 1) return
    setBehaviors((prev) => prev.filter((b) => b.id !== id))
    if (activeBehaviorId === id) {
      const fallback = behaviors.find((b) => b.id !== id)
      if (fallback) setActiveBehaviorId(fallback.id)
    }
  }

  const setBehaviorMode = (mode: 'loop' | 'timeline') => updateActive((b) => ({ ...b, mode }))
  const setBehaviorDuration = (duration: number) => updateActive((b) => ({ ...b, duration }))

  const applyPose = (poseId: string) => {
    updateActive((b) => ({
      ...b,
      layers: [
        { ...makeLayer('pose-blend', skel, 1, true), poseId },
        ...b.layers,
      ],
    }))
  }

  const addPose = () => {
    setPoses((prev) => [
      ...prev,
      {
        id: uid('pose'),
        name: `Pose ${prev.length + 1}`,
        description: 'Captured from current preview state',
        spineDeflections: skel.spineGroups.map((_, i) => Math.sin(i * 0.7) * 0.3),
        curvature: 0.2,
      },
    ])
  }

  const updateTrigger = (id: string, patch: Partial<TriggerSpec>) =>
    setTriggers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const removeTrigger = (id: string) =>
    setTriggers((prev) => prev.filter((t) => t.id !== id))

  const addTrigger = () =>
    setTriggers((prev) => [
      ...prev,
      { id: uid('trig'), event: 'click_target', action: 'fire:Hatch', threshold: 0 },
    ])

  const updateSpring = (groupId: string, patch: Partial<SpringConfig>) => {
    PRESET_SKELETONS[skelIndex].springs = {
      ...skel.springs,
      [groupId]: { ...skel.springs[groupId], ...patch },
    }
    setBehaviors((b) => [...b])
  }

  const drive = useMemo(() => {
    const ls = active.layers.filter((l) => !l.muted)
    let cadence = 0
    let spineAmp = 0
    let gait = '—'
    for (const l of ls) {
      if (l.kind === 'foot-planter') {
        cadence += (l.params.cadence as number) * l.weight
        gait = l.params.gait as string
      }
      if (l.kind === 'spine-wave') spineAmp += (l.params.amplitude as number) * l.weight
    }
    return { cadence, spineAmp, gait, layerCount: ls.length }
  }, [active.layers])

  const handleCopy = async () => {
    const json = JSON.stringify(
      {
        skeleton: { id: skel.id, name: skel.name, springs: skel.springs },
        personality,
        triggers,
        behavior: {
          name: active.name,
          mode: active.mode,
          duration: active.duration,
          layers: active.layers.map((l) => ({
            kind: l.kind,
            target: l.target,
            weight: l.weight,
            muted: l.muted,
            phaseDelay: l.phaseDelay,
            drivenBy: l.drivenBy,
            paramModes: l.paramModes,
            paramExtras: l.paramExtras,
            params: l.params,
            timing: active.mode === 'timeline' ? l.timing : undefined,
            poseId: l.poseId,
          })),
        },
      },
      null,
      2
    )
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="h-screen bg-[#0f0f12] text-white flex flex-col overflow-hidden">
      <header className="border-b border-white/8 px-3 sm:px-4 md:px-6 py-2.5 flex items-center gap-2 md:gap-3 shrink-0 z-30 bg-[#1a1a1f]">
        <Zap className="w-4 h-4 text-violet-400 shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">Motion Composer</span>
        <span className="text-[10px] text-white/30 hidden md:inline font-mono">
          step 3 · animate
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-white/40 font-mono">
            <span title="energy">⚡{personality.energy.toFixed(2)}</span>
            <span title="alertness">◎{personality.alertness.toFixed(2)}</span>
            <span title="weight">⊕{personality.weight.toFixed(2)}</span>
            <span title="mood">♡{personality.mood.toFixed(2)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{drive.layerCount} · {drive.gait}</span>
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all border',
              copied
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/85'
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Export'}</span>
          </button>
          <button
            onClick={() => setPaletteOpen((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={paletteOpen ? 'Close panel' : 'Open panel'}
          >
            {paletteOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 border-b border-white/8 shrink-0 overflow-x-auto bg-[#15151a]">
        {behaviors.map((b) => (
          <div
            key={b.id}
            className={cn(
              'flex items-center rounded-md transition-colors shrink-0',
              b.id === activeBehaviorId
                ? 'bg-violet-500/15 border border-violet-500/40'
                : 'bg-white/3 border border-white/5 hover:bg-white/5'
            )}
          >
            <button
              onClick={() => setActiveBehaviorId(b.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                b.id === activeBehaviorId ? 'text-violet-200' : 'text-white/55'
              )}
            >
              {b.mode === 'timeline' ? (
                <Timer className="w-3 h-3 text-cyan-300/80" />
              ) : (
                <Circle className="w-3 h-3 text-emerald-300/60" />
              )}
              {b.name}
              <span className="ml-1 text-[10px] text-white/30 font-mono">{b.layers.length}</span>
            </button>
            {behaviors.length > 1 && (
              <button
                onClick={() => removeBehavior(b.id)}
                className="px-1.5 py-1.5 text-white/25 hover:text-rose-400 transition-colors"
                aria-label="Remove behavior"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addBehavior}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 rounded-md transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New behavior</span>
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <main
          className={cn(
            'h-full overflow-y-auto transition-all duration-200',
            paletteOpen && 'md:mr-80'
          )}
        >
          <div className="max-w-3xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="rounded-xl border border-white/8 bg-black/20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-white/5">
                <ArrowLeft className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                  Skeleton from step 2
                </span>
                <button className="ml-auto text-[10px] text-violet-300/70 hover:text-violet-200 underline underline-offset-2">
                  Edit nodes
                </button>
              </div>
              <div className="p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-white/30 mr-1">model:</span>
                  {PRESET_SKELETONS.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setSkelIndex(i)}
                      className={cn(
                        'px-2 py-0.5 text-[10px] rounded font-medium border transition-colors',
                        i === skelIndex
                          ? 'bg-violet-500/20 text-violet-200 border-violet-500/40'
                          : 'bg-white/3 text-white/45 border-white/10 hover:text-white/70'
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div className="text-white/30 uppercase tracking-widest mb-1 text-[9px]">
                      Spine groups ({skel.spineGroups.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {skel.spineGroups.map((g) => (
                        <span
                          key={g.id}
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-mono',
                            g.type === 'head'
                              ? 'bg-violet-500/15 text-violet-300'
                              : g.type === 'tail'
                              ? 'bg-cyan-500/10 text-cyan-300/80'
                              : 'bg-white/5 text-white/55'
                          )}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30 uppercase tracking-widest mb-1 text-[9px]">
                      Leg pairs ({skel.legPairs.length})
                    </div>
                    <div className="space-y-1">
                      {skel.legPairs.map((p) => {
                        const hip = skel.spineGroups.find((g) => g.id === p.attachedToId)
                        return (
                          <div key={p.id} className="flex items-center gap-2 text-[10px] font-mono">
                            <Footprints className="w-3 h-3 text-emerald-400/70" />
                            <span className="text-white/65">{p.name}</span>
                            <span className="text-white/30">→</span>
                            <span className="text-amber-300/80">{hip?.name ?? p.attachedToId}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSpringsOpen((v) => !v)}
                  className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                >
                  {springsOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span className="uppercase tracking-widest font-semibold">Body physics</span>
                  <span className="font-mono text-white/30">— per-group springs</span>
                </button>
                {springsOpen && (
                  <div className="border border-white/8 rounded-lg p-3 bg-black/20 space-y-1">
                    {skel.spineGroups.map((g) => (
                      <div key={g.id} className="grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                        <span className="text-[11px] text-white/65 truncate">{g.name}</span>
                        <NumericRow
                          label="stiffness"
                          value={skel.springs[g.id]?.stiffness ?? 0.5}
                          spec={{ min: 0, max: 1, step: 0.05 }}
                          onChange={(v) => updateSpring(g.id, { stiffness: v })}
                        />
                        <NumericRow
                          label="damping"
                          value={skel.springs[g.id]?.damping ?? 0.4}
                          spec={{ min: 0, max: 1, step: 0.05 }}
                          onChange={(v) => updateSpring(g.id, { damping: v })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-gradient-to-b from-black/40 to-black/20 overflow-hidden">
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/5">
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                  Live preview · top-down
                </span>
                <span className="text-[10px] font-mono text-white/30">
                  {drive.layerCount} layer{drive.layerCount === 1 ? '' : 's'} · {drive.gait}
                </span>
              </div>
              <div className="aspect-[16/9] sm:aspect-[16/8] flex items-center justify-center p-2">
                <SkeletonPreview layers={active.layers} skel={skel} time={time} signals={allSignals} poses={poses} />
              </div>
              <div className="px-3 sm:px-4 py-1.5 border-t border-white/5 flex items-center gap-3 text-[9px] font-mono text-white/35">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-400" /> head
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> hip
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400/60" /> spine
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> foot
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
                  {active.name}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-md border border-white/10 overflow-hidden">
                    <button
                      onClick={() => setBehaviorMode('loop')}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors',
                        active.mode === 'loop'
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : 'text-white/40 hover:text-white/65'
                      )}
                    >
                      <Circle className="w-3 h-3" />
                      Loop
                    </button>
                    <button
                      onClick={() => setBehaviorMode('timeline')}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors',
                        active.mode === 'timeline'
                          ? 'bg-cyan-500/15 text-cyan-200'
                          : 'text-white/40 hover:text-white/65'
                      )}
                    >
                      <Timer className="w-3 h-3" />
                      Timeline
                    </button>
                  </div>
                  {active.mode === 'timeline' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                      <span>dur</span>
                      <input
                        type="number"
                        value={active.duration}
                        min={0.5}
                        max={20}
                        step={0.5}
                        onChange={(e) => setBehaviorDuration(parseFloat(e.target.value) || 1)}
                        className="w-12 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-white/85 font-mono outline-none"
                      />
                      <span>s</span>
                    </div>
                  )}
                </div>
              </div>

              {active.mode === 'timeline' && (
                <TimelineTrack behavior={active} playhead={playhead} />
              )}

              {active.layers.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
                  No layers. Add one from the components palette →
                </div>
              )}
              <div className="space-y-1.5">
                {active.layers.map((layer, i) => (
                  <LayerCard
                    key={layer.id}
                    layer={layer}
                    skel={skel}
                    behavior={active}
                    poses={poses}
                    onUpdate={(patch) => updateLayer(layer.id, patch)}
                    onRemove={() => removeLayer(layer.id)}
                    onToggleMute={() => updateLayer(layer.id, { muted: !layer.muted })}
                    onToggleExpand={() => updateLayer(layer.id, { expanded: !layer.expanded })}
                    onMoveUp={() => moveLayer(layer.id, -1)}
                    onMoveDown={() => moveLayer(layer.id, 1)}
                    canMoveUp={i > 0}
                    canMoveDown={i < active.layers.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>

        <aside
          className={cn(
            'absolute inset-y-0 right-0 z-20 w-full sm:w-80 bg-[#1a1a1f] border-l border-white/8 flex flex-col shrink-0 transition-transform duration-200 will-change-transform',
            paletteOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          aria-hidden={!paletteOpen}
        >
          <div className="flex border-b border-white/8 shrink-0">
            {TAB_DEFS.map((t) => {
              const Icon = t.icon
              const active = sidebarTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSidebarTab(t.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[9px] uppercase tracking-widest font-semibold transition-colors',
                    active
                      ? 'bg-black/30 text-violet-200 border-b-2 border-violet-400'
                      : 'text-white/40 hover:text-white/70 border-b-2 border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-3">
            {sidebarTab === 'components' && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-white/30 mb-1 px-1">
                  Tap to add a layer to <span className="text-violet-300">{active.name}</span>
                </div>
                {(Object.keys(LAYER_SPECS) as LayerKind[]).map((kind) => (
                  <PaletteItem key={kind} kind={kind} onClick={() => addLayer(kind)} />
                ))}
              </div>
            )}
            {sidebarTab === 'poses' && (
              <PosesPanel poses={poses} onAdd={addPose} onApply={applyPose} />
            )}
            {sidebarTab === 'signals' && (
              <SignalsPanel
                personality={personality}
                onPersonalityChange={setPersonality}
                worldSignals={worldSignals}
              />
            )}
            {sidebarTab === 'triggers' && (
              <TriggersPanel
                triggers={triggers}
                behaviors={behaviors}
                onUpdate={updateTrigger}
                onRemove={removeTrigger}
                onAdd={addTrigger}
              />
            )}
          </div>

          <div className="border-t border-white/8 p-3 text-[10px] text-white/35 leading-relaxed">
            {sidebarTab === 'components' &&
              'Each layer contributes to the per-frame motion. Mute, weight, reorder.'}
            {sidebarTab === 'poses' &&
              'Capture authored body states; layers blend toward them. Use for keyframes in Timeline mode.'}
            {sidebarTab === 'signals' &&
              'Bind any layer parameter to a signal via the ~ mode toggle on its parameter row.'}
            {sidebarTab === 'triggers' &&
              'Rules that fire behaviors or modulate signals when world events match.'}
          </div>
        </aside>

        {paletteOpen && (
          <button
            type="button"
            onClick={() => setPaletteOpen(false)}
            className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] md:hidden"
            aria-label="Close panel"
          />
        )}
      </div>
    </div>
  )
}
