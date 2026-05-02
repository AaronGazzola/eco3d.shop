import { Behavior, BehaviorContext, DragonDrive, zeroDrive } from '../types'
import { BANK_GAIN, FOOT_ARC_DEFAULT_HEIGHT, MAX_BANK_ANGLE } from './constants'

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a <= -Math.PI) a += 2 * Math.PI
  return a
}

interface State {
  prevHeading: number | null
}

export function createWanderingBehavior(): Behavior {
  const state: State = { prevHeading: null }

  return {
    id: 'wandering',
    update(ctx: BehaviorContext, dt: number): DragonDrive {
      const drive = zeroDrive()
      const t = ctx.targetRef.current
      drive.headTarget = { x: t.x, y: 0, z: t.z }
      drive.legCadence = 1
      drive.legLiftAmplitude = FOOT_ARC_DEFAULT_HEIGHT

      const heading = Math.atan2(t.z, t.x)
      if (state.prevHeading !== null && dt > 0) {
        const headingDelta = normalizeAngle(heading - state.prevHeading)
        const rate = headingDelta / dt
        drive.bankAngle = clamp(rate * BANK_GAIN, -MAX_BANK_ANGLE, MAX_BANK_ANGLE)
      }
      state.prevHeading = heading

      return drive
    },
  }
}

