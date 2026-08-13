export type MotionName = 'cruise' | 'rest' | 'pursue' | 'flee' | 'hold' | 'turn'

export type ActorKind = 'player' | 'viewer'

export interface Actor {
  id: string
  displayName: string
  kind: ActorKind
}

export type GameAction = { kind: 'feed' }

export interface GameEvent {
  action: GameAction
  actor: Actor
}

export interface SaveRef {
  id: string
  rigId: string
  legWeight: number | null
}

export interface GameSettings {
  creatureName: string
}

export interface CreatureState {
  hunger: number
  energy: number
  motion: MotionName
  lastFedBy: string | null
  feedCount: number
}

export interface WorldState {
  save: SaveRef
  settings: GameSettings
  creature: CreatureState
  elapsed: number
}
