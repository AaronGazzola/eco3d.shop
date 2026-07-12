'use client'

import { useEffect, useRef } from 'react'
import { AdminFrame } from '../_lib/AdminFrame'
import { AnimateScene } from './AnimateScene'
import { AnimateSidebar } from './AnimateSidebar'
import { useSharedStore } from '../_lib/sharedStore'
import { effectiveAngleCaps } from '@/app/game/locomotion/chain'
import { useAnimateStore, decodeSimConfig, OVERLAY_NAMES, AnimateTab, SIM_CONFIG_STORAGE_KEY } from './animateStore'

// Apply a shared config link on mount: #tab=simulate selects the tab, #sim=<base64> applies a full
// SimConfig (unknown/missing keys ignored by applySimConfig), #overlay=<csv> enables overlays. Params
// ride in the URL hash so they are never sent to the server (a large ?sim= query rode along on Server
// Action POSTs like the auth profile check and got rejected, bouncing the studio to login). The query
// string is still read as a fallback so older ?sim= links keep working once the page loads.
//
// The store uses skipHydration, so we MUST rehydrate the persisted config FIRST, then apply the link
// on top — otherwise a late rehydrate (this page owns the single rehydrate call now) would clobber the
// link's config with the viewer's last-saved config, and a shared demo link would silently show the
// wrong sim.
function useConfigLink() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const store = useAnimateStore.getState()
    // skipHydration is set on the persist store, and the async rehydrate()+then ordering was unreliable
    // (a late internal set re-clobbered the link). So hydrate DETERMINISTICALLY: read the saved config
    // synchronously and apply it, THEN apply the link on top so the link always wins. applySimConfig
    // only writes known SimConfig keys, so both steps are safe partial merges.
    try {
      const raw = localStorage.getItem(SIM_CONFIG_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const saved = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed
        if (saved && typeof saved === 'object') store.applySimConfig(saved)
      }
    } catch (err) {
      console.error('sim config hydrate failed', err)
    }
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash.length > 0 ? hash : window.location.search)
    const tab = params.get('tab')
    if (tab === 'simulate' || tab === 'calibrate') store.setAnimateTab(tab as AnimateTab)
    const sim = params.get('sim')
    if (sim) store.applySimConfig(decodeSimConfig(sim))
    const overlay = params.get('overlay')
    if (overlay != null) {
      const names = overlay.split(',').map((n) => n.trim()).filter((n) => (OVERLAY_NAMES as readonly string[]).includes(n))
      store.setOverlays(names)
    }
  }, [])
}

// Leg weight lives in the shared-store groups (`nodeWeight`), not in SimConfig, so it can't ride in the
// `sim=` blob. A separate `legw=<kg>` hash param carries it. The rig loads asynchronously, so this waits
// for leg groups to appear (re-runs as `groups` updates) then sets ALL legs once. Clamped to a small
// positive floor — a literal 0-mass hinge body is singular in the reduced-coordinate solver.
function useLegWeightLink() {
  const groups = useSharedStore((s) => s.groups)
  const setGroupNodeWeight = useSharedStore((s) => s.setGroupNodeWeight)
  const appliedRef = useRef(false)
  useEffect(() => {
    if (appliedRef.current || typeof window === 'undefined') return
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash.length > 0 ? hash : window.location.search)
    const raw = params.get('legw')
    if (raw == null) { appliedRef.current = true; return }
    const w = Number(raw)
    if (!Number.isFinite(w)) { appliedRef.current = true; return }
    const leg = groups.find((g) => g.type === 'leg-left' || g.type === 'leg-right')
    if (!leg) return // legs not loaded yet — wait for the next groups update
    setGroupNodeWeight(leg.id, Math.max(0.02, Math.min(10, w))) // gangs all legs
    appliedRef.current = true
  }, [groups, setGroupNodeWeight])
}

// Diagnostic override: force ALL legs to a symmetric fore/aft yaw cap of `legyaw` radians (pitch kept),
// so the sweep's reach can be tested against a big, symmetric, known cap. Like legw, this isn't in
// SimConfig — it rides in a `legyaw=<rad>` hash param and applies once the legs load (rebuilds the driver).
function useLegYawLink() {
  const groups = useSharedStore((s) => s.groups)
  const setGroupAngleCaps = useSharedStore((s) => s.setGroupAngleCaps)
  const appliedRef = useRef(false)
  useEffect(() => {
    if (appliedRef.current || typeof window === 'undefined') return
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash.length > 0 ? hash : window.location.search)
    const raw = params.get('legyaw')
    if (raw == null) { appliedRef.current = true; return }
    const v = Number(raw)
    if (!Number.isFinite(v)) { appliedRef.current = true; return }
    const legs = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right')
    if (!legs.length) return // legs not loaded yet
    const c = Math.max(0.05, Math.min(1.4, v))
    for (const leg of legs) {
      const cur = effectiveAngleCaps(leg)
      setGroupAngleCaps(leg.id, { yaw: c, yawBack: c, pitchUp: cur.pitchUp, pitchDown: cur.pitchDown })
    }
    appliedRef.current = true
  }, [groups, setGroupAngleCaps])
}

export default function AnimatePage() {
  useConfigLink()
  useLegWeightLink()
  useLegYawLink()
  return (
    <AdminFrame
      scene={<AnimateScene />}
      sidebar={<AnimateSidebar />}
    />
  )
}
