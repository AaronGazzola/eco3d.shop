export type GamePhase =
  | 'choosing'
  | 'confirming'
  | 'shaking'
  | 'cracking'
  | 'emerging'
  | 'live'

export interface EggPair {
  id: string
  topKey: string
  bottomKey: string
}

export interface EggSlot {
  id: string
  topKey: string
  bottomKey: string
  x: number
  z: number
}
