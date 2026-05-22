import * as THREE from 'three'

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
  hipBackZ: number,
  parentMatrix: THREE.Matrix4,
  scratchVec: THREE.Vector3
): FootState {
  const offsetX = footX - hipBackX
  const offsetZ = footZ - hipBackZ
  scratchVec.set(offsetX, 0, offsetZ).applyMatrix4(parentMatrix)
  return {
    phase: 'planted',
    plantedX: scratchVec.x,
    plantedZ: scratchVec.z,
    swingStartX: scratchVec.x,
    swingStartZ: scratchVec.z,
    swingTargetX: scratchVec.x,
    swingTargetZ: scratchVec.z,
    swingT: 0,
    restOffsetX: offsetX,
    restOffsetZ: offsetZ,
    restY: footY,
  }
}

export function footTargetWorld(
  foot: FootState,
  yaw: number,
  parentMatrix: THREE.Matrix4,
  out: THREE.Vector3
): THREE.Vector3 {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  out.set(
    foot.restOffsetX * c + foot.restOffsetZ * s,
    0,
    -foot.restOffsetX * s + foot.restOffsetZ * c
  )
  return out.applyMatrix4(parentMatrix)
}

export function computeStrain(
  foot: FootState,
  wantedYaw: number,
  parentMatrix: THREE.Matrix4,
  scratchVec: THREE.Vector3
): number {
  footTargetWorld(foot, wantedYaw, parentMatrix, scratchVec)
  const dx = scratchVec.x - foot.plantedX
  const dz = scratchVec.z - foot.plantedZ
  return Math.sqrt(dx * dx + dz * dz)
}

export function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}
