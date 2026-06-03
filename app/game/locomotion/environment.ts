import { BodySpec } from './body'
import { computeKinematics } from './solver'

export const DRAG_NORMAL = 30
export const DRAG_TANGENT = 2.5
export const DRAG_ANGULAR = 1.5

export function computeEnvironmentTau(
  spec: BodySpec,
  q: number[],
  qd: number[]
): number[] {
  const dof = 3 + spec.joints.length
  const tau = new Array(dof).fill(0)
  const n = spec.segments.length
  if (n === 0) return tau

  const kin = computeKinematics(spec, q)

  for (let i = 0; i < n; i++) {
    const L = spec.segments[i].length
    if (L <= 0) continue

    const jvx = kin.jacLinX[i]
    const jvz = kin.jacLinZ[i]
    const jw = kin.jacAng[i]

    let vx = 0
    let vz = 0
    let omega = 0
    for (let c = 0; c < dof; c++) {
      vx += jvx[c] * qd[c]
      vz += jvz[c] * qd[c]
      omega += jw[c] * qd[c]
    }

    const theta = kin.cumulativeHeading[i]
    const tx = Math.cos(theta)
    const tz = Math.sin(theta)
    const vPar = vx * tx + vz * tz
    const vPerpX = vx - vPar * tx
    const vPerpZ = vz - vPar * tz

    const fx = -L * (DRAG_NORMAL * vPerpX + DRAG_TANGENT * vPar * tx)
    const fz = -L * (DRAG_NORMAL * vPerpZ + DRAG_TANGENT * vPar * tz)
    const tw = -L * DRAG_ANGULAR * omega

    for (let c = 0; c < dof; c++) {
      tau[c] += jvx[c] * fx + jvz[c] * fz + jw[c] * tw
    }
  }

  return tau
}
