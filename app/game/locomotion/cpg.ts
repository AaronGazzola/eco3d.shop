import { BodyGroup } from '@/app/admin/_lib/types'
import { buildCascadeChain } from './chain'
import { findFrontHip, findRearHip, findLegsForHip } from './legs'

export const DEFAULT_NU_WALK = 1.0
export const DEFAULT_W_AXIAL = 5.0
export const DEFAULT_W_LIMB = 5.0
export const DEFAULT_PHI_AXIAL = 0.2
export const DEFAULT_A_GAIN = 10
export const DEFAULT_AXIAL_AMP_MAX = 0.5
export const DEFAULT_LIMB_AMP_MAX = 1.0
export const DEFAULT_STRIDE_FORWARD = 0.5
export const DEFAULT_STEER_SCALE = 0.5
export const DEFAULT_CLOSE_RADIUS = 1.5
export const DEFAULT_DRIVE_FALLOFF = 5.0
export const DEFAULT_STEER_FALLOFF = Math.PI / 4

export interface AxialOscState {
  phase: number
  amplitude: number
  amplitudeDot: number
}

export interface LimbOscState {
  phase: number
  amplitude: number
  amplitudeDot: number
}

export interface CpgState {
  axial: AxialOscState[]
  limb: LimbOscState[]
}

export interface AxialDescriptor {
  id: string
  name: string
  cascadeIndex: number
}

export type LimbSide = 'left' | 'right'

export interface LimbDescriptor {
  id: string
  hipId: string
  hipAxialIndex: number
  side: LimbSide
  isFront: boolean
  initialPhase: number
}

export type CouplingKind = 'axial-axial' | 'limb-axial'

export interface Coupling {
  kind: CouplingKind
  fromIndex: number
  toIndex: number
  weight: number
  phaseBias: number
}

export interface CpgNetwork {
  axial: AxialDescriptor[]
  limb: LimbDescriptor[]
  axialAxialCouplings: Coupling[]
  limbAxialCouplings: Coupling[]
}

export function buildCpgNetwork(groups: BodyGroup[]): CpgNetwork {
  const chain = buildCascadeChain(groups)
  const axial: AxialDescriptor[] = chain.map((g, i) => ({
    id: g.id,
    name: g.name,
    cascadeIndex: i,
  }))

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
  if (frontHip) {
    const idx = cascadeIdxFor.get(frontHip.id)
    if (idx !== undefined) {
      if (frontLegs.left?.nodeFoot && frontHip.nodeHipLeft) {
        limb.push({
          id: frontLegs.left.id,
          hipId: frontHip.id,
          hipAxialIndex: idx,
          side: 'left',
          isFront: true,
          initialPhase: 0,
        })
      }
      if (frontLegs.right?.nodeFoot && frontHip.nodeHipRight) {
        limb.push({
          id: frontLegs.right.id,
          hipId: frontHip.id,
          hipAxialIndex: idx,
          side: 'right',
          isFront: true,
          initialPhase: Math.PI,
        })
      }
    }
  }
  if (rearHip) {
    const idx = cascadeIdxFor.get(rearHip.id)
    if (idx !== undefined) {
      if (rearLegs.left?.nodeFoot && rearHip.nodeHipLeft) {
        limb.push({
          id: rearLegs.left.id,
          hipId: rearHip.id,
          hipAxialIndex: idx,
          side: 'left',
          isFront: false,
          initialPhase: Math.PI,
        })
      }
      if (rearLegs.right?.nodeFoot && rearHip.nodeHipRight) {
        limb.push({
          id: rearLegs.right.id,
          hipId: rearHip.id,
          hipAxialIndex: idx,
          side: 'right',
          isFront: false,
          initialPhase: 0,
        })
      }
    }
  }

  const axialAxialCouplings: Coupling[] = []
  for (let i = 0; i < axial.length - 1; i++) {
    axialAxialCouplings.push({
      kind: 'axial-axial',
      fromIndex: i + 1,
      toIndex: i,
      weight: DEFAULT_W_AXIAL,
      phaseBias: DEFAULT_PHI_AXIAL,
    })
    axialAxialCouplings.push({
      kind: 'axial-axial',
      fromIndex: i,
      toIndex: i + 1,
      weight: DEFAULT_W_AXIAL,
      phaseBias: -DEFAULT_PHI_AXIAL,
    })
  }

  const limbAxialCouplings: Coupling[] = []
  for (let li = 0; li < limb.length; li++) {
    limbAxialCouplings.push({
      kind: 'limb-axial',
      fromIndex: limb[li].hipAxialIndex,
      toIndex: li,
      weight: DEFAULT_W_LIMB,
      phaseBias: 0,
    })
  }

  return { axial, limb, axialAxialCouplings, limbAxialCouplings }
}

export function initCpgState(network: CpgNetwork): CpgState {
  return {
    axial: network.axial.map(() => ({ phase: 0, amplitude: 0, amplitudeDot: 0 })),
    limb: network.limb.map((l) => ({
      phase: l.initialPhase,
      amplitude: 0,
      amplitudeDot: 0,
    })),
  }
}

