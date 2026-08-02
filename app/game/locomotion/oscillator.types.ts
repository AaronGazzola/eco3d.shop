export interface Oscillator {
  id: string
  phase: number
  amplitude: number
  drive: number
  excitability: number
  saturationThreshold: number
}

export interface Coupling {
  from: number
  to: number
  weight: number
  phaseBias: number
}

export interface OscillatorNetwork {
  oscillators: Oscillator[]
  couplings: Coupling[]
  jointCount: number
}

export interface NetworkOutput {
  bends: number[]
}

export type LimbSlot = 'fore-left' | 'fore-right' | 'hind-left' | 'hind-right'

export const LIMB_SLOTS: LimbSlot[] = ['fore-left', 'fore-right', 'hind-left', 'hind-right']
