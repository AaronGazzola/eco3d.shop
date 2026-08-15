import { GameHost } from './core/host'
import { Actor, GameAction, GameEvent, GameSettings, SaveRef } from './core/types'
import { actionForCommand } from './platform/actions'
import { PlatformEvent, PlatformSettings } from './platform/channel'

export interface DrivableHost extends GameHost {
  raise(action: GameAction, actor?: Actor): void
}

export interface PlatformDrivenHost extends DrivableHost {
  applyPlatformSettings(settings: PlatformSettings): void
  deliver(event: PlatformEvent): void
}

const DEFAULT_CREATURE_NAME = 'Dragon'

const LOCAL_PLAYER: Actor = { id: 'local-player', displayName: 'You', kind: 'player' }
const OVERLAY_STREAMER: Actor = { id: 'overlay-streamer', displayName: 'Streamer', kind: 'player' }

function createHost(save: SaveRef, actor: Actor) {
  const settings: GameSettings = { creatureName: DEFAULT_CREATURE_NAME }
  const queue: GameEvent[] = []
  const host: DrivableHost = {
    getSave: () => save,
    getSettings: () => settings,
    getActor: () => actor,
    drainEvents: () => queue.splice(0, queue.length),
    raise: (action, from) => queue.push({ action, actor: from ?? actor }),
  }
  return { host, settings }
}

export function createStandaloneHost(rigId: string): DrivableHost {
  return createHost({ id: rigId, rigId, legWeight: null }, LOCAL_PLAYER).host
}

export function createPlatformHost(rigId: string, legWeight: number | null): PlatformDrivenHost {
  const { host, settings } = createHost({ id: rigId, rigId, legWeight }, OVERLAY_STREAMER)

  return {
    ...host,
    // Mapped, never adopted. The platform's settings are an opaque object it does
    // not interpret, so a key added there later cannot break the game and a key
    // withdrawn falls back to the default. `world.tick` re-reads getSettings on
    // every tick, so a change reaches the creature with no further plumbing.
    applyPlatformSettings: (incoming) => {
      const name = incoming.creatureName
      settings.creatureName =
        typeof name === 'string' && name.trim() ? name.trim() : DEFAULT_CREATURE_NAME
    },
    // A chatter is a viewer, not the streamer. The actor id is the opaque one the
    // platform supplied: stable for this chatter on this channel in this overlay,
    // and useless anywhere else. The display name is for display and nothing else
    // — it is neither stable nor unique, and nothing is keyed to it.
    deliver: (event) => {
      const action = actionForCommand(event.keyword)
      if (!action) {
        console.error(`overlay: no game action for the command "${event.keyword}" — ignoring it`)
        return
      }
      host.raise(action, {
        id: event.actor,
        displayName: event.actorName?.trim() || 'Someone',
        kind: 'viewer',
      })
    },
  }
}

export function readPlatformLink(hash: string): { rigId: string; legWeight: number | null } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (params.get('sim')) {
    console.error(
      'embed: this link carries a sim configuration, which the game ignores — motion is chosen by the game and resolved by name',
    )
  }
  const rigId = params.get('rig')
  if (!rigId) {
    console.error('embed: no rig in the link — nothing to render')
    return null
  }
  const rawLegWeight = params.get('legw')
  if (rawLegWeight == null) return { rigId, legWeight: null }
  const legWeight = Number(rawLegWeight)
  if (!Number.isFinite(legWeight)) {
    console.error(`embed: leg weight "${rawLegWeight}" is not a number — ignoring it`)
    return { rigId, legWeight: null }
  }
  return { rigId, legWeight }
}
