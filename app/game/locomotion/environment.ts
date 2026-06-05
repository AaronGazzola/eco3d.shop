import { Vector3, Quaternion } from 'three'
import { Body3D } from './body3d'

export const DRAG_NORMAL = 0.6
export const DRAG_TANGENT = 0.05
export const DRAG_ANGULAR = 0.03

const fwd = new Vector3()
const q = new Quaternion()

// 3D anisotropic resistive drag applied as external forces on the Rapier bodies.
// F = −L·(C_n·v_⊥ + C_t·v_∥),  τ = −L·C_ω·ω, per segment. Call each substep before world.step().
export function applyEnvironment3D(body: Body3D): void {
  for (let i = 0; i < body.bodies.length; i++) {
    const b = body.bodies[i]
    const L = body.segLength[i]
    const v = b.linvel()
    const r = b.rotation()
    q.set(r.x, r.y, r.z, r.w)
    fwd.set(1, 0, 0).applyQuaternion(q) // segment long axis (forward) in world
    const vPar = v.x * fwd.x + v.y * fwd.y + v.z * fwd.z
    const fx = -L * (DRAG_NORMAL * (v.x - vPar * fwd.x) + DRAG_TANGENT * vPar * fwd.x)
    const fy = -L * (DRAG_NORMAL * (v.y - vPar * fwd.y) + DRAG_TANGENT * vPar * fwd.y)
    const fz = -L * (DRAG_NORMAL * (v.z - vPar * fwd.z) + DRAG_TANGENT * vPar * fwd.z)
    b.addForce({ x: fx, y: fy, z: fz }, true)
    const w = b.angvel()
    b.addTorque(
      { x: -L * DRAG_ANGULAR * w.x, y: -L * DRAG_ANGULAR * w.y, z: -L * DRAG_ANGULAR * w.z },
      true
    )
  }
}
