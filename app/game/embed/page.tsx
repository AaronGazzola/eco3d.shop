'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { StudioCanvas } from '@/app/admin/_lib/StudioCanvas'
import { SceneContent } from '@/app/admin/animate/AnimateScene'
import { useSharedStore } from '@/app/admin/_lib/sharedStore'
import { useLoadRig } from '@/app/admin/_lib/hooks'
import { decodeSimConfig, useAnimateStore } from '@/app/admin/animate/animateStore'

const VIEW_DIR = new THREE.Vector3(0, 0.35, 1).normalize()
const FIT_PADDING = 1.15
const FOLLOW_SMOOTHING = 0.06

function readHashParams(): URLSearchParams {
  const hash = window.location.hash.replace(/^#/, '')
  return new URLSearchParams(hash)
}

// The creature travels; nobody is here to pan. The rendered root group is pinned at the origin every
// frame by the locomotion loop — it is an anchor, not a position — so the creature is found from the
// world bounds of its descendants, whose matrices the simulation does write.
//
// The distance is fitted to the creature's own bounds rather than being a constant: the window on the
// overlay can be any aspect and a rig can be any size, so a hand-picked offset frames one of them and
// clips the rest. The width and the height are fitted separately and the looser wins — a bounding sphere
// would do it in one line but its radius is half the body's DIAGONAL, which on something as long and thin
// as a dragon pushes the camera so far back the creature reads as a speck. Both the aim point and the
// camera position are chased rather than snapped to, because the body undulates and a hard lock shakes
// the whole frame on the stream.
function FollowCamera({ targetRef }: { targetRef: React.RefObject<THREE.Group | null> }) {
  const { camera } = useThree()
  const box = useMemo(() => new THREE.Box3(), [])
  const size = useMemo(() => new THREE.Vector3(), [])
  const centre = useMemo(() => new THREE.Vector3(), [])
  const wanted = useMemo(() => new THREE.Vector3(), [])
  const aim = useMemo(() => new THREE.Vector3(), [])
  const started = useRef(false)

  useFrame(() => {
    const root = targetRef.current
    if (!root) return
    box.setFromObject(root)
    if (box.isEmpty()) return
    box.getCenter(centre)
    box.getSize(size)

    const perspective = camera as THREE.PerspectiveCamera
    const vHalf = (perspective.fov * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * perspective.aspect)
    // The creature turns, so either horizontal axis can be the long one.
    const across = Math.max(size.x, size.z) / 2
    const distance =
      Math.max(across / Math.tan(hHalf), size.y / 2 / Math.tan(vHalf)) * FIT_PADDING
    wanted.copy(centre).addScaledVector(VIEW_DIR, distance)

    if (started.current) {
      aim.lerp(centre, FOLLOW_SMOOTHING)
      camera.position.lerp(wanted, FOLLOW_SMOOTHING)
    } else {
      aim.copy(centre)
      camera.position.copy(wanted)
      started.current = true
    }
    camera.lookAt(aim)
  })

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
  const legApplied = useRef(false)
  const started = useRef(false)

  useEffect(() => {
    const params = readHashParams()
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

  return { ready, failed }
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
  const { ready, failed } = useEmbedLink()
  const rootRef = useRef<THREE.Group | null>(null)
  useTransparentPage()

  if (failed || !ready) return <div className="fixed inset-0" />

  return (
    <div className="fixed inset-0">
      <StudioCanvas background="transparent" grid={false} controls={false}>
        <SceneContent rootRef={rootRef} />
        <FollowCamera targetRef={rootRef} />
      </StudioCanvas>
    </div>
  )
}
