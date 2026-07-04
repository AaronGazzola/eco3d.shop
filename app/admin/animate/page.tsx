'use client'

import { useEffect } from 'react'
import { AdminFrame } from '../_lib/AdminFrame'
import { AnimateScene } from './AnimateScene'
import { AnimateSidebar } from './AnimateSidebar'
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

export default function AnimatePage() {
  useConfigLink()
  return (
    <AdminFrame
      scene={<AnimateScene />}
      sidebar={<AnimateSidebar />}
    />
  )
}
