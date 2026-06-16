import { BodyGroup } from '@/app/admin/_lib/types'
import { buildSkeletonTree, flattenSkeleton } from './chain'
import { findFrontHip, findRearHip, findLegsForHip } from './legs'

export const A_GAIN = 5
export const B_SAT = 500
export const E_AXIAL = 1.1
export const D_TH_AXIAL = 3
export const E_FORE = 0.8
export const E_HIND = 0.5
export const D_TH_LIMB = 1.27
export const BODY_WAVES = 1.58

export const LIMB_LF = 0
export const LIMB_RF = 1
export const LIMB_LH = 2
export const LIMB_RH = 3
export const LIMB_COUNT = 4

const CPG_SUBSTEP = 0.002
const CPG_MAX_DT = 0.05
const TWO_PI = Math.PI * 2

export interface CpgCoupling {
  from: number
  to: number
  w: number
  phi: number
}

export interface CpgLimbWiring {
  kFore: number
  kHind: number
}

export interface CpgSpec {
  n: number
  limbs: number
  e: number[]
  dTh: number[]
  couplings: CpgCoupling[]
  initialPhases: number[]
  limbWiring: CpgLimbWiring | null
}

export interface CpgState {
  phases: number[]
  amplitudes: number[]
}

function identifyLimbWiring(
  groups: BodyGroup[] | undefined,
  chainGroupIds: string[] | undefined
): CpgLimbWiring | null {
  if (!groups || groups.length === 0) return null
  const front = findFrontHip(groups)
  const rear = findRearHip(groups)
  if (!front || !rear) return null
  const fLegs = findLegsForHip(groups, front.id)
  const rLegs = findLegsForHip(groups, rear.id)
  if (!fLegs.left || !fLegs.right || !rLegs.left || !rLegs.right) return null
  const ids = chainGroupIds ?? flattenSkeleton(buildSkeletonTree(groups)).map((g) => g.id)
  const kFore = ids.indexOf(front.id)
  const kHind = ids.indexOf(rear.id)
  if (kFore < 0 || kHind < 0) return null
  return { kFore, kHind }
}

export function buildCpgSpec(
  segmentLengths: number[],
  groups?: BodyGroup[],
  chainGroupIds?: string[]
): CpgSpec {
  const n = segmentLengths.length
  const limbWiring = identifyLimbWiring(groups, chainGroupIds)
  const limbs = limbWiring ? LIMB_COUNT : 0
  const size = 2 * n + limbs
  const e: number[] = new Array(size).fill(E_AXIAL)
  const dTh: number[] = new Array(size).fill(D_TH_AXIAL)
  const couplings: CpgCoupling[] = []

  for (let k = 0; k < n; k++) {
    couplings.push({ from: k + n, to: k, w: 10, phi: Math.PI })
    couplings.push({ from: k, to: k + n, w: 10, phi: Math.PI })
  }

  const perIntervalPhi: number[] = new Array(Math.max(0, n - 1)).fill(0)
  if (n >= 2) {
    let totalLen = 0
    for (let k = 0; k < n - 1; k++) totalLen += segmentLengths[k]
    if (totalLen <= 1e-9) totalLen = n - 1

    for (let k = 0; k < n - 1; k++) {
      const phi = ((segmentLengths[k] / totalLen) * TWO_PI * BODY_WAVES)
      perIntervalPhi[k] = phi

      couplings.push({ from: k, to: k + 1, w: 5, phi })
      couplings.push({ from: k + n, to: k + 1 + n, w: 5, phi })

      couplings.push({ from: k + 1, to: k, w: 1, phi: -phi })
      couplings.push({ from: k + 1 + n, to: k + n, w: 1, phi: -phi })
    }
  }

  if (limbWiring) {
    const base = 2 * n
    const LF = base + LIMB_LF
    const RF = base + LIMB_RF
    const LH = base + LIMB_LH
    const RH = base + LIMB_RH
    e[LF] = E_FORE; e[RF] = E_FORE; e[LH] = E_HIND; e[RH] = E_HIND
    dTh[LF] = D_TH_LIMB; dTh[RF] = D_TH_LIMB; dTh[LH] = D_TH_LIMB; dTh[RH] = D_TH_LIMB

    const interlimb: Array<[number, number, number]> = [
      [LF, RF, 10], [RF, LF, 10],
      [LH, RH, 10], [RH, LH, 10],
      [LF, LH, 3],  [RF, RH, 3],
      [LH, LF, 30], [RH, RF, 30],
    ]
    for (const [from, to, w] of interlimb) {
      couplings.push({ from, to, w, phi: Math.PI })
    }

    const { kFore, kHind } = limbWiring
    const axForeL = kFore
    const axForeR = kFore + n
    const axHindL = kHind
    const axHindR = kHind + n
    const limbToAxial: Array<[number, number]> = [
      [LF, axForeL], [RF, axForeR],
      [LH, axHindL], [RH, axHindR],
    ]
    for (const [limb, ax] of limbToAxial) {
      couplings.push({ from: limb, to: ax, w: 30, phi: 4 })
      couplings.push({ from: ax, to: limb, w: 2.5, phi: -4 })
    }
  }

  const initialPhases: number[] = new Array(size).fill(0)
  let cumulative = 0
  for (let k = 0; k < n; k++) {
    const wrapped = ((cumulative % TWO_PI) + TWO_PI) % TWO_PI
    initialPhases[k] = wrapped
    initialPhases[k + n] = (wrapped + Math.PI) % TWO_PI
    if (k < n - 1) cumulative -= perIntervalPhi[k]
  }
  if (limbWiring) {
    const base = 2 * n
    initialPhases[base + LIMB_LF] = 0
    initialPhases[base + LIMB_RF] = Math.PI / 2
    initialPhases[base + LIMB_LH] = Math.PI
    initialPhases[base + LIMB_RH] = (3 * Math.PI) / 2
  }

  return { n, limbs, e, dTh, couplings, initialPhases, limbWiring }
}

