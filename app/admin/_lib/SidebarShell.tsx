'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSharedStore } from './sharedStore'
import { useEnsureStlLoaded } from './hooks'

const STEPS = [
  { n: 1 as const, label: 'Pick Model', path: '/admin/pick' },
  { n: 2 as const, label: 'Group Segments', path: '/admin/group' },
  { n: 3 as const, label: 'Animate', path: '/admin/animate' },
]

function pathToStep(pathname: string | null): 1 | 2 | 3 {
  if (pathname?.startsWith('/admin/group')) return 2
  if (pathname?.startsWith('/admin/animate')) return 3
  return 1
}

export function SidebarShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const segments = useSharedStore((s) => s.segments)
  const groups = useSharedStore((s) => s.groups)
  const ensureStlLoaded = useEnsureStlLoaded()
  const step = pathToStep(pathname)

  useEffect(() => {
    if (useSharedStore.persist.hasHydrated()) {
      ensureStlLoaded()
    } else {
      return useSharedStore.persist.onFinishHydration(() => ensureStlLoaded())
    }
  }, [ensureStlLoaded])

  const canEnterStep = (n: 1 | 2 | 3) => {
    if (n === 1) return true
    if (n === 2) return segments.length > 0
    return segments.length > 0 && groups.length > 0
  }

  const canGoBack = step > 1
  const canGoForward = step < 3 && canEnterStep((step + 1) as 1 | 2 | 3)

  const goToStep = (n: 1 | 2 | 3) => {
    if (!canEnterStep(n)) return
    const target = STEPS.find((s) => s.n === n)
    if (target) router.push(target.path)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 shrink-0">
        <button
          onClick={() => goToStep((step - 1) as 1 | 2 | 3)}
          disabled={!canGoBack}
          className="text-white/30 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {STEPS.map((s, i) => {
            const enabled = canEnterStep(s.n)
            return (
              <div key={s.n} className="flex items-center gap-2">
                {i > 0 && <div className="w-4 h-px bg-white/15" />}
                <button
                  onClick={() => goToStep(s.n)}
                  disabled={!enabled}
                  className={
                    s.n === step
                      ? 'text-xs font-medium text-white'
                      : enabled
                      ? 'text-xs text-white/40 hover:text-white/60 transition-colors'
                      : 'text-xs text-white/20 cursor-not-allowed'
                  }
                >
                  <span className="mr-1 text-white/30">{s.n}.</span>
                  {s.label}
                </button>
              </div>
            )
          })}
        </div>
        <button
          onClick={() => goToStep((step + 1) as 1 | 2 | 3)}
          disabled={!canGoForward}
          className="text-white/30 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none transition-opacity"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">{children}</div>

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
