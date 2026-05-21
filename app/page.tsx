'use client'

import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from './page.stores'
import { useDragonConfigs, useHatchDragon } from './page.hooks'
import { useAuth } from './layout.hooks'
import { useAuthStore } from './layout.stores'
import { HomeScene } from './HomeScene'

function AdminLink() {
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  if (!user || profile?.role !== 'admin') return null
  return (
    <Link
      href="/admin"
      aria-label="Open admin"
      className="flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs uppercase tracking-widest text-white/70 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
    >
      <Wrench className="h-4 w-4" />
      Admin
    </Link>
  )
}

function ChoosePrompt() {
  const phase = useGameStore((s) => s.phase)
  if (phase !== 'choosing') return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-10 flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl md:text-3xl font-light tracking-[0.2em] text-white/90 uppercase">
        Choose your egg
      </h1>
      <p className="text-xs md:text-sm text-white/40 tracking-widest">
        click to begin
      </p>
    </div>
  )
}

function ConfirmDialog() {
  const phase = useGameStore((s) => s.phase)
  const cancel = useGameStore((s) => s.cancelSelection)
  const { isLoading: dragonsLoading } = useDragonConfigs()
  const { start, ready } = useHatchDragon()

  if (phase !== 'confirming') return null

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-[#0f0f10]/95 px-10 py-8 shadow-2xl">
        <h2 className="text-xl tracking-[0.18em] text-white/90 uppercase">
          Open this egg?
        </h2>
        <p className="max-w-xs text-center text-xs leading-relaxed text-white/50">
          The dragon inside is unknown. Once opened, it cannot be returned.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={cancel}
            className="rounded-md border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5 hover:text-white/90"
          >
            Cancel
          </button>
          <button
            onClick={start}
            disabled={dragonsLoading || !ready}
            className={cn(
              'rounded-md border border-emerald-400/40 bg-emerald-500/15 px-5 py-2 text-xs uppercase tracking-widest text-emerald-200 transition-colors',
              'hover:bg-emerald-500/25 hover:text-emerald-100',
              'disabled:opacity-40 disabled:pointer-events-none'
            )}
          >
            {dragonsLoading ? 'Loading…' : 'Open'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HatchingHint() {
  const phase = useGameStore((s) => s.phase)
  if (phase !== 'shaking' && phase !== 'cracking' && phase !== 'emerging') return null
  const label = phase === 'shaking' ? 'Hatching…' : phase === 'cracking' ? 'Cracking!' : 'Emerging…'
  return (
    <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
      <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-white/60 animate-pulse">
        {label}
      </p>
    </div>
  )
}

function LiveHint() {
  const phase = useGameStore((s) => s.phase)
  const reset = useGameStore((s) => s.reset)
  if (phase !== 'live') return null
  return (
    <>
      <p className="text-[10px] uppercase tracking-widest text-white/30">
        click the floor to direct your dragon
      </p>
      <button
        onClick={reset}
        className="rounded-md border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/50 transition-colors hover:bg-white/5 hover:text-white/90"
      >
        New eggs
      </button>
    </>
  )
}

export default function HomePage() {
  useAuth()
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#080808]">
      <HomeScene />
      <ChoosePrompt />
      <ConfirmDialog />
      <HatchingHint />
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        <LiveHint />
        <AdminLink />
      </div>
    </div>
  )
}
