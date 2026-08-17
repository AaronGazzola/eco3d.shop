export interface RoamBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface RoamInput {
  com: { x: number; z: number }
  heading: { x: number; z: number }
  bounds: RoamBounds
  margin: number
  gain: number
  turnRate?: number
  damping?: number
}

// The turn rate, in radians per second, that a full bias produces. Measured, not assumed: a bias of 0.6
// was observed to turn about 7°/s. Used only to put the damping term on the same scale as the gain term,
// so `roamDamping` of 1 opposes a full-speed turn with a full-strength correction.
export const ROAM_REFERENCE_TURN_RATE = (7 * Math.PI) / 180

export const ROAM_MIN_HEADING = 1e-3

export function wrapAngle(a: number): number {
  let w = a
  while (w > Math.PI) w -= 2 * Math.PI
  while (w < -Math.PI) w += 2 * Math.PI
  return w
}

// How close the creature is to the nearest SIDE wall. The floor and ceiling are excluded on purpose: a
// grounded creature stands on the floor, so including it would read a permanent near-zero and hold the
// steering on for the whole run.
export function sideClearance(com: { x: number; z: number }, b: RoamBounds): number {
  return Math.min(com.x - b.minX, b.maxX - com.x, com.z - b.minZ, b.maxZ - com.z)
}

// The steering layer above the wave, and the whole of it: outside the margin the creature is left alone,
// inside it the creature turns toward the tank's centre in proportion to how far in it has come and how
// far off the centre it is pointing.
//
// The sign convention is not derived, it is MEASURED: a positive `turnBias` was observed to increase
// atan2(dz, dx), turning +0.3 into a net +145° over 40 s. So a positive heading error — centre to the
// left of where the creature is pointing, in that same sense — needs a positive bias, and the error can
// be used directly without reasoning about handedness.
//
// The error is divided by π so that pointing straight at a wall, the worst case, asks for the full gain
// rather than an arbitrary multiple of it.
export function roamBias(input: RoamInput): number {
  const { com, heading, bounds, margin, gain, turnRate = 0, damping = 0 } = input
  if (!(margin > 0) || !(gain > 0)) return 0
  const clearance = sideClearance(com, bounds)
  if (clearance >= margin) return 0
  const speed = Math.hypot(heading.x, heading.z)
  if (speed < ROAM_MIN_HEADING) return 0
  const centreX = (bounds.minX + bounds.maxX) / 2
  const centreZ = (bounds.minZ + bounds.maxZ) / 2
  const toCentre = Math.atan2(centreZ - com.z, centreX - com.x)
  const facing = Math.atan2(heading.z, heading.x)
  const error = wrapAngle(toCentre - facing)
  const urgency = Math.min(1, (margin - clearance) / margin)
  // The steer, and then the brake on the steer. Without the second term the creature turns until it is
  // pointing at the centre, arrives there still turning, and carries straight on past — so it circles
  // instead of settling, and the harder the gain the tighter the circle. Opposing the turn in proportion
  // to how fast it is already turning is what stops the overshoot, and it is what lets the gain be large
  // enough to start the turn early without the turn locking hard over.
  const steer = gain * urgency * (error / Math.PI)
  const brake = damping * (turnRate / ROAM_REFERENCE_TURN_RATE)
  return Math.max(-1, Math.min(1, steer - brake))
}
