import { Behavior, BehaviorId } from '../types'
import { createWanderingBehavior } from './wandering'
import { createHatchingBehavior } from './hatching'

export function createDragonBehaviors(): Record<BehaviorId, Behavior> {
  return {
    wandering: createWanderingBehavior(),
    hatching: createHatchingBehavior(),
  }
}
