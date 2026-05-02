import { Behavior, BehaviorId } from '../types'
import { createWanderingBehavior } from './wandering'

export function createDragonBehaviors(): Record<BehaviorId, Behavior> {
  return {
    wandering: createWanderingBehavior(),
  }
}
