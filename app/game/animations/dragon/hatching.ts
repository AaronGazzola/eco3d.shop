import { Behavior, BehaviorContext, DragonDrive, zeroDrive } from '../types'
import {
  EGG_DEPTH,
  HATCHING_DURATION_MS,
  HATCHING_HEAD_PITCH_PEAK,
} from './constants'

interface State {
  startTime: number | null
  elapsed: number
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function createHatchingBehavior(): Behavior {
  const state: State = { startTime: null, elapsed: 0 }

  function progress(ctx: BehaviorContext): number {
    if (state.startTime === null) state.startTime = ctx.time
    state.elapsed = ctx.time - state.startTime
    return clamp01(state.elapsed / HATCHING_DURATION_MS)
  }

  return {
    id: 'hatching',
    update(ctx: BehaviorContext): DragonDrive {
      const drive = zeroDrive()
      const t = progress(ctx)
      drive.rootYOffset = -EGG_DEPTH * (1 - easeOutCubic(t))
      drive.headPitch = HATCHING_HEAD_PITCH_PEAK * (1 - Math.abs(2 * t - 1))
      drive.legCadence = 0
      drive.legLiftAmplitude = 0
      const target = ctx.targetRef.current
      drive.headTarget = { x: target.x, y: 0, z: target.z }
      return drive
    },
    isComplete(ctx: BehaviorContext): boolean {
      if (state.startTime === null) return false
      return ctx.time - state.startTime >= HATCHING_DURATION_MS
    },
  }
}

