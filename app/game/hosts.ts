import { GameHost } from './core/host'
import { Actor, GameAction, GameEvent, GameSettings, SaveRef } from './core/types'

export interface DrivableHost extends GameHost {
  raise(action: GameAction, actor?: Actor): void
}

const LOCAL_PLAYER: Actor = { id: 'local-player', displayName: 'You', kind: 'player' }
const OVERLAY_STREAMER: Actor = { id: 'overlay-streamer', displayName: 'Streamer', kind: 'player' }

function createHost(save: SaveRef, actor: Actor): DrivableHost {
  const settings: GameSettings = { creatureName: 'Dragon' }
  const queue: GameEvent[] = []
  return {
    getSave: () => save,
    getSettings: () => settings,
    getActor: () => actor,
    drainEvents: () => queue.splice(0, queue.length),
    raise: (action, from) => queue.push({ action, actor: from ?? actor }),
  }
}

export function createStandaloneHost(rigId: string): DrivableHost {
  return createHost({ id: rigId, rigId, legWeight: null }, LOCAL_PLAYER)
}

export function createPlatformHost(rigId: string, legWeight: number | null): DrivableHost {
  return createHost({ id: rigId, rigId, legWeight }, OVERLAY_STREAMER)
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
