import { BodySpec } from './body'
import { SolverDiagnostics, SolverState } from './types'

export const FIXED_SUBSTEP_SECONDS = 0.002
export const MAX_FRAME_SECONDS = 0.05

export const JOINT_DAMPING = 20
export const LIMIT_STOP_STIFFNESS = 8000
export const LIMIT_STOP_DAMPING = 150

export function initSolverState(spec: BodySpec): SolverState {
  return {
    rootX: 0,
    rootZ: 0,
    rootHeadingY: 0,
    rootVelX: 0,
    rootVelZ: 0,
    rootHeadingRateY: 0,
    jointAngles: spec.joints.map(() => 0),
    jointRates: spec.joints.map(() => 0),
  }
}

export function seedRootVelocity(state: SolverState, vx: number, vz: number): void {
  state.rootVelX += vx
  state.rootVelZ += vz
}

export function perturbJointRates(
  state: SolverState,
  spec: BodySpec,
  magnitude: number
): void {
  const n = state.jointRates.length
  if (n === 0) return
  for (let j = 0; j < n; j++) state.jointRates[j] = magnitude * (j % 2 === 0 ? 1 : -1)

  const q = stateToCoords(state)
  const M = buildMassMatrix(spec, q)
  const baseBlock = [
    [M[0][0], M[0][1], M[0][2]],
    [M[1][0], M[1][1], M[1][2]],
    [M[2][0], M[2][1], M[2][2]],
  ]
  const coupling = [0, 0, 0]
  for (let r = 0; r < 3; r++) {
    let sum = 0
    for (let j = 0; j < n; j++) sum += M[r][3 + j] * state.jointRates[j]
    coupling[r] = -sum
  }
  const baseRates = solveLinearSystem(baseBlock, coupling)
  state.rootVelX = baseRates[0]
  state.rootVelZ = baseRates[1]
  state.rootHeadingRateY = baseRates[2]
}

function stateToCoords(state: SolverState): number[] {
  return [state.rootX, state.rootZ, state.rootHeadingY, ...state.jointAngles]
}

function stateToRates(state: SolverState): number[] {
  return [state.rootVelX, state.rootVelZ, state.rootHeadingRateY, ...state.jointRates]
}

function writeCoordsRates(state: SolverState, q: number[], qd: number[]): void {
  state.rootX = q[0]
  state.rootZ = q[1]
  state.rootHeadingY = q[2]
  state.rootVelX = qd[0]
  state.rootVelZ = qd[1]
  state.rootHeadingRateY = qd[2]
  for (let j = 0; j < state.jointAngles.length; j++) {
    state.jointAngles[j] = q[3 + j]
    state.jointRates[j] = qd[3 + j]
  }
}

interface Kinematics {
  comX: number[]
  comZ: number[]
  jacLinX: number[][]
  jacLinZ: number[][]
  jacAng: number[][]
}

function computeKinematics(spec: BodySpec, q: number[]): Kinematics {
  const segs = spec.segments
  const n = segs.length
  const dof = 3 + spec.joints.length

  const cumulativeHeading: number[] = new Array(n)
  let heading = q[2]
  for (let i = 0; i < n; i++) {
    if (i > 0) heading += q[3 + (i - 1)]
    cumulativeHeading[i] = heading
  }

  const cosH: number[] = new Array(n)
  const sinH: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    cosH[i] = Math.cos(cumulativeHeading[i])
    sinH[i] = Math.sin(cumulativeHeading[i])
  }

  const linkX: number[] = new Array(n)
  const linkZ: number[] = new Array(n)
  for (let k = 0; k < n - 1; k++) {
    linkX[k] = segs[k + 1].restNodeX - segs[k].restNodeX
    linkZ[k] = segs[k + 1].restNodeZ - segs[k].restNodeZ
  }

  const comX: number[] = new Array(n)
  const comZ: number[] = new Array(n)
  const jacLinX: number[][] = []
  const jacLinZ: number[][] = []
  const jacAng: number[][] = []

  let originX = q[0]
  let originZ = q[1]
  for (let i = 0; i < n; i++) {
    const seg = segs[i]
    const relX = seg.restComX - seg.restNodeX
    const relZ = seg.restComZ - seg.restNodeZ
    const rotRelX = cosH[i] * relX - sinH[i] * relZ
    const rotRelZ = sinH[i] * relX + cosH[i] * relZ
    comX[i] = originX + rotRelX
    comZ[i] = originZ + rotRelZ

    const jvx = new Array(dof).fill(0)
    const jvz = new Array(dof).fill(0)
    const jw = new Array(dof).fill(0)

    jvx[0] = 1
    jvz[1] = 1

    let accX = rotRelX
    let accZ = rotRelZ
    for (let m = i; m >= 0; m--) {
      if (m < i) {
        const k = m
        accX += cosH[k] * linkX[k] - sinH[k] * linkZ[k]
        accZ += sinH[k] * linkX[k] + cosH[k] * linkZ[k]
      }
      const perpX = -accZ
      const perpZ = accX
      const coord = m === 0 ? 2 : 3 + (m - 1)
      jvx[coord] = perpX
      jvz[coord] = perpZ
    }

    jw[2] = 1
    for (let j = 0; j < i; j++) jw[3 + j] = 1

    jacLinX.push(jvx)
    jacLinZ.push(jvz)
    jacAng.push(jw)

    if (i < n - 1) {
      originX += cosH[i] * linkX[i] - sinH[i] * linkZ[i]
      originZ += sinH[i] * linkX[i] + cosH[i] * linkZ[i]
    }
  }

  return { comX, comZ, jacLinX, jacLinZ, jacAng }
}

