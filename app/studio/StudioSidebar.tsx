'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StepPick } from './StepPick'
import { StepGroup } from './StepGroup'
import { useStudioStore } from './page.stores'
import { useStlLoader } from './page.hooks'

const STEPS = [
  { n: 1 as const, label: 'Pick Model' },
  { n: 2 as const, label: 'Group Segments' },
]

export function StudioSidebar() {
  const { step, setStep, segments } = useStudioStore()
  const { loadStl } = useStlLoader()

  useEffect(() => {
    const tryLoad = () => {
      const { stlKey, segments } = useStudioStore.getState()
      if (stlKey && segments.length === 0) loadStl(stlKey, true)
    }

    if (useStudioStore.persist.hasHydrated()) {
      tryLoad()
    } else {
      return useStudioStore.persist.onFinishHydration(tryLoad)
    }
  }, [])

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
