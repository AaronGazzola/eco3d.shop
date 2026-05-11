'use client'

import { useMemo } from 'react'
import { useStudioStore } from './page.stores'
import { BodyGroup, OverlayToggles, SegmentData } from './page.types'
import { SliderField, SectionTitle, Divider } from '../game/ConfigPanel.primitives'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const OVERLAY_LABELS: { key: keyof OverlayToggles; label: string }[] = [
  { key: 'joints', label: 'Joints' },
  { key: 'bones', label: 'Bones' },
  { key: 'hips', label: 'Hips' },
  { key: 'footTargets', label: 'Foot Targets' },
  { key: 'headTarget', label: 'Head Target' },
]

function centroidXZ(group: BodyGroup, segmentMap: Map<string, SegmentData>): { x: number; z: number } {
  let sumX = 0, sumZ = 0, count = 0
  for (const sid of group.segmentIds) {
    const seg = segmentMap.get(sid)
    if (!seg) continue
    for (let i = 0; i < seg.positions.length; i += 3) {
      sumX += seg.positions[i]
      sumZ += seg.positions[i + 2]
      count++
    }
  }
  return count > 0 ? { x: sumX / count, z: sumZ / count } : { x: 0, z: 0 }
}

function computeSkeletonSummary(groups: BodyGroup[], segments: SegmentData[]) {
  const head = groups.find((g) => g.type === 'head')
  const tail = groups.find((g) => g.type === 'tail')
  const spines = groups.filter((g) => g.type === 'spine')
  const chain: BodyGroup[] = [...(head ? [head] : []), ...spines, ...(tail ? [tail] : [])]
  const segmentMap = new Map(segments.map((s) => [s.id, s]))
  const points: { x: number; z: number }[] = []
  if (chain.length > 0) {
    const f = chain[0].nodeFront ?? centroidXZ(chain[0], segmentMap)
    points.push({ x: f.x, z: f.z })
    for (const g of chain) {
      const b = g.nodeBack ?? centroidXZ(g, segmentMap)
      points.push({ x: b.x, z: b.z })
    }
  }
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dz = points[i].z - points[i - 1].z
    total += Math.hypot(dx, dz)
  }
  const legCount = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right').length
  return {
    jointCount: points.length,
    spineLength: total,
    legCount,
  }
}

function OverlayToggleRow() {
  const overlayToggles = useStudioStore((s) => s.overlayToggles)
  const setOverlayToggle = useStudioStore((s) => s.setOverlayToggle)
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pb-3 border-b border-white/8">
      <span className="w-full text-[10px] uppercase tracking-widest text-white/40">Overlays</span>
      {OVERLAY_LABELS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overlayToggles[key]}
            onChange={(e) => setOverlayToggle(key, e.target.checked)}
            className="w-3.5 h-3.5 accent-violet-500"
          />
          <span className="text-xs text-white/70">{label}</span>
        </label>
      ))}
    </div>
  )
}

function SkeletonSummary() {
  const groups = useStudioStore((s) => s.groups)
  const segments = useStudioStore((s) => s.segments)
  const summary = useMemo(() => computeSkeletonSummary(groups, segments), [groups, segments])

  const rows: { label: string; value: string }[] = [
    { label: 'Spine joints', value: String(summary.jointCount) },
    { label: 'Spine length', value: summary.spineLength.toFixed(2) },
    { label: 'Legs', value: String(summary.legCount) },
  ]

  return (
    <div className="space-y-1">
      <SectionTitle>Skeleton (from steps 1 &amp; 2)</SectionTitle>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-xs">
            <span className="text-white/40">{r.label}</span>
            <span className="font-mono text-white/60">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/30 leading-relaxed pt-1.5">
        Edit in steps 1 &amp; 2.
      </p>
    </div>
  )
}

function IntrinsicTab() {
  const animationConfig = useStudioStore((s) => s.animationConfig)
  const setAnimationField = useStudioStore((s) => s.setAnimationField)
  const stiffness = 1 - animationConfig.angleConstraint / (Math.PI / 2)

  return (
    <div className="flex flex-col gap-5">
      <SkeletonSummary />
      <Divider />
      <div>
        <SectionTitle>Spine</SectionTitle>
        <SliderField
          label="Stiffness"
          value={stiffness}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setAnimationField('angleConstraint', (1 - v) * (Math.PI / 2))}
        />
      </div>
    </div>
  )
}

function ExtrinsicTab() {
  const animationConfig = useStudioStore((s) => s.animationConfig)
  const setAnimationField = useStudioStore((s) => s.setAnimationField)
  const showAttractor = useStudioStore((s) => s.showAttractor)
  const setShowAttractor = useStudioStore((s) => s.setShowAttractor)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionTitle>Feet</SectionTitle>
        <div className="space-y-4">
          <SliderField
            label="Foot Angle Offset"
            value={animationConfig.limbAngleOffset}
            min={0}
            max={Math.PI / 2}
            step={0.01}
            onChange={(v) => setAnimationField('limbAngleOffset', v)}
          />
          <SliderField
            label="Step Threshold"
            value={animationConfig.stepThreshold}
            min={0.2}
            max={5.0}
            step={0.1}
            onChange={(v) => setAnimationField('stepThreshold', v)}
          />
          <SliderField
            label="Step Smoothing"
            value={animationConfig.stepSmoothing}
            min={0.02}
            max={0.5}
            step={0.01}
            onChange={(v) => setAnimationField('stepSmoothing', v)}
          />
        </div>
      </div>

      <Divider />

      <div>
        <SectionTitle>Head / Target</SectionTitle>
        <div className="space-y-4">
          <SliderField
            label="Wander Radius"
            value={animationConfig.wanderRadius}
            min={2}
            max={20}
            step={0.5}
            onChange={(v) => setAnimationField('wanderRadius', v)}
          />
          <SliderField
            label="Wander Speed"
            value={animationConfig.wanderSpeed}
            min={0.1}
            max={3.0}
            step={0.1}
            onChange={(v) => setAnimationField('wanderSpeed', v)}
          />
          <SliderField
            label="Max Speed"
            value={animationConfig.maxSpeed}
            min={0.5}
            max={12.0}
            step={0.5}
            onChange={(v) => setAnimationField('maxSpeed', v)}
          />
          <SliderField
            label="Follow Distance"
            value={animationConfig.followDistance}
            min={0.5}
            max={10.0}
            step={0.5}
            onChange={(v) => setAnimationField('followDistance', v)}
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAttractor}
              onChange={(e) => setShowAttractor(e.target.checked)}
              className="w-3.5 h-3.5 accent-violet-500"
            />
            <span className="text-xs text-white/60">Show attractor</span>
          </label>
          <p className="text-xs text-white/30 leading-relaxed">
            Left-click the floor to set a target.
          </p>
        </div>
      </div>
    </div>
  )
}

export function StepAnimate() {
  return (
    <div className={cn('flex flex-col gap-4 p-4 text-white')}>
      <OverlayToggleRow />
      <Tabs defaultValue="extrinsic" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="intrinsic">Intrinsic</TabsTrigger>
          <TabsTrigger value="extrinsic">Extrinsic</TabsTrigger>
        </TabsList>
        <TabsContent value="intrinsic" className="pt-2">
          <IntrinsicTab />
        </TabsContent>
        <TabsContent value="extrinsic" className="pt-2">
          <ExtrinsicTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
