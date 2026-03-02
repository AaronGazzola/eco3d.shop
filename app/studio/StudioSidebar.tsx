'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StepPick } from './StepPick'
import { StepGroup } from './StepGroup'
import { useStudioStore, CameraPreset } from './page.stores'

const STEPS = [
  { n: 1 as const, label: 'Pick Model' },
  { n: 2 as const, label: 'Group Segments' },
]

export function StudioSidebar() {
  const { step, setStep, segments, setCameraPreset, rotateModel } = useStudioStore()
  const HALF_PI = Math.PI / 2

  const canGoBack = step > 1
  const canGoForward = step < 2 && segments.length > 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 shrink-0">
        <button
          onClick={() => setStep((step - 1) as 1 | 2)}
          disabled={!canGoBack}
          className="text-white/30 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <div className="w-4 h-px bg-white/15" />}
              <button
                onClick={() => (s.n === 2 && segments.length > 0 ? setStep(2) : s.n === 1 ? setStep(1) : undefined)}
                disabled={s.n === 2 && segments.length === 0}
                className={
                  s.n === step
                    ? 'text-xs font-medium text-white'
                    : s.n < step
                    ? 'text-xs text-white/40 hover:text-white/60 transition-colors'
                    : 'text-xs text-white/20 cursor-not-allowed'
                }
              >
                <span className="mr-1 text-white/30">{s.n}.</span>
                {s.label}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStep((step + 1) as 1 | 2)}
          disabled={!canGoForward}
          className="text-white/30 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none transition-opacity"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 1 && <StepPick />}
        {step === 2 && <StepGroup />}
      </div>

      <div className="px-4 py-3 border-t border-white/8 shrink-0 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">Camera</p>
          <div className="grid grid-cols-4 gap-1">
            {(['reset', 'front', 'top', 'side'] as CameraPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => setCameraPreset(preset)}
                className="py-1 text-[11px] text-white/40 hover:text-white/80 hover:bg-white/8 rounded capitalize transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">Rotate</p>
          <div className="space-y-1">
            {([
              { label: 'Yaw',   axis: 'y' as const, neg: '←', pos: '→' },
              { label: 'Pitch', axis: 'x' as const, neg: '↑', pos: '↓' },
              { label: 'Roll',  axis: 'z' as const, neg: '↺', pos: '↻' },
            ]).map(({ label, axis, neg, pos }) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="text-[11px] text-white/30 w-8">{label}</span>
                <div className="flex gap-1 flex-1">
                  <button
                    onClick={() => rotateModel(axis, -HALF_PI)}
                    className="flex-1 py-0.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/8 rounded transition-colors"
                  >
                    {neg}
                  </button>
                  <button
                    onClick={() => rotateModel(axis, HALF_PI)}
                    className="flex-1 py-0.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/8 rounded transition-colors"
                  >
                    {pos}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 py-4 border-t border-white/8 shrink-0">
        <Image
          src="/images/Authorized_Seller_Badge.png"
          alt="Saber 3D Authorized Seller"
          width={96}
          height={96}
        />
        <p className="text-[10px] text-white/30 text-center">
          3D models designed by{' '}
          <a
            href="https://www.saber-3d.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
          >
            Saber3D
          </a>
        </p>
      </div>
    </div>
  )
}
