import { SimEngine } from '@/app/admin/animate/animateStore'
import { findSimPreset, SimPreset } from '@/app/admin/animate/simPresets'

export const CRUISE = 'cruise'

interface PublishedMotion {
  preset: string
  engine: SimEngine
}

const PUBLISHED: Record<string, PublishedMotion> = {
  [CRUISE]: { preset: 'flight base', engine: 'mujoco' },
}

export interface ResolvedMotion {
  requested: string
  resolved: string
  fellBack: boolean
  preset: SimPreset
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
  if (direct) return { requested, resolved: requested, fellBack: false, preset: presetFor(direct) }
  return { requested, resolved: CRUISE, fellBack: true, preset: presetFor(PUBLISHED[CRUISE]) }
}

export function publishedMotionNames(): string[] {
  return Object.keys(PUBLISHED)
}
