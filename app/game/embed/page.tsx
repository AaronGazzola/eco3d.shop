'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { StudioCanvas } from '@/app/admin/_lib/StudioCanvas'
import { GameScene } from '@/app/game/GameScene'
import { TankCamera } from '@/app/game/TankCamera'
import { useGameSession } from '@/app/game/game.hooks'
import { createPlatformHost, readPlatformLink } from '@/app/game/hosts'
import { connectPlatform } from '@/app/game/platform/channel'
import { verifyChannelTokenAction } from '@/app/game/platform/page.actions'

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
  token: string | null
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
  //
  // The rig comes from the hash and stays out of the request line. The token comes from the query,
  // because the host appends it to the address it was given, and it names a channel rather than a
  // creature.
  const env = useMemo<EmbedEnvironment | null>(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return {
      inspect: params.get('controls') === '1',
      framed: window.self !== window.top,
      link: readPlatformLink(window.location.hash),
      token: new URLSearchParams(window.location.search).get('t'),
    }
  }, [])

  const link = env?.link ?? null
  const host = useMemo(() => (link ? createPlatformHost(link.rigId, link.legWeight) : null), [link])
  const { ready, failed, dressing, world } = useGameSession(host)

  // Observation hook, read-only, in the spirit of `__studio` on the animate page and
  // docs/observation-loop.md. A chatter feeding the creature changes nothing a camera can see, so
  // without this the only way to claim it worked would be to assert that it must have. It exposes state
  // and no way to change it: nothing here can feed the creature, only report that something did.
  useEffect(() => {
    if (!world) return
    const w = window as unknown as { __game?: Record<string, unknown> }
    w.__game = { state: () => world.state(), channel: () => channelRef.current }
    return () => {
      delete (w as { __game?: unknown }).__game
    }
  }, [world])

  // Verified on the server, because the secret that verifies a token for this overlay verifies one for
  // every channel. An unverified or absent token leaves the creature swimming and unattached: a blank
  // frame on a live stream is a worse failure than a creature nobody can feed.
  const token = env?.token ?? null
  const [channel, setChannel] = useState<string | null>(null)
  // Held in a ref as well, so the observation handle reports the current channel
  // rather than the one that existed when the handle was installed.
  const channelRef = useRef<string | null>(null)
  channelRef.current = channel
  useEffect(() => {
    if (!token) return
    verifyChannelTokenAction(token)
      .then((identity) => {
        if (!identity) {
          console.error('overlay: the platform token could not be verified — running unattached')
          return
        }
        setChannel(identity.channel)
      })
      .catch((error) => console.error('overlay: verifying the platform token failed', error))
  }, [token])

  // The host's own protocol, implemented here rather than loaded from it.
  //
  // Connected only once a token has verified, because a page that frames this overlay is not by that act
  // alone its host. The protocol accepts messages from whatever framed it — an overlay cannot know its
  // host's origin, and will know less once overlays are proxied — so the token is the only thing tying a
  // message to the platform rather than to whoever put the creature in an iframe. Without it, anyone
  // could frame this page and feed the dragon.
  //
  // Settings reach the creature through the host, which world.tick re-reads every tick; a command
  // becomes an action by a viewer.
  useEffect(() => {
    if (!host || !channel) return
    return connectPlatform({
      onSettings: (settings) => host.applyPlatformSettings(settings),
      onEvent: (event) => host.deliver(event),
    })
  }, [host, channel])

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
