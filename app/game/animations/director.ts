import { Behavior, BehaviorContext, BehaviorId, DragonDrive } from './types'
import { blendDrive } from './blend'
import { DEFAULT_BLEND_MS } from './dragon/constants'

interface DirectorOpts {
  initial: BehaviorId
  registry: Record<BehaviorId, Behavior>
  fallback?: BehaviorId
}

interface SetBehaviorOpts {
  blendMs?: number
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export class Director {
  private registry: Record<BehaviorId, Behavior>
  private fallback: BehaviorId
  active: Behavior
  target: Behavior | null = null
  private blendT = 1
  private blendDurationMs = DEFAULT_BLEND_MS

  constructor(opts: DirectorOpts) {
    this.registry = opts.registry
    this.fallback = opts.fallback ?? opts.initial
    const initial = opts.registry[opts.initial]
    if (!initial) throw new Error(`Director: unknown initial behavior "${opts.initial}"`)
    this.active = initial
  }

  setBehavior(id: BehaviorId, opts?: SetBehaviorOpts): void {
    const behavior = this.registry[id]
    if (!behavior) throw new Error(`Director: unknown behavior "${id}"`)
    if (this.active.id === id && this.target === null) return
    if (this.target?.id === id) return
    this.target = behavior
    this.blendT = 0
    this.blendDurationMs = opts?.blendMs ?? DEFAULT_BLEND_MS
  }

  update(ctx: BehaviorContext, dt: number): DragonDrive {
    const driveA = this.active.update(ctx, dt)

    if (this.target) {
      const driveB = this.target.update(ctx, dt)
      this.blendT = Math.min(1, this.blendT + (dt * 1000) / this.blendDurationMs)
      const eased = easeInOutCubic(this.blendT)
      const blended = blendDrive(driveA, driveB, eased)
      if (this.blendT >= 1) {
        this.active = this.target
        this.target = null
      }
      return blended
    }

    if (this.active.isComplete?.(ctx)) {
      const fallback = this.registry[this.fallback]
      if (fallback && fallback.id !== this.active.id) {
        this.target = fallback
        this.blendT = 0
        this.blendDurationMs = DEFAULT_BLEND_MS
      }
    }

    return driveA
  }
}
