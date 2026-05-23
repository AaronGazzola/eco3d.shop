export type FootPhase = 'stance' | 'swing'

export interface FootState {
  phase: FootPhase
  plantedX: number
  plantedY: number
  plantedZ: number
  swingStartX: number
  swingStartZ: number
  swingTargetX: number
  swingTargetZ: number
  prevSinPhase: number
  restY: number
  currentX: number
  currentY: number
  currentZ: number
}

export const LIFT_HEIGHT = 0.5

export function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

export function makeFootState(initialX: number, initialZ: number, restY: number): FootState {
  return {
    phase: 'stance',
    plantedX: initialX,
    plantedY: restY,
    plantedZ: initialZ,
    swingStartX: initialX,
    swingStartZ: initialZ,
    swingTargetX: initialX,
    swingTargetZ: initialZ,
    prevSinPhase: 0,
    restY,
    currentX: initialX,
    currentY: restY,
    currentZ: initialZ,
  }
}

export function footWorldX(foot: FootState): number {
  return foot.currentX
}

export function footWorldY(foot: FootState): number {
  return foot.currentY
}

export function footWorldZ(foot: FootState): number {
  return foot.currentZ
}

export interface FootUpdateInput {
  limbPhase: number
  hipSocketWorldX: number
  hipSocketWorldZ: number
  hipWorldYaw: number
  restOffsetX: number
  restOffsetZ: number
  restY: number
  bodyForwardX: number
  bodyForwardZ: number
  strideForward: number
}

export function updateFootFromPhase(foot: FootState, input: FootUpdateInput): void {
  const sinPhase = Math.sin(input.limbPhase)
  const wasStance = foot.prevSinPhase >= 0
  const isStance = sinPhase >= 0

  foot.restY = input.restY

  if (wasStance && !isStance) {
    const c = Math.cos(input.hipWorldYaw)
    const s = Math.sin(input.hipWorldYaw)
    const rotatedOffsetX = input.restOffsetX * c + input.restOffsetZ * s
    const rotatedOffsetZ = -input.restOffsetX * s + input.restOffsetZ * c
    foot.swingStartX = foot.plantedX
    foot.swingStartZ = foot.plantedZ
    foot.swingTargetX =
      input.hipSocketWorldX + rotatedOffsetX + input.strideForward * input.bodyForwardX
    foot.swingTargetZ =
      input.hipSocketWorldZ + rotatedOffsetZ + input.strideForward * input.bodyForwardZ
    foot.phase = 'swing'
  } else if (!wasStance && isStance) {
    foot.plantedX = foot.swingTargetX
    foot.plantedZ = foot.swingTargetZ
    foot.plantedY = input.restY
    foot.phase = 'stance'
  } else {
    foot.phase = isStance ? 'stance' : 'swing'
  }

  foot.prevSinPhase = sinPhase

  if (foot.phase === 'stance') {
    foot.currentX = foot.plantedX
    foot.currentY = foot.plantedY
    foot.currentZ = foot.plantedZ
  } else {
    const twoPi = 2 * Math.PI
    let p = input.limbPhase % twoPi
    if (p < 0) p += twoPi
    const f = Math.max(0, Math.min(1, (p - Math.PI) / Math.PI))
    const eased = easeInOut(f)
    foot.currentX = foot.swingStartX + (foot.swingTargetX - foot.swingStartX) * eased
    foot.currentZ = foot.swingStartZ + (foot.swingTargetZ - foot.swingStartZ) * eased
    foot.currentY = input.restY + Math.sin(f * Math.PI) * LIFT_HEIGHT
  }
}
