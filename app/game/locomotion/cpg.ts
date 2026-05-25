import { BodyGroup } from '@/app/admin/_lib/types'
import { buildCascadeChain } from './chain'
import { findFrontHip, findRearHip, findLegsForHip } from './legs'

export const A_GAIN = 5
export const SAT_RATE = 500
export const E_AXIAL = 1.1
export const E_FORELIMB = 0.8
export const E_HINDLIMB = 0.5
export const D_TH_AXIAL = 3
export const D_TH_LIMB = 1.27
export const W_INTRA = 10
export const PHI_INTRA = Math.PI
export const W_ROSTRO = 5
export const W_CAUDO = 1
export const PHI_INTER = 0.066 * 2 * Math.PI
export const W_LIMB_LATERAL = 10
export const W_LIMB_ROSTRO = 3
export const W_LIMB_CAUDO = 30
export const PHI_LIMB = Math.PI
export const W_LIMB_TO_AXIAL = 30
export const PHI_LIMB_TO_AXIAL = 4
export const W_AXIAL_TO_LIMB = 2.5
export const PHI_AXIAL_TO_LIMB = -4
export const AMP_REF = 1.0
export const AXIAL_BEND_SCALE = 0.4
export const BODY_SPEED = 4.0
export const STRIDE_FORWARD = 1.2

function diagonalTrotPhase(isFront: boolean, side: LimbSide): number {
  const frontLeftOrRearRight = (isFront && side === 'left') || (!isFront && side === 'right')
  return frontLeftOrRearRight ? 0 : Math.PI
}

export type LimbSide = 'left' | 'right'

export interface OscDescriptor {
  excitability: number
  dThreshold: number
  initialPhase: number
  side: LimbSide | null
  isLimb: boolean
}

export interface OscState {
  phase: number
  amplitude: number
}

export interface CpgState {
  osc: OscState[]
}

export interface AxialPair {
  id: string
  name: string
  cascadeIndex: number
  leftIndex: number
  rightIndex: number
}

export interface LimbDescriptor {
  id: string
  hipId: string
  hipAxialIndex: number
  side: LimbSide
  isFront: boolean
  oscIndex: number
}

export interface Coupling {
  fromIndex: number
  toIndex: number
  weight: number
  phaseBias: number
}

export interface CpgNetwork {
  oscillators: OscDescriptor[]
  axial: AxialPair[]
  limb: LimbDescriptor[]
  couplings: Coupling[]
}