export interface CpgTickResult {
  axialYaws: number[]
  limbPhases: number[]
  intrinsicFrequency: number
}

function wrapPhase(p: number): number {
  const twoPi = 2 * Math.PI
  let x = p % twoPi
  if (x < 0) x += twoPi
  return x
}

export function tickCpg(
  state: CpgState,
  network: CpgNetwork,
  drive: number,
  steer: number,
  dt: number
): CpgTickResult {
  const driveClamped = Math.max(0, Math.min(1, drive))
  void steer

  const nuAxial = driveClamped * DEFAULT_NU_WALK
  const nuLimb = driveClamped * DEFAULT_NU_WALK
  const rAxialTarget = driveClamped * DEFAULT_AXIAL_AMP_MAX
  const rLimbTarget = driveClamped * DEFAULT_LIMB_AMP_MAX

  const axialDPhase = new Array<number>(state.axial.length)
  for (let i = 0; i < state.axial.length; i++) {
    axialDPhase[i] = 2 * Math.PI * nuAxial
  }
  for (const c of network.axialAxialCouplings) {
    const from = state.axial[c.fromIndex]
    const to = state.axial[c.toIndex]
    axialDPhase[c.toIndex] +=
      c.weight * from.amplitude * Math.sin(from.phase - to.phase - c.phaseBias)
  }

  const limbDPhase = new Array<number>(state.limb.length)
  for (let i = 0; i < state.limb.length; i++) {
    limbDPhase[i] = 2 * Math.PI * nuLimb
  }
  for (const c of network.limbAxialCouplings) {
    const from = state.axial[c.fromIndex]
    const to = state.limb[c.toIndex]
    limbDPhase[c.toIndex] +=
      c.weight * from.amplitude * Math.sin(from.phase - to.phase - c.phaseBias)
  }

  const a = DEFAULT_A_GAIN
  const a4 = a / 4

  for (let i = 0; i < state.axial.length; i++) {
    const s = state.axial[i]
    const ddr = a * (a4 * (rAxialTarget - s.amplitude) - s.amplitudeDot)
    s.amplitudeDot += ddr * dt
    s.amplitude += s.amplitudeDot * dt
    if (s.amplitude < 0) {
      s.amplitude = 0
      if (s.amplitudeDot < 0) s.amplitudeDot = 0
    }
    s.phase = wrapPhase(s.phase + axialDPhase[i] * dt)
  }

  for (let i = 0; i < state.limb.length; i++) {
    const s = state.limb[i]
    const ddr = a * (a4 * (rLimbTarget - s.amplitude) - s.amplitudeDot)
    s.amplitudeDot += ddr * dt
    s.amplitude += s.amplitudeDot * dt
    if (s.amplitude < 0) {
      s.amplitude = 0
      if (s.amplitudeDot < 0) s.amplitudeDot = 0
    }
    s.phase = wrapPhase(s.phase + limbDPhase[i] * dt)
  }

  const axialYaws = new Array<number>(state.axial.length)
  for (let i = 0; i < state.axial.length; i++) {
    axialYaws[i] = state.axial[i].amplitude * Math.cos(state.axial[i].phase)
  }
  const limbPhases = new Array<number>(state.limb.length)
  for (let i = 0; i < state.limb.length; i++) {
    limbPhases[i] = state.limb[i].phase
  }

  return { axialYaws, limbPhases, intrinsicFrequency: nuAxial }
}

export function axialYawWithSteer(
  yaw: number,
  steer: number,
  capYaw: number,
  steerScale: number
): number {
  const biased = yaw + steer * steerScale
  if (biased > capYaw) return capYaw
  if (biased < -capYaw) return -capYaw
  return biased
}

export interface DriveSteer {
  drive: number
  steer: number
}

export function computeDriveSteer(
  attractor: { x: number; y: number; z: number } | null,
  headXz: { x: number; z: number },
  headForwardXz: { x: number; z: number },
  closeRadius: number = DEFAULT_CLOSE_RADIUS,
  driveFalloff: number = DEFAULT_DRIVE_FALLOFF,
  steerFalloff: number = DEFAULT_STEER_FALLOFF
): DriveSteer {
  if (!attractor) return { drive: 0, steer: 0 }
  const dx = attractor.x - headXz.x
  const dz = attractor.z - headXz.z
  const distance = Math.sqrt(dx * dx + dz * dz)
  if (distance < 1e-6) return { drive: 0, steer: 0 }
  const drive = Math.max(0, Math.min(1, (distance - closeRadius) / driveFalloff))
  const ndx = dx / distance
  const ndz = dz / distance
  const dot = headForwardXz.x * ndx + headForwardXz.z * ndz
  const cross = headForwardXz.x * ndz - headForwardXz.z * ndx
  const signedAngle = Math.atan2(cross, dot)
  const steer = Math.max(-1, Math.min(1, signedAngle / steerFalloff))
  return { drive, steer }
}
