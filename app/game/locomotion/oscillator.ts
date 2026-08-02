import type { NetworkOutput, Oscillator, OscillatorNetwork } from './oscillator.types'

export const AMPLITUDE_GAIN = 5
export const SATURATION_RATE = 500

export const EXCITABILITY_AXIAL = 1.1
export const EXCITABILITY_FORELIMB = 0.8
export const EXCITABILITY_HINDLIMB = 0.5

export const SATURATION_THRESHOLD_AXIAL = 3
export const SATURATION_THRESHOLD_LIMB = 1.27

export const COUPLING_INTRASEGMENTAL = 10
export const COUPLING_ROSTROCAUDAL = 5
export const COUPLING_CAUDOROSTRAL = 1

export const PAPER_SEGMENT_COUNT = 25
export const PAPER_PHASE_BIAS_PER_SEGMENT = 0.066 * 2 * Math.PI

const SUBSTEP_SECONDS = 0.001
const MAX_SUBSTEPS = 200
const TWO_PI = Math.PI * 2

export function axialLeftIndex(joint: number): number {
  return joint * 2
}

export function axialRightIndex(joint: number): number {
  return joint * 2 + 1
}

export function limbIndex(network: OscillatorNetwork, slot: number): number {
  return network.jointCount * 2 + slot
}

export function saturation(drive: number, threshold: number): number {
  return 1 / (1 + Math.exp(SATURATION_RATE * (drive - threshold)))
}

export function targetAmplitude(drive: number, threshold: number): number {
  return drive * saturation(drive, threshold)
}

export function intrinsicFrequency(drive: number, excitability: number): number {
  return drive * excitability
}

function wrapPhase(phase: number): number {
  const wrapped = phase % TWO_PI
  return wrapped < 0 ? wrapped + TWO_PI : wrapped
}

function integrateOnce(
  network: OscillatorNetwork,
  h: number,
  dPhase: Float64Array,
  dAmplitude: Float64Array,
): void {
  const { oscillators, couplings } = network

  for (let i = 0; i < oscillators.length; i++) {
    const o = oscillators[i]
    dPhase[i] = TWO_PI * intrinsicFrequency(o.drive, o.excitability)
    dAmplitude[i] = AMPLITUDE_GAIN * (targetAmplitude(o.drive, o.saturationThreshold) - o.amplitude)
  }

  for (let c = 0; c < couplings.length; c++) {
    const coupling = couplings[c]
    const from = oscillators[coupling.from]
    const to = oscillators[coupling.to]
    dPhase[coupling.to] +=
      from.amplitude * coupling.weight * Math.sin(from.phase - to.phase - coupling.phaseBias)
  }

  for (let i = 0; i < oscillators.length; i++) {
    const o = oscillators[i]
    o.phase = wrapPhase(o.phase + dPhase[i] * h)
    o.amplitude = Math.max(0, o.amplitude + dAmplitude[i] * h)
  }
}

export function stepNetwork(network: OscillatorNetwork, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return
  const steps = Math.max(1, Math.min(MAX_SUBSTEPS, Math.round(dt / SUBSTEP_SECONDS)))
  const h = dt / steps
  const dPhase = new Float64Array(network.oscillators.length)
  const dAmplitude = new Float64Array(network.oscillators.length)
  for (let s = 0; s < steps; s++) integrateOnce(network, h, dPhase, dAmplitude)
}

export function oscillatorOutput(o: Oscillator): number {
  return o.amplitude * (1 + Math.cos(o.phase))
}

export function jointBends(network: OscillatorNetwork, gain: number): NetworkOutput {
  const bends: number[] = new Array(network.jointCount)
  for (let j = 0; j < network.jointCount; j++) {
    const left = oscillatorOutput(network.oscillators[axialLeftIndex(j)])
    const right = oscillatorOutput(network.oscillators[axialRightIndex(j)])
    bends[j] = gain * (left - right)
  }
  return { bends }
}

export function setAxialDrive(network: OscillatorNetwork, drive: number): void {
  for (let j = 0; j < network.jointCount; j++) {
    network.oscillators[axialLeftIndex(j)].drive = drive
    network.oscillators[axialRightIndex(j)].drive = drive
  }
}

export function scaledPhaseBias(jointCount: number): number {
  if (jointCount < 2) return 0
  return (PAPER_PHASE_BIAS_PER_SEGMENT * (PAPER_SEGMENT_COUNT - 1)) / (jointCount - 1)
}
