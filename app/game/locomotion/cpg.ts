import { BodySpec } from './body'

export const A_GAIN = 5
export const B_SAT = 500
export const E_AXIAL = 1.1
export const D_TH_AXIAL = 3
export const BODY_WAVES = 1.58

const CPG_SUBSTEP = 0.002
const CPG_MAX_DT = 0.05
const TWO_PI = Math.PI * 2

export interface CpgCoupling {
  from: number
  to: number
  w: number
  phi: number
}

export interface CpgSpec {
  n: number
  e: number[]
  dTh: number[]
  couplings: CpgCoupling[]
  initialPhases: number[]
}

export interface CpgState {
  phases: number[]
  amplitudes: number[]
}

export function buildCpgSpec(bodySpec: BodySpec): CpgSpec {
  const n = bodySpec.segments.length
  const e: number[] = new Array(2 * n).fill(E_AXIAL)
  const dTh: number[] = new Array(2 * n).fill(D_TH_AXIAL)
  const couplings: CpgCoupling[] = []

  for (let k = 0; k < n; k++) {
    couplings.push({ from: k + n, to: k, w: 10, phi: Math.PI })
    couplings.push({ from: k, to: k + n, w: 10, phi: Math.PI })
  }

  const perIntervalPhi: number[] = new Array(Math.max(0, n - 1)).fill(0)
  if (n >= 2) {
    let totalLen = 0
    for (let k = 0; k < n - 1; k++) totalLen += bodySpec.segments[k].length
    if (totalLen <= 1e-9) totalLen = n - 1

    for (let k = 0; k < n - 1; k++) {
      const phi = ((bodySpec.segments[k].length / totalLen) * TWO_PI * BODY_WAVES)
      perIntervalPhi[k] = phi

      couplings.push({ from: k, to: k + 1, w: 5, phi })
      couplings.push({ from: k + n, to: k + 1 + n, w: 5, phi })

      couplings.push({ from: k + 1, to: k, w: 1, phi: -phi })
      couplings.push({ from: k + 1 + n, to: k + n, w: 1, phi: -phi })
    }
  }

  const initialPhases: number[] = new Array(2 * n).fill(0)
  let cumulative = 0
  for (let k = 0; k < n; k++) {
    const wrapped = ((cumulative % TWO_PI) + TWO_PI) % TWO_PI
    initialPhases[k] = wrapped
    initialPhases[k + n] = (wrapped + Math.PI) % TWO_PI
    if (k < n - 1) cumulative -= perIntervalPhi[k]
  }

  return { n, e, dTh, couplings, initialPhases }
}

export function initCpgState(spec: CpgSpec): CpgState {
  const size = 2 * spec.n
  return {
    phases: spec.initialPhases.slice(),
    amplitudes: new Array(size).fill(0),
  }
}

function sigmoidSat(drive: number, dTh: number): number {
  const z = B_SAT * (drive - dTh)
  if (z > 50) return 0
  if (z < -50) return 1
  return 1 / (1 + Math.exp(z))
}

export function stepCpg(
  state: CpgState,
  spec: CpgSpec,
  drive: number,
  excitability: number,
  dt: number
): void {
  if (spec.n === 0) return
  const clampedDt = Math.max(0, Math.min(dt, CPG_MAX_DT))
  if (clampedDt === 0) return

  const subSteps = Math.max(1, Math.ceil(clampedDt / CPG_SUBSTEP))
  const h = clampedDt / subSteps
  const size = 2 * spec.n

  const phases = state.phases
  const amplitudes = state.amplitudes

  for (let step = 0; step < subSteps; step++) {
    const phaseDot: number[] = new Array(size).fill(0)
    const ampDot: number[] = new Array(size).fill(0)

    for (let i = 0; i < size; i++) {
      const nu = drive * excitability * spec.e[i]
      phaseDot[i] = TWO_PI * nu
    }

    for (const c of spec.couplings) {
      const dPhase = phases[c.from] - phases[c.to] - c.phi
      phaseDot[c.to] += amplitudes[c.from] * c.w * Math.sin(dPhase)
    }

    for (let i = 0; i < size; i++) {
      const sat = sigmoidSat(drive, spec.dTh[i])
      const target = drive * sat
      ampDot[i] = A_GAIN * (target - amplitudes[i])
    }

    for (let i = 0; i < size; i++) {
      phases[i] += phaseDot[i] * h
      amplitudes[i] += ampDot[i] * h
      if (phases[i] >= TWO_PI || phases[i] < 0) {
        phases[i] = phases[i] - TWO_PI * Math.floor(phases[i] / TWO_PI)
      }
    }
  }
}

export function oscillatorOutput(state: CpgState, i: number): number {
  return state.amplitudes[i] * (1 + Math.cos(state.phases[i]))
}

export function signedActivation(state: CpgState, spec: CpgSpec, k: number): number {
  return oscillatorOutput(state, k) - oscillatorOutput(state, k + spec.n)
}