export function buildCpgNetwork(groups: BodyGroup[]): CpgNetwork {
  const chain = buildCascadeChain(groups)
  const oscillators: OscDescriptor[] = []
  const axial: AxialPair[] = []

  for (let i = 0; i < chain.length; i++) {
    const g = chain[i]
    const leftIndex = oscillators.length
    oscillators.push({
      excitability: E_AXIAL,
      dThreshold: D_TH_AXIAL,
      initialPhase: 0,
      side: 'left',
      isLimb: false,
    })
    const rightIndex = oscillators.length
    oscillators.push({
      excitability: E_AXIAL,
      dThreshold: D_TH_AXIAL,
      initialPhase: Math.PI,
      side: 'right',
      isLimb: false,
    })
    axial.push({ id: g.id, name: g.name, cascadeIndex: i, leftIndex, rightIndex })
  }

  const couplings: Coupling[] = []
  for (const p of axial) {
    couplings.push({
      fromIndex: p.rightIndex,
      toIndex: p.leftIndex,
      weight: W_INTRA,
      phaseBias: PHI_INTRA,
    })
    couplings.push({
      fromIndex: p.leftIndex,
      toIndex: p.rightIndex,
      weight: W_INTRA,
      phaseBias: PHI_INTRA,
    })
  }
  for (let i = 0; i < axial.length - 1; i++) {
    const a = axial[i]
    const b = axial[i + 1]
    couplings.push({
      fromIndex: a.leftIndex,
      toIndex: b.leftIndex,
      weight: W_ROSTRO,
      phaseBias: PHI_INTER,
    })
    couplings.push({
      fromIndex: b.leftIndex,
      toIndex: a.leftIndex,
      weight: W_CAUDO,
      phaseBias: -PHI_INTER,
    })
    couplings.push({
      fromIndex: a.rightIndex,
      toIndex: b.rightIndex,
      weight: W_ROSTRO,
      phaseBias: PHI_INTER,
    })
    couplings.push({
      fromIndex: b.rightIndex,
      toIndex: a.rightIndex,
      weight: W_CAUDO,
      phaseBias: -PHI_INTER,
    })
  }

  const cascadeIdxFor = new Map<string, number>()
  chain.forEach((g, i) => cascadeIdxFor.set(g.id, i))

  const frontHip = findFrontHip(groups)
  const rearHip = findRearHip(groups)
  const frontLegs = frontHip
    ? findLegsForHip(groups, frontHip.id)
    : { left: null, right: null }
  const rearLegs = rearHip
    ? findLegsForHip(groups, rearHip.id)
    : { left: null, right: null }

  const limb: LimbDescriptor[] = []
  const addLimb = (
    leg: BodyGroup | null,
    hip: BodyGroup,
    hipNode: { x: number; z: number } | undefined,
    side: LimbSide,
    isFront: boolean
  ) => {
    if (!leg?.nodeFoot || !hipNode) return
    const hipAxialIndex = cascadeIdxFor.get(hip.id)
    if (hipAxialIndex === undefined) return
    const oscIndex = oscillators.length
    oscillators.push({
      excitability: E_AXIAL,
      dThreshold: D_TH_LIMB,
      initialPhase: diagonalTrotPhase(isFront, side),
      side,
      isLimb: true,
    })
    limb.push({ id: leg.id, hipId: hip.id, hipAxialIndex, side, isFront, oscIndex })
  }

  if (frontHip) {
    addLimb(frontLegs.left, frontHip, frontHip.nodeHipLeft, 'left', true)
    addLimb(frontLegs.right, frontHip, frontHip.nodeHipRight, 'right', true)
  }
  if (rearHip) {
    addLimb(rearLegs.left, rearHip, rearHip.nodeHipLeft, 'left', false)
    addLimb(rearLegs.right, rearHip, rearHip.nodeHipRight, 'right', false)
  }

  const findLimb = (isFront: boolean, side: LimbSide) =>
    limb.find((l) => l.isFront === isFront && l.side === side)
  const pair = (
    a: LimbDescriptor | undefined,
    b: LimbDescriptor | undefined,
    weightAtoB: number,
    weightBtoA: number
  ) => {
    if (!a || !b) return
    couplings.push({ fromIndex: a.oscIndex, toIndex: b.oscIndex, weight: weightAtoB, phaseBias: PHI_LIMB })
    couplings.push({ fromIndex: b.oscIndex, toIndex: a.oscIndex, weight: weightBtoA, phaseBias: PHI_LIMB })
  }
  const fl = findLimb(true, 'left')
  const fr = findLimb(true, 'right')
  const rl = findLimb(false, 'left')
  const rr = findLimb(false, 'right')
  pair(fl, fr, W_LIMB_LATERAL, W_LIMB_LATERAL)
  pair(rl, rr, W_LIMB_LATERAL, W_LIMB_LATERAL)
  pair(fl, rl, W_LIMB_ROSTRO, W_LIMB_CAUDO)
  pair(fr, rr, W_LIMB_ROSTRO, W_LIMB_CAUDO)

  for (const l of limb) {
    const girdle = axial[l.hipAxialIndex]
    if (!girdle) continue
    const axialIndex = l.side === 'left' ? girdle.leftIndex : girdle.rightIndex
    couplings.push({
      fromIndex: l.oscIndex,
      toIndex: axialIndex,
      weight: W_LIMB_TO_AXIAL,
      phaseBias: PHI_LIMB_TO_AXIAL,
    })
    couplings.push({
      fromIndex: axialIndex,
      toIndex: l.oscIndex,
      weight: W_AXIAL_TO_LIMB,
      phaseBias: PHI_AXIAL_TO_LIMB,
    })
  }

  return { oscillators, axial, limb, couplings }
}

export function initCpgState(network: CpgNetwork): CpgState {
  return {
    osc: network.oscillators.map((o) => ({ phase: o.initialPhase, amplitude: 0 })),
  }
}

export interface CpgTickResult {
  outputs: number[]
}

function wrapPhase(p: number): number {
  const twoPi = 2 * Math.PI
  let x = p % twoPi
  if (x < 0) x += twoPi
  return x
}

function saturation(d: number, dThreshold: number): number {
  return 1 / (1 + Math.exp(SAT_RATE * (d - dThreshold)))
}

export function tickCpg(
  state: CpgState,
  network: CpgNetwork,
  drive: number,
  dt: number
): CpgTickResult {
  const d = Math.max(0, drive)
  const n = network.oscillators.length

  const dPhase = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const nu = d * network.oscillators[i].excitability
    dPhase[i] = 2 * Math.PI * nu
  }
  for (const c of network.couplings) {
    const from = state.osc[c.fromIndex]
    const to = state.osc[c.toIndex]
    dPhase[c.toIndex] +=
      c.weight * from.amplitude * Math.sin(from.phase - to.phase - c.phaseBias)
  }

  const outputs = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const osc = network.oscillators[i]
    const s = state.osc[i]
    const R = d * saturation(d, osc.dThreshold)
    s.amplitude += A_GAIN * (R - s.amplitude) * dt
    if (s.amplitude < 0) s.amplitude = 0
    s.phase = wrapPhase(s.phase + dPhase[i] * dt)
    outputs[i] = s.amplitude * (1 + Math.cos(s.phase))
  }

  return { outputs }
}

export function axialBend(result: CpgTickResult, pair: AxialPair, cap: number): number {
  const xL = result.outputs[pair.leftIndex]
  const xR = result.outputs[pair.rightIndex]
  const bend = (AXIAL_BEND_SCALE * cap * (xL - xR)) / (2 * AMP_REF)
  if (bend > cap) return cap
  if (bend < -cap) return -cap
  return bend
}
