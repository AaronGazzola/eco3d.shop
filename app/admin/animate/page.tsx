'use client'

import { useEffect } from 'react'
import { AdminFrame } from '../_lib/AdminFrame'
import { AnimateScene } from './AnimateScene'
import { AnimateSidebar } from './AnimateSidebar'
import { useAnimateStore, decodeSimConfig, OVERLAY_NAMES, AnimateTab } from './animateStore'

// Apply a shared config link on mount: ?tab=simulate selects the tab, ?sim=<base64> applies a full
// SimConfig (unknown/missing keys ignored by applySimConfig), ?overlay=<csv> enables overlays. The
// ?t=<seconds> run-and-freeze param lands with deterministic seek in Increment B.
function useConfigLink() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const store = useAnimateStore.getState
    const tab = params.get('tab')
    if (tab === 'simulate' || tab === 'calibrate') store().setAnimateTab(tab as AnimateTab)
    const sim = params.get('sim')
    if (sim) store().applySimConfig(decodeSimConfig(sim))
    const overlay = params.get('overlay')
    if (overlay != null) {
      const names = overlay.split(',').map((n) => n.trim()).filter((n) => (OVERLAY_NAMES as readonly string[]).includes(n))
      store().setOverlays(names)
    }
  }, [])
}

export default function AnimatePage() {
  useConfigLink()
  return (
    <AdminFrame
      scene={<AnimateScene />}
      sidebar={<AnimateSidebar />}
    />
  )
}