function buildMassMatrix(spec: BodySpec, q: number[]): number[][] {
  const dof = 3 + spec.joints.length
  const kin = computeKinematics(spec, q)
  const M: number[][] = []
  for (let a = 0; a < dof; a++) M.push(new Array(dof).fill(0))

  for (let i = 0; i < spec.segments.length; i++) {
    const m = spec.segments[i].mass
    const inertia = spec.segments[i].inertiaAboutComY
    const jvx = kin.jacLinX[i]
    const jvz = kin.jacLinZ[i]
    const jw = kin.jacAng[i]
    for (let a = 0; a < dof; a++) {
      const va = m * jvx[a]
      const vza = m * jvz[a]
      const wa = inertia * jw[a]
      if (va === 0 && vza === 0 && wa === 0) continue
      for (let b = 0; b < dof; b++) {
        M[a][b] += va * jvx[b] + vza * jvz[b] + wa * jw[b]
      }
    }
  }
  return M
}

function massMatrixDerivatives(spec: BodySpec, q: number[]): (number[][] | null)[] {
  const dof = 3 + spec.joints.length
  const eps = 1e-5
  const derivs: (number[][] | null)[] = new Array(dof).fill(null)
  for (let c = 2; c < dof; c++) {
    const qPlus = q.slice()
    const qMinus = q.slice()
    qPlus[c] += eps
    qMinus[c] -= eps
    const mPlus = buildMassMatrix(spec, qPlus)
    const mMinus = buildMassMatrix(spec, qMinus)
    const d: number[][] = []
    for (let a = 0; a < dof; a++) {
      const row = new Array(dof)
      for (let b = 0; b < dof; b++) row[b] = (mPlus[a][b] - mMinus[a][b]) / (2 * eps)
      d.push(row)
    }
    derivs[c] = d
  }
  return derivs
}

function coriolisBias(
  spec: BodySpec,
  qd: number[],
  derivs: (number[][] | null)[]
): number[] {
  const dof = 3 + spec.joints.length
  const bias = new Array(dof).fill(0)
  for (let k = 0; k < dof; k++) {
    let term1 = 0
    for (let j = 0; j < dof; j++) {
      const dj = derivs[j]
      if (!dj) continue
      let rowDotRate = 0
      for (let i = 0; i < dof; i++) rowDotRate += dj[k][i] * qd[i]
      term1 += qd[j] * rowDotRate
    }
    let term2 = 0
    const dk = derivs[k]
    if (dk) {
      for (let i = 0; i < dof; i++) {
        for (let j = 0; j < dof; j++) term2 += dk[i][j] * qd[i] * qd[j]
      }
    }
    bias[k] = term1 - 0.5 * term2
  }
  return bias
}

function generalizedForces(spec: BodySpec, q: number[], qd: number[]): number[] {
  const dof = 3 + spec.joints.length
  const tau = new Array(dof).fill(0)
  for (const joint of spec.joints) {
    const c = joint.coordIndex
    const angle = q[c]
    const rate = qd[c]
    tau[c] -= JOINT_DAMPING * rate
    if (angle > joint.yawForwardLimit) {
      const over = angle - joint.yawForwardLimit
      tau[c] -= LIMIT_STOP_STIFFNESS * over + LIMIT_STOP_DAMPING * rate
    } else if (angle < -joint.yawBackwardLimit) {
      const under = angle + joint.yawBackwardLimit
      tau[c] -= LIMIT_STOP_STIFFNESS * under + LIMIT_STOP_DAMPING * rate
    }
  }
  return tau
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length
  const a: number[][] = matrix.map((row) => row.slice())
  const b = rhs.slice()
  for (let col = 0; col < n; col++) {
    let pivot = col
    let best = Math.abs(a[col][col])
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(a[r][col])
      if (v > best) {
        best = v
        pivot = r
      }
    }
    if (pivot !== col) {
      const tmp = a[pivot]
      a[pivot] = a[col]
      a[col] = tmp
      const tb = b[pivot]
      b[pivot] = b[col]
      b[col] = tb
    }
    const diag = a[col][col] || 1e-12
    for (let r = col + 1; r < n; r++) {
      const factor = a[r][col] / diag
      if (factor === 0) continue
      for (let c = col; c < n; c++) a[r][c] -= factor * a[col][c]
      b[r] -= factor * b[col]
    }
  }
  const x = new Array(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row]
    for (let c = row + 1; c < n; c++) sum -= a[row][c] * x[c]
    x[row] = sum / (a[row][row] || 1e-12)
  }
  return x
}

