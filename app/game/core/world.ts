import { GameHost } from './host'
import { Actor, CreatureState, GameAction, MotionName, WorldState } from './types'

const HUNGER_PER_SECOND = 1 / 600
const ENERGY_PER_SECOND = 1 / 900
const FEED_RELIEF = 0.35
const HUNGRY_AT = 0.6
const TIRED_AT = 0.25

export interface World {
  state(): WorldState
  tick(dtSeconds: number): void
  dispatch(action: GameAction, actor: Actor): void
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function motionFor(creature: CreatureState): MotionName {
  if (creature.energy <= TIRED_AT) return 'rest'
  if (creature.hunger >= HUNGRY_AT) return 'pursue'
  return 'cruise'
}

export function createWorld(host: GameHost): World {
  const state: WorldState = {
    save: host.getSave(),
    settings: host.getSettings(),
    creature: { hunger: 0.2, energy: 0.9, motion: 'cruise', lastFedBy: null, feedCount: 0 },
    elapsed: 0,
  }
  state.creature.motion = motionFor(state.creature)

  function dispatch(action: GameAction, actor: Actor): void {
    if (action.kind !== 'feed') {
      console.error(`game core: unknown action "${(action as GameAction).kind}"`)
      throw new Error(`game core: unknown action "${(action as GameAction).kind}"`)
    }
    state.creature.hunger = clamp01(state.creature.hunger - FEED_RELIEF)
    state.creature.lastFedBy = actor.displayName
    state.creature.feedCount += 1
    state.creature.motion = motionFor(state.creature)
  }

  function tick(dtSeconds: number): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
      console.error(`game core: tick needs a finite non-negative delta, got ${dtSeconds}`)
      throw new Error(`game core: tick needs a finite non-negative delta, got ${dtSeconds}`)
    }
    for (const event of host.drainEvents()) dispatch(event.action, event.actor)
    state.settings = host.getSettings()
    state.creature.hunger = clamp01(state.creature.hunger + dtSeconds * HUNGER_PER_SECOND)
    state.creature.energy = clamp01(state.creature.energy - dtSeconds * ENERGY_PER_SECOND)
    state.creature.motion = motionFor(state.creature)
    state.elapsed += dtSeconds
  }

  return {
    state: () => state,
    tick,
    dispatch,
  }
}
