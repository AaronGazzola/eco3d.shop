import { SimEngine } from '@/app/admin/animate/animateStore'
import { findSimPreset, SimPreset } from '@/app/admin/animate/simPresets'

export const CRUISE = 'cruise'

// The face of the tank the creature is watched through. It belongs to the MOTION, not to the page: a
// creature on the floor is watched from above and one in flight is watched square-on through the glass,
// and the difference is a property of how it moves. The camera was hardcoded side-on, which was correct
// only for as long as every motion was flight — pointing `cruise` at a grounded preset without moving
// the face here would leave the overlay watching a floor edge-on.
export type TankView = 'side' | 'overhead'

interface PublishedMotion {
  preset: string
  engine: SimEngine
  view: TankView
}

// Flight is sidelined rather than abandoned: `flight base` is still published in the preset ladder and
// still measured, but nothing resolves to it. It reaches a wall after about 22 seconds and a sustained
// press against the glass pitches it into the ceiling, and the steering that fixes that is a phase that
// has not been built.
const PUBLISHED: Record<string, PublishedMotion> = {
  [CRUISE]: { preset: 'ground tank', engine: 'mujoco', view: 'overhead' },
}

export interface ResolvedMotion {
  requested: string
  resolved: string
  fellBack: boolean
  preset: SimPreset
  view: TankView
}

function presetFor(published: PublishedMotion): SimPreset {
  const preset = findSimPreset(published.preset, published.engine)
  if (!preset) {
    console.error(`motion: published preset "${published.preset}" is missing for engine ${published.engine}`)
    throw new Error(`motion: published preset "${published.preset}" is missing for engine ${published.engine}`)
  }
  return preset
}

export function resolveMotion(requested: string): ResolvedMotion {
  const direct = PUBLISHED[requested]
  if (direct)
    return { requested, resolved: requested, fellBack: false, preset: presetFor(direct), view: direct.view }
  const fallback = PUBLISHED[CRUISE]
  return { requested, resolved: CRUISE, fellBack: true, preset: presetFor(fallback), view: fallback.view }
}

export function publishedMotionNames(): string[] {
  return Object.keys(PUBLISHED)
}
