import { Actor, GameEvent, GameSettings, SaveRef } from './types'

export interface GameHost {
  getSave(): SaveRef
  getSettings(): GameSettings
  getActor(): Actor
  drainEvents(): GameEvent[]
}