export function initCpgState(spec: CpgSpec): CpgState {
  const size = 2 * spec.n + spec.limbs
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
  dt: number,
  frontDrive?: number,
  frontSegments?: number
): void {
  if (spec.n === 0) return
  const clampedDt = Math.max(0, Math.min(dt, CPG_MAX_DT))
  if (clampedDt === 0) return

  const subSteps = Math.max(1, Math.ceil(clampedDt / CPG_SUBSTEP))
  const h = clampedDt / subSteps
  const size = 2 * spec.n + spec.limbs

  // Differential drive (paper's forward-stepping regime): the rostral-most axial segments get a
  // lower drive than the rest of the body + limbs, which shapes the body wave. frontSegments=0
  // disables it (every oscillator gets the global drive); otherwise the first frontSegments
  // segments of both chains use frontDrive while limbs and caudal segments keep the global drive.
  const fc = Math.max(0, Math.min(spec.n, Math.floor(frontSegments ?? 0)))
  const fd = frontDrive ?? drive
  const driveArr: number[] = new Array(size)
  for (let i = 0; i < size; i++) {
    if (fc > 0 && i < spec.n) driveArr[i] = i < fc ? fd : drive
    else if (fc > 0 && i < 2 * spec.n) driveArr[i] = i - spec.n < fc ? fd : drive
    else driveArr[i] = drive
  }

  const phases = state.phases
  const amplitudes = state.amplitudes

  for (let step = 0; step < subSteps; step++) {
    const phaseDot: number[] = new Array(size).fill(0)
    const ampDot: number[] = new Array(size).fill(0)

    for (let i = 0; i < size; i++) {
      const nu = driveArr[i] * excitability * spec.e[i]
      phaseDot[i] = TWO_PI * nu
    }

    for (const c of spec.couplings) {
      const dPhase = phases[c.from] - phases[c.to] - c.phi
      phaseDot[c.to] += amplitudes[c.from] * c.w * Math.sin(dPhase)
    }

    for (let i = 0; i < size; i++) {
      const sat = sigmoidSat(driveArr[i], spec.dTh[i])
      const target = driveArr[i] * sat
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

export function limbOutput(state: CpgState, spec: CpgSpec, limbIdx: number): number {
  if (spec.limbs === 0) return 0
  return oscillatorOutput(state, 2 * spec.n + limbIdx)
}

export function limbPhase(state: CpgState, spec: CpgSpec, limbIdx: number): number {
  if (spec.limbs === 0) return 0
  return state.phases[2 * spec.n + limbIdx]
}
