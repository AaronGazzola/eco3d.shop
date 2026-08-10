'use client'

import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { StudioCanvas } from '@/app/admin/_lib/StudioCanvas'
import { SceneContent } from '@/app/admin/animate/AnimateScene'
import { useSharedStore } from '@/app/admin/_lib/sharedStore'
import { useLoadRig } from '@/app/admin/_lib/hooks'
import { decodeSimConfig, useAnimateStore } from '@/app/admin/animate/animateStore'

const FIT_PADDING = 1.05

function readHashParams(): URLSearchParams {
  const hash = window.location.hash.replace(/^#/, '')
  return new URLSearchParams(hash)
}

// The window on the overlay is a pane of glass in the side of a tank, so the camera is FIXED: it is
// placed once, square-on to the tank's +Z face, aimed at the tank's centre, and never moves again. It
// does not track the creature. That is the whole point — a creature swimming toward the glass has to
// grow and one swimming away has to shrink, and a camera that chases the creature cancels exactly that
// cue and flattens the volume back into a picture. The camera this replaced did chase, because on a
// floor the creature simply left the frame; inside a tank it cannot.
//
// The distance is fitted so the whole tank is inside the frustum, width and height fitted separately
// with the looser winning. Refitting happens on a viewport change only: a browser source can be resized
// at any time, and re-framing in response to the WINDOW is not tracking the CREATURE.
function TankCamera() {
  const { camera, size, controls } = useThree()
  const bounds = useAnimateStore((s) => s.tankBounds)
  const tankEnabled = useAnimateStore((s) => s.tankEnabled)

  // A link whose config has no tank leaves the camera with no volume to frame, and on a stream that
  // shows an empty pane rather than an obviously broken one — so it is worth saying out loud. But the
  // bounds are published by the physics once the model is built, which is several frames after mount,
  // and complaining about that gap would report every healthy page load as a failure. The config is
  // what distinguishes the two: a link that asked for a tank is merely waiting.
  useEffect(() => {
    if (!tankEnabled) console.error('embed: the link carries no tank, so the camera has no volume to frame')
  }, [tankEnabled])

  useEffect(() => {
    if (!bounds) return
    const perspective = camera as THREE.PerspectiveCamera
    const cx = (bounds.minX + bounds.maxX) / 2
    const cy = (bounds.minY + bounds.maxY) / 2
    const cz = (bounds.minZ + bounds.maxZ) / 2
    const halfW = (bounds.maxX - bounds.minX) / 2
    const halfH = (bounds.maxY - bounds.minY) / 2
    const halfD = (bounds.maxZ - bounds.minZ) / 2

    const vHalf = (perspective.fov * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * perspective.aspect)
    // Measured from the NEAR face, not from the centre: the near face is the closest thing that has to
    // stay inside the frustum, and fitting from the centre lets the near corners fall outside it.
    const distance = Math.max(halfW / Math.tan(hHalf), halfH / Math.tan(vHalf)) * FIT_PADDING + halfD

    camera.position.set(cx, cy, cz + halfD + distance)
    camera.lookAt(cx, cy, cz)
    // With inspect controls on, the orbit target has to be the tank centre too, or the controls'
    // own target (the origin) overrides the aim on the first mouse move and the fit is thrown away.
    const oc = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null
    if (oc?.target) {
      oc.target.set(cx, cy, cz)
      oc.update?.()
    }
  }, [camera, controls, bounds, size.width, size.height])

  return null
}

// Applies the link, loads its rig, then starts the simulation once both the rig and its mesh are in.
// Debug overlays are deliberately NOT read from the link: stance and reach markers belong in the studio,
// not on a stream.
function useEmbedLink() {
  const groups = useSharedStore((s) => s.groups)
  const segments = useSharedStore((s) => s.segments)
  const setGroupNodeWeight = useSharedStore((s) => s.setGroupNodeWeight)
  const { loadFromRigId } = useLoadRig()
  const [failed, setFailed] = useState(false)
  // Inspect mode. Off on the stream, where the fixed camera IS the tank's depth cue and the frame
  // takes no pointer events anyway; on in a tab, where the same link is opened to look around.
  const [inspect, setInspect] = useState(false)
  const [framed, setFramed] = useState(true)
  const legApplied = useRef(false)
  const started = useRef(false)

  useEffect(() => {
    const params = readHashParams()
    setInspect(params.get('controls') === '1')
    // Black is for looking at the scene in a tab, where transparent means white. Framed, the page must
    // stay transparent whatever else the link asks for — the overlay composites over video.
    setFramed(window.self !== window.top)
    const rig = params.get('rig')
    if (!rig) {
      console.error('embed: no rig in the link — nothing to render')
      setFailed(true)
      return
    }
    const sim = params.get('sim')
    if (sim) useAnimateStore.getState().applySimConfigAbsolute(decodeSimConfig(sim))
    loadFromRigId(rig).catch((err) => {
      console.error('embed: rig load failed', err)
      setFailed(true)
    })
    // The loader is recreated on every render; running this once on mount is the whole intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (legApplied.current) return
    const raw = readHashParams().get('legw')
    if (raw == null) {
      legApplied.current = true
      return
    }
    const w = Number(raw)
    if (!Number.isFinite(w)) {
      legApplied.current = true
      return
    }
    const leg = groups.find((g) => g.type === 'leg-left' || g.type === 'leg-right')
    if (!leg) return
    setGroupNodeWeight(leg.id, Math.max(0.02, Math.min(10, w)))
    legApplied.current = true
  }, [groups, setGroupNodeWeight])

  const ready = groups.length > 0 && segments.length > 0

  useEffect(() => {
    if (started.current || !ready) return
    useAnimateStore.getState().setCoupledRunning(true)
    started.current = true
  }, [ready])

  return { ready, failed, inspect, framed }
}

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

export default function GameEmbedPage() {
  const { ready, failed, inspect, framed } = useEmbedLink()
  const rootRef = useRef<THREE.Group | null>(null)
  useTransparentPage()

  if (failed || !ready) return <div className="fixed inset-0" />

  return (
    <div className="fixed inset-0">
      <StudioCanvas background={inspect && !framed ? '#000000' : 'transparent'} grid={false} controls={inspect}>
        <SceneContent rootRef={rootRef} />
        <TankCamera />
      </StudioCanvas>
    </div>
  )
}
