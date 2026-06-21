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
  // For each physical body segment (index in the axial chain) the FINE-CPG oscillator it samples. The
  // CPG runs at a fixed fine resolution (CPG_AXIAL_SEGMENTS) decoupled from the body's joint count; the
  // body's joints read the fine chain at these positions. limbWiring indices are already fine indices.
  oscOfSegment: number[]
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

// The axial CPG runs at this many segments regardless of how many physical body joints sample it
// (paper Fig 2A: a 25-segment axial CPG, mapped onto an 8-joint robot). Decoupling CPG resolution from
// the body is what lets the per-coupling phase bias be the paper's ~0.066 cycle/segment (= total
// BODY_WAVES spread over n−1 fine intervals) while the body keeps its faithful total wavelength — the
// regime where the limb drive + proprioceptive feedback can pull the wave from traveling to standing.
export const CPG_AXIAL_SEGMENTS = 25

// Map each physical body segment to a fine-CPG oscillator by its fractional arc-length position (using
// the segment centre). Head ≈ osc 0, tail ≈ osc n−1; intermediate body joints sample the fine chain.
function mapBodyToFine(segmentLengths: number[], n: number): number[] {
  const nBody = segmentLengths.length
  let total = 0
  for (const L of segmentLengths) total += L
  if (total <= 1e-9) total = Math.max(1, nBody - 1)
  const out: number[] = new Array(nBody).fill(0)
  let cum = 0
  for (let k = 0; k < nBody; k++) {
    const centre = cum + segmentLengths[k] / 2
    const idx = Math.round((centre / total) * (n - 1))
    out[k] = Math.max(0, Math.min(n - 1, idx))
    cum += segmentLengths[k]
  }
  return out
}