function integrateSubstep(spec: BodySpec, q: number[], qd: number[], h: number): void {
  const M = buildMassMatrix(spec, q)
  const derivs = massMatrixDerivatives(spec, q)
  const bias = coriolisBias(spec, qd, derivs)
  const tau = generalizedForces(spec, q, qd)
  const rhs = tau.map((t, i) => t - bias[i])
  const accel = solveLinearSystem(M, rhs)
  for (let i = 0; i < qd.length; i++) qd[i] += h * accel[i]
  for (let i = 0; i < q.length; i++) q[i] += h * qd[i]
}

export function stepSolver(state: SolverState, spec: BodySpec, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return
  const clamped = Math.min(dt, MAX_FRAME_SECONDS)
  const substeps = Math.max(1, Math.ceil(clamped / FIXED_SUBSTEP_SECONDS))
  const h = clamped / substeps
  const q = stateToCoords(state)
  const qd = stateToRates(state)
  for (let s = 0; s < substeps; s++) integrateSubstep(spec, q, qd, h)
  writeCoordsRates(state, q, qd)
}

export function nodePositions(state: SolverState, spec: BodySpec): { x: number; z: number }[] {
  const q = stateToCoords(state)
  const segs = spec.segments
  const n = segs.length
  const out: { x: number; z: number }[] = []
  let heading = q[2]
  let originX = q[0]
  let originZ = q[1]
  for (let i = 0; i < n; i++) {
    if (i > 0) heading += q[3 + (i - 1)]
    out.push({ x: originX, z: originZ })
    if (i < n - 1) {
      const linkX = segs[i + 1].restNodeX - segs[i].restNodeX
      const linkZ = segs[i + 1].restNodeZ - segs[i].restNodeZ
      const c = Math.cos(heading)
      const sn = Math.sin(heading)
      originX += c * linkX - sn * linkZ
      originZ += sn * linkX + c * linkZ
    }
  }
  return out
}

export function kineticEnergy(state: SolverState, spec: BodySpec): number {
  const q = stateToCoords(state)
  const qd = stateToRates(state)
  const M = buildMassMatrix(spec, q)
  let energy = 0
  for (let a = 0; a < qd.length; a++) {
    for (let b = 0; b < qd.length; b++) energy += M[a][b] * qd[a] * qd[b]
  }
  return 0.5 * energy
}

export function centerOfMass(state: SolverState, spec: BodySpec): { x: number; z: number } {
  const q = stateToCoords(state)
  const kin = computeKinematics(spec, q)
  let totalMass = 0
  let cx = 0
  let cz = 0
  for (let i = 0; i < spec.segments.length; i++) {
    const m = spec.segments[i].mass
    totalMass += m
    cx += m * kin.comX[i]
    cz += m * kin.comZ[i]
  }
  if (totalMass === 0) return { x: 0, z: 0 }
  return { x: cx / totalMass, z: cz / totalMass }
}

export function diagnostics(
  state: SolverState,
  spec: BodySpec,
  startCom: { x: number; z: number }
): SolverDiagnostics {
  const com = centerOfMass(state, spec)
  let maxJointFracOfCap = 0
  for (let i = 0; i < spec.joints.length; i++) {
    const angle = state.jointAngles[i]
    const cap = angle >= 0 ? spec.joints[i].yawForwardLimit : spec.joints[i].yawBackwardLimit
    const frac = cap > 1e-6 ? Math.abs(angle) / cap : 0
    if (frac > maxJointFracOfCap) maxJointFracOfCap = frac
  }
  return {
    kineticEnergy: kineticEnergy(state, spec),
    comX: com.x,
    comZ: com.z,
    comDriftFromStart: Math.hypot(com.x - startCom.x, com.z - startCom.z),
    maxJointFracOfCap,
  }
}
