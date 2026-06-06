import { Vector3, Quaternion } from 'three'
import { Body3D } from './body3d'

export const DRAG_NORMAL = 0.6
export const DRAG_TANGENT = 0.05
export const DRAG_ANGULAR = 0.03

const fwd = new Vector3()
const q = new Quaternion()
const v = new Vector3()
const par = new Vector3()
const perp = new Vector3()

// 3D anisotropic resistive drag applied as semi-implicit (exponential) velocity damping.
// Per segment we split the velocity into along-/across-the-body components and shrink each by
// exp(−C·L·dt/m). This is unconditionally stable and strictly dissipative for any coefficient —
// unlike an explicit force, which forward-Euler integration overshoots and pumps energy in at
// high C_n. Anisotropy (C_n ≫ C_t) is preserved, so undulation still produces forward thrust.
// Call each substep AFTER world.step().
export function applyEnvironment3D(body: Body3D, dt: number): void {
  for (let i = 0; i < body.bodies.length; i++) {
    const b = body.bodies[i]
    const L = body.segLength[i]
    const m = b.mass()
    const lv = b.linvel()
    const r = b.rotation()
    q.set(r.x, r.y, r.z, r.w)
    fwd.set(1, 0, 0).applyQuaternion(q) // segment long axis (forward) in world
    v.set(lv.x, lv.y, lv.z)
    const vPar = v.dot(fwd)
    par.copy(fwd).multiplyScalar(vPar)
    perp.copy(v).sub(par)
    const kPar = Math.exp((-DRAG_TANGENT * L * dt) / m)
    const kPerp = Math.exp((-DRAG_NORMAL * L * dt) / m)
    par.multiplyScalar(kPar)
    perp.multiplyScalar(kPerp)
    b.setLinvel({ x: par.x + perp.x, y: par.y + perp.y, z: par.z + perp.z }, true)

    const I = b.principalInertia()
    const w = b.angvel()
    const kx = Math.exp((-DRAG_ANGULAR * L * dt) / Math.max(I.x, 1e-4))
    const ky = Math.exp((-DRAG_ANGULAR * L * dt) / Math.max(I.y, 1e-4))
    const kz = Math.exp((-DRAG_ANGULAR * L * dt) / Math.max(I.z, 1e-4))
    b.setAngvel({ x: w.x * kx, y: w.y * ky, z: w.z * kz }, true)
  }
}
