'use client'

import { useStudioStore } from './page.stores'
import { SliderField, SectionTitle, Divider } from '../game/ConfigPanel.primitives'

export function StepAnimate() {
  const { animationConfig, setAnimationField, showAttractor, setShowAttractor } = useStudioStore()

  const stiffness = 1 - animationConfig.angleConstraint / (Math.PI / 2)

  return (
    <div className="flex flex-col gap-5 p-4 text-white">
      <div>
        <SectionTitle>Spine</SectionTitle>
        <div className="space-y-4">
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

      <Divider />

      <div>
        <SectionTitle>Limbs</SectionTitle>
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
        <SectionTitle>Navigation</SectionTitle>
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
