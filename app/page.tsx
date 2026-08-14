'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wrench } from 'lucide-react'
import * as THREE from 'three'
import { useAuth } from './layout.hooks'
import { useAuthStore } from './layout.stores'
import { StudioCanvas } from '@/app/admin/_lib/StudioCanvas'
import { listDragonRigsAction } from '@/app/admin/_lib/actions'
import { GameScene } from '@/app/game/GameScene'
import { TankCamera } from '@/app/game/TankCamera'
import { useGameSession } from '@/app/game/game.hooks'
import { createStandaloneHost } from '@/app/game/hosts'

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

function CreatureSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-24 w-64 animate-pulse rounded-full bg-white/5" />
    </div>
  )
}

export default function HomePage() {
  useAuth()
  const rootRef = useRef<THREE.Group | null>(null)

  // One rig is authored and ready, and it is both the rig and the dragon for now. Picking it here is
  // deliberate rather than a fallback: the standalone game has no link to name one, and there is
  // exactly one to name.
  const rigs = useQuery({ queryKey: ['dragon-rigs'], queryFn: () => listDragonRigsAction() })
  const rigId = rigs.data?.[0]?.id ?? null
  const host = useMemo(() => (rigId ? createStandaloneHost(rigId) : null), [rigId])
  const { ready, failed, dressing, snapshot, world } = useGameSession(host)

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#080808]">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-6">
        <div>
          <h1 className="text-2xl font-light uppercase tracking-[0.25em] text-white/90">eco3d.shop</h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/30">
            {snapshot ? snapshot.settings.creatureName : 'Loading'}
          </p>
        </div>
      </header>

      <div className="absolute inset-0">
        {failed ? (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-white/30">
            The creature could not be loaded
          </div>
        ) : ready && dressing ? (
          <StudioCanvas background="transparent" grid={false} controls={false}>
            <GameScene dressing={dressing} rootRef={rootRef} />
            <TankCamera />
          </StudioCanvas>
        ) : (
          <CreatureSkeleton />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!ready || !host}
            onClick={() => {
              host?.raise({ kind: 'feed' })
              world?.tick(0)
            }}
            className="rounded-md border border-white/15 bg-black/40 px-4 py-2 text-xs uppercase tracking-widest text-white/70 backdrop-blur transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            Feed
          </button>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
            {snapshot ? `${Math.round(snapshot.creature.hunger * 100)}% hungry` : ''}
          </span>
        </div>
        <AdminLink />
      </div>
    </div>
  )
}
