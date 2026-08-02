import type { BodyGroup } from '@/app/admin/_lib/types'
import type { Pose } from '@/app/game/animation.types'
import { buildSkeletonTree, flattenSkeleton } from '@/app/game/skeleton'
import {
  COUPLING_CAUDOROSTRAL,
  COUPLING_INTRASEGMENTAL,
  COUPLING_ROSTROCAUDAL,
  EXCITABILITY_AXIAL,
  EXCITABILITY_FORELIMB,
  EXCITABILITY_HINDLIMB,
  SATURATION_THRESHOLD_AXIAL,
  SATURATION_THRESHOLD_LIMB,
  axialLeftIndex,
  axialRightIndex,
  scaledPhaseBias,
} from './oscillator'
import { LIMB_SLOTS } from './oscillator.types'
import type { Coupling, Oscillator, OscillatorNetwork } from './oscillator.types'

export function axialChain(groups: BodyGroup[]): BodyGroup[] {
  return flattenSkeleton(buildSkeletonTree(groups))
}

function makeOscillator(
  id: string,
  drive: number,
  excitability: number,
  saturationThreshold: number,
  phase: number,
): Oscillator {
  return { id, phase, amplitude: 0, drive, excitability, saturationThreshold }
}

export function buildNetwork(groups: BodyGroup[], drive: number): OscillatorNetwork {
  const chain = axialChain(groups)
  const jointCount = chain.length
  const oscillators: Oscillator[] = []

  for (let j = 0; j < jointCount; j++) {
    oscillators.push(
      makeOscillator(`${chain[j].id}:left`, drive, EXCITABILITY_AXIAL, SATURATION_THRESHOLD_AXIAL, 0),
    )
    oscillators.push(
      makeOscillator(
        `${chain[j].id}:right`,
        drive,
        EXCITABILITY_AXIAL,
        SATURATION_THRESHOLD_AXIAL,
        Math.PI,
      ),
    )
  }

  for (const slot of LIMB_SLOTS) {
    const fore = slot.startsWith('fore')
    oscillators.push(
      makeOscillator(
        `limb:${slot}`,
        0,
        fore ? EXCITABILITY_FORELIMB : EXCITABILITY_HINDLIMB,
        SATURATION_THRESHOLD_LIMB,
        0,
      ),
    )
  }

  const bias = scaledPhaseBias(jointCount)
  const couplings: Coupling[] = []

  for (let j = 0; j < jointCount; j++) {
    const left = axialLeftIndex(j)
    const right = axialRightIndex(j)
    couplings.push({ from: left, to: right, weight: COUPLING_INTRASEGMENTAL, phaseBias: Math.PI })
    couplings.push({ from: right, to: left, weight: COUPLING_INTRASEGMENTAL, phaseBias: Math.PI })
  }

  for (let j = 0; j < jointCount - 1; j++) {
    const headSide = [axialLeftIndex(j), axialRightIndex(j)]
    const tailSide = [axialLeftIndex(j + 1), axialRightIndex(j + 1)]
    for (let side = 0; side < 2; side++) {
      couplings.push({
        from: headSide[side],
        to: tailSide[side],
        weight: COUPLING_ROSTROCAUDAL,
        phaseBias: bias,
      })
      couplings.push({
        from: tailSide[side],
        to: headSide[side],
        weight: COUPLING_CAUDOROSTRAL,
        phaseBias: -bias,
      })
    }
  }

  return { oscillators, couplings, jointCount }
}

export function networkToPose(groups: BodyGroup[], bends: number[]): Pose {
  const chain = axialChain(groups)
  const pose: Pose = { root: { x: 0, z: 0, yawRad: 0 }, joints: {} }

  for (let j = 0; j < chain.length; j++) {
    pose.joints[chain[j].id] = { yawRad: bends[j] ?? 0, pitchRad: 0 }
  }

  for (const g of groups) {
    if (g.type !== 'leg-left' && g.type !== 'leg-right') continue
    pose.joints[g.id] = { yawRad: 0, pitchRad: 0 }
  }

  return pose
}