export function buildCpgSpec(
  segmentLengths: number[],
  groups?: BodyGroup[],
  chainGroupIds?: string[]
): CpgSpec {
  const nBody = segmentLengths.length
  // Fine CPG resolution, decoupled from the body's joint count (never coarser than the body).
  const n = Math.max(nBody, CPG_AXIAL_SEGMENTS)
  const oscOfSegment = mapBodyToFine(segmentLengths, n)

  // Identify the limbs against the BODY chain, then remap the girdle indices to the fine CPG.
  const limbWiringBody = identifyLimbWiring(groups, chainGroupIds)
  const limbWiring: CpgLimbWiring | null = limbWiringBody
    ? { kFore: oscOfSegment[limbWiringBody.kFore], kHind: oscOfSegment[limbWiringBody.kHind] }
    : null
  const limbs = limbWiring ? LIMB_COUNT : 0
  const size = 2 * n + limbs
  const e: number[] = new Array(size).fill(E_AXIAL)
  const dTh: number[] = new Array(size).fill(D_TH_AXIAL)
  const couplings: CpgCoupling[] = []

  for (let k = 0; k < n; k++) {
    couplings.push({ from: k + n, to: k, w: 10, phi: Math.PI })
    couplings.push({ from: k, to: k + n, w: 10, phi: Math.PI })
  }

  // Uniform per-coupling phase bias over the fine chain: total BODY_WAVES wavelengths spread across
  // n−1 fine intervals → the paper's ~0.066 cycle/segment at n=25, BODY_WAVES=1.58.
  const phiSeg = n >= 2 ? (TWO_PI * BODY_WAVES) / (n - 1) : 0
  for (let k = 0; k < n - 1; k++) {
    couplings.push({ from: k, to: k + 1, w: 5, phi: phiSeg })
    couplings.push({ from: k + n, to: k + 1 + n, w: 5, phi: phiSeg })
    couplings.push({ from: k + 1, to: k, w: 1, phi: -phiSeg })
    couplings.push({ from: k + 1 + n, to: k + n, w: 1, phi: -phiSeg })
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
    cumulative -= phiSeg
  }
  if (limbWiring) {
    const base = 2 * n
    initialPhases[base + LIMB_LF] = 0
    initialPhases[base + LIMB_RF] = Math.PI / 2
    initialPhases[base + LIMB_LH] = Math.PI
    initialPhases[base + LIMB_RH] = (3 * Math.PI) / 2
  }

  return { n, limbs, e, dTh, couplings, initialPhases, limbWiring, oscOfSegment }
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
  frontSegments?: number,
  // Positive weakens the LEFT side (axial 0..n-1 + limbs LF/LH) → body curves left.
  turnBias?: number,
  // Independent drive for the four limb oscillators (paper Fig 6B: a separate, lower limb drive — they
  // used 0.63 vs an axial drive of 0.98). A lower limb drive keeps the limb oscillators active (below
  // their saturation threshold d_th=1.27) and slower than the axis, so the strong limb→axial coupling
  // imposes a STANDING wave on the girdles (forward terrestrial stepping). 0 = follow the global drive.
  limbDrive?: number,
  // Axial proprioceptive feedback (paper Fig 6C / Eq. in §"Sensory Feedback"). Per axial segment k the
  // ACTUAL joint angle θ_k (body curvature, from the physics) drives a stretch-receptor signal that is
  // fed back into each oscillator: φ̇ += −(s/r)·sin φ, ṙ += s·cos φ, with s = w_ipsi·[±θ]⁺ + w_contra·[∓θ]⁺
  // (ipsilateral curvature for one hemisegment, contralateral for the other). The paper's standing-wave
  // setting is w_ipsi = −w_contra = −0.65. This entrains the CPG to the real body, the second mechanism
  // for the walking standing wave. jointAngles is indexed by axial segment (length spec.n); 0 = off.
  jointAngles?: number[],
  feedbackIpsi?: number,
  feedbackContra?: number
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
  // Left/right differential drive (paper's turning): a single signed bias weakens one whole side
  // of the CPG (axial chain + limbs). Positive turnBias weakens the right oscillator chain so the
  // body curves toward its own left; negative weakens the left chain so the body curves right. The
  // signs are calibrated to the body's empirical drift direction under the Ekeberg + drag pipeline
  // (verified by scripts/locomotion-turn-direction.ts). tb=0 leaves both factors at 1 — bit-exact
  // with the pre-turn driveArr build.
  const tb = Math.max(-1, Math.min(1, turnBias ?? 0))
  const leftFactor = 1 - Math.max(0, -tb)
  const rightFactor = 1 - Math.max(0, tb)
  const base = 2 * spec.n
  // Limb oscillators (i >= base) take the independent limb drive when set (>0); else they follow the
  // global drive exactly (bit-exact with the pre-limb-drive build).
  const ld = limbDrive ?? 0
  const driveArr: number[] = new Array(size)
  for (let i = 0; i < size; i++) {
    let d: number
    if (i >= base) d = ld > 0 ? ld : drive
    else if (fc > 0 && i < spec.n) d = i < fc ? fd : drive
    else if (fc > 0 && i < base) d = i - spec.n < fc ? fd : drive
    else d = drive
    let side: number
    if (i < spec.n) side = leftFactor
    else if (i < base) side = rightFactor
    else {
      const li = i - base
      side = li === LIMB_LF || li === LIMB_LH ? leftFactor : rightFactor
    }
    driveArr[i] = d * side
  }

  const phases = state.phases
  const amplitudes = state.amplitudes

  // Axial proprioceptive feedback gains (held constant across the substeps; the joint angles are read
  // once per physics step). fbOn gates the whole block so the default path is bit-exact with no feedback.
  const fbIpsi = feedbackIpsi ?? 0
  const fbContra = feedbackContra ?? 0
  const fbOn = !!jointAngles && (fbIpsi !== 0 || fbContra !== 0)

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

    // Stretch-receptor feedback: each axial segment's actual curvature θ_k drives both hemisegment
    // oscillators (left = k, right = k+n). [θ]⁺ is ipsilateral for the left osc / contralateral for the
    // right, and vice-versa. φ̇ += −(s/r)·sin φ ; ṙ += s·cos φ (the Cartesian-perturbation form, paper Eq).
    if (fbOn) {
      const n = spec.n
      for (let k = 0; k < n; k++) {
        const theta = jointAngles![k] ?? 0
        if (theta === 0) continue
        const pos = theta > 0 ? theta : 0
        const neg = theta < 0 ? -theta : 0
        const sL = fbIpsi * pos + fbContra * neg
        const rL = amplitudes[k] > 1e-3 ? amplitudes[k] : 1e-3
        phaseDot[k] += -(sL / rL) * Math.sin(phases[k])
        ampDot[k] += sL * Math.cos(phases[k])
        const sR = fbIpsi * neg + fbContra * pos
        const rR = amplitudes[k + n] > 1e-3 ? amplitudes[k + n] : 1e-3
        phaseDot[k + n] += -(sR / rR) * Math.sin(phases[k + n])
        ampDot[k + n] += sR * Math.cos(phases[k + n])
      }
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
