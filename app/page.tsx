'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { useAuth } from './layout.hooks'
import { useAuthStore } from './layout.stores'

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

export default function HomePage() {
  useAuth()
  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#080808] px-6">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-light uppercase tracking-[0.25em] text-white/90 md:text-4xl">
          eco3d.shop
        </h1>
        <p className="text-sm leading-relaxed tracking-wide text-white/50 md:text-base">
          Breed, collect, and sell creatures — then bring your favorites to life
          as plant-based, compostable 3D prints.
        </p>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">
          Coming soon
        </p>
      </div>
      <div className="absolute bottom-4 right-4 z-10">
        <AdminLink />
      </div>
    </div>
  )
}
