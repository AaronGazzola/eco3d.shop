'use client'

import { cn } from '@/lib/utils'
import { useCreatureStore } from '../page.stores'
import { SliderField, SectionTitle, Divider } from './ConfigPanel.primitives'

export function ConfigPanel() {
  const {
    config,
    showAttractor,
    setSegmentCount,
    setSegmentLength,
    setAngleConstraint,
    toggleLimbNode,
    setConfigField,
    setShowAttractor,
  } = useCreatureStore()

  const { segmentCount, segmentLength, angleConstraint, limbNodes } = config

  const stiffness = 1 - angleConstraint / (Math.PI / 2)

  return (
    <div className="flex flex-col gap-5 p-4 text-white">


      <div>
        <SectionTitle>Chain</SectionTitle>
        <div className="space-y-4">
          <SliderField
            label="Segment Count"
            value={segmentCount}
            min={4}
            max={40}
            step={1}
            onChange={setSegmentCount}
          />
          <SliderField
            label="Segment Length"
            value={segmentLength}
            min={0.2}
            max={2.0}
            step={0.05}
            onChange={setSegmentLength}
          />
          <SliderField
            label="Stiffness"
            value={stiffness}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setAngleConstraint((1 - v) * (Math.PI / 2))}
          />
        </div>
      </div>

      <Divider />

      <div>
        <SectionTitle>Limb Nodes</SectionTitle>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: segmentCount }, (_, i) => {
            const hasLeft = limbNodes.some((l) => l.index === i && l.side === -1)
            const hasRight = limbNodes.some((l) => l.index === i && l.side === 1)
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-white/30 font-mono leading-none">{i}</span>
                <div className="flex gap-px">
                  <button
                    onClick={() => toggleLimbNode(i, -1)}
                    className={cn(
                      'w-3.5 h-4 rounded-l text-[8px] font-bold transition-colors',
                      hasLeft ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30 hover:bg-white/20'
                    )}
                  >
                    L
                  </button>
                  <button
                    onClick={() => toggleLimbNode(i, 1)}
                    className={cn(
                      'w-3.5 h-4 rounded-r text-[8px] font-bold transition-colors',
                      hasRight ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30 hover:bg-white/20'
                    )}
                  >
                    R
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {limbNodes.length > 0 && (
        <>
          <Divider />
          <div>
            <SectionTitle>Limbs</SectionTitle>
            <div className="space-y-4">
              <SliderField
                label="Limb Reach"
                value={config.limbReach}
                min={0.3}
                max={3.0}
                step={0.05}
                onChange={(v) => setConfigField('limbReach', v)}
              />
              <SliderField
                label="Step Threshold"
                value={config.stepThreshold}
                min={0.2}
                max={5.0}
                step={0.1}
                onChange={(v) => setConfigField('stepThreshold', v)}
              />
              <SliderField
                label="Step Smoothing"
                value={config.stepSmoothing}
                min={0.02}
                max={0.5}
                step={0.01}
                onChange={(v) => setConfigField('stepSmoothing', v)}
              />
            </div>
          </div>
        </>
      )}

      <Divider />

      <div>
        <SectionTitle>Navigation</SectionTitle>
        <div className="space-y-4">
          <SliderField
            label="Wander Radius"
            value={config.wanderRadius}
            min={2}
            max={20}
            step={0.5}
            onChange={(v) => setConfigField('wanderRadius', v)}
          />
          <SliderField
            label="Wander Speed"
            value={config.wanderSpeed}
            min={0.1}
            max={3.0}
            step={0.1}
            onChange={(v) => setConfigField('wanderSpeed', v)}
          />
          <SliderField
            label="Max Speed"
            value={config.maxSpeed}
            min={0.5}
            max={12.0}
            step={0.5}
            onChange={(v) => setConfigField('maxSpeed', v)}
          />
          <SliderField
            label="Follow Distance"
            value={config.followDistance}
            min={0.5}
            max={10.0}
            step={0.5}
            onChange={(v) => setConfigField('followDistance', v)}
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

      <div className="h-4" />
    </div>
  )
}
