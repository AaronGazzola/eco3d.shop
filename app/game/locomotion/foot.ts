export type FootPhase = 'planted' | 'stepping'

export interface FootState {
  phase: FootPhase
  plantedX: number
  plantedZ: number
  swingStartX: number
  swingStartZ: number
  swingTargetX: number
  swingTargetZ: number
  swingT: number
  restOffsetX: number
  restOffsetZ: number
  restY: number
}

export const DEFAULT_HIP_CAP = Math.PI / 6
export const STEP_DURATION = 0.35
export const LIFT_HEIGHT = 0.5
export const STRAIN_THRESHOLD = 0.2

export function makeFootState(
  footX: number,
  footY: number,
  footZ: number,
  hipBackX: number,
  hipBackZ: number
): FootState {
  return {
    phase: 'planted',
    plantedX: footX,
    plantedZ: footZ,
    swingStartX: footX,
    swingStartZ: footZ,
    swingTargetX: footX,
    swingTargetZ: footZ,
    swingT: 0,
    restOffsetX: footX - hipBackX,
    restOffsetZ: footZ - hipBackZ,
    restY: footY,
  }
}

export function footTargetAt(
  foot: FootState,
  hipBackX: number,
  hipBackZ: number,
  yaw: number
): { x: number; z: number } {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    x: hipBackX + foot.restOffsetX * c + foot.restOffsetZ * s,
    z: hipBackZ - foot.restOffsetX * s + foot.restOffsetZ * c,
  }
}

export function computeStrain(
  foot: FootState,
  hipBackX: number,
  hipBackZ: number,
  wantedYaw: number
): number {
  const target = footTargetAt(foot, hipBackX, hipBackZ, wantedYaw)
  const dx = target.x - foot.plantedX
  const dz = target.z - foot.plantedZ
  return Math.sqrt(dx * dx + dz * dz)
}

export function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}
