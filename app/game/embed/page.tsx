'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { StudioCanvas } from '@/app/admin/_lib/StudioCanvas'
import { GameScene } from '@/app/game/GameScene'
import { TankCamera } from '@/app/game/TankCamera'
import { useGameSession } from '@/app/game/game.hooks'
import { createPlatformHost, readPlatformLink } from '@/app/game/hosts'

function useTransparentPage() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.background
    const prevBody = body.style.background
    html.style.background = 'transparent'
    body.style.background = 'transparent'
    return () => {
      html.style.background = prevHtml
      body.style.background = prevBody
    }
  }, [])
}

interface EmbedEnvironment {
  inspect: boolean
  framed: boolean
  link: { rigId: string; legWeight: number | null } | null
}

export default function GameEmbedPage() {
  // Inspect mode is off on the stream, where the fixed camera IS the tank's depth cue and the frame
  // takes no pointer events anyway; on in a tab, where the same link is opened to look around. Black is
  // for looking at the scene in a tab, where transparent means white. Framed, the page must stay
  // transparent whatever else the link asks for — the overlay composites over video.
  const rootRef = useRef<THREE.Group | null>(null)
  useTransparentPage()

  // Read during render rather than in an effect. The address bar and the framing state are client-only
  // and are read exactly once, because a browser source never navigates. Rendering nothing on the server
  // costs no hydration mismatch: the first client render has no rig loaded either, so both sides draw
  // the same empty frame.
  const env = useMemo<EmbedEnvironment | null>(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return {
      inspect: params.get('controls') === '1',
      framed: window.self !== window.top,
      link: readPlatformLink(window.location.hash),
    }
  }, [])

  const link = env?.link ?? null
  const host = useMemo(() => (link ? createPlatformHost(link.rigId, link.legWeight) : null), [link])
  const { ready, failed, dressing } = useGameSession(host)

  if (!env || failed || !ready || !dressing) return <div className="fixed inset-0" />

  const background = env.inspect && !env.framed ? '#000000' : 'transparent'

  return (
    <div className="fixed inset-0">
      <StudioCanvas background={background} grid={false} controls={env.inspect}>
        <GameScene dressing={dressing} rootRef={rootRef} />
        <TankCamera />
      </StudioCanvas>
    </div>
  )
}
