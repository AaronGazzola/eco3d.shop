import { Body3D, jointAngle } from './body3d'
import { CpgSpec, CpgState, limbOutput, limbPhase, signedActivation } from './cpg'

const RAD_TO_DEG = 180 / Math.PI

function yawOf(q: { x: number; y: number; z: number; w: number }): number {
  return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z))
}

// rotate vector v by quaternion q → world offset
function rotateVec(
  q: { x: number; y: number; z: number; w: number },
  v: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  const tx = 2 * (q.y * v.z - q.z * v.y)
  const ty = 2 * (q.z * v.x - q.x * v.z)
  const tz = 2 * (q.x * v.y - q.y * v.x)
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  }
}

export interface CaptureSpecSegment {
  index: number
  groupId: string
  length: number
  mass: number
  inertia: number
}

export interface CaptureSpecJoint {
  index: number
  segmentIndex: number
  capForwardDeg: number
  capBackwardDeg: number
}

export interface CaptureSpec {
  segments: CaptureSpecSegment[]
  joints: CaptureSpecJoint[]
  restRootX: number
  restRootZ: number
}

export interface CaptureJointSample {
  rawDeg: number
  clampedDeg: number
  fracOfCap: number
  clamped: boolean
}

export interface CaptureSample {
  t: number
  rootX: number
  rootZ: number
  headingDeg: number
  rootVelX: number
  rootVelZ: number
  kineticEnergy: number
  comX: number
  comZ: number
  comDrift: number
  maxJointFracOfCap: number
  nan: boolean
  joints: CaptureJointSample[]
  nodes: { x: number; z: number }[]
  comY: number
  maxTiltDeg: number
  maxJointGap: number
}

export function buildCaptureSpec3D(body: Body3D): CaptureSpec {
  return {
    segments: body.bodies.map((b, i) => {
      const I = b.principalInertia()
      return {
        index: i,
        groupId: body.groupIds[i],
        length: body.segLength[i],
        mass: b.mass(),
        inertia: I.y,
      }
    }),
    joints: body.joints.map((j, i) => ({
      index: i,
      segmentIndex: j.childIndex,
      capForwardDeg: j.capForward * RAD_TO_DEG,
      capBackwardDeg: j.capBackward * RAD_TO_DEG,
    })),
    restRootX: 0,
    restRootZ: 0,
  }
}

// 3D body sampled top-down (x→right, z→down) so the existing serializers + swim gate work;
// comY carries the out-of-plane (vertical) drift.
export function buildSample3D(
  t: number,
  body: Body3D,
  baseCom: { x: number; y: number; z: number }
): CaptureSample {
  let mTot = 0, cx = 0, cy = 0, cz = 0, ke = 0
  let nan = false
  let maxTilt = 0
  const nodes: { x: number; z: number }[] = []
  for (const b of body.bodies) {
    const p = b.translation()
    const v = b.linvel()
    const m = b.mass()
    mTot += m
    cx += m * p.x; cy += m * p.y; cz += m * p.z
    ke += 0.5 * m * (v.x * v.x + v.y * v.y + v.z * v.z)
    nodes.push({ x: p.x, z: p.z })
    // tilt of this body off horizontal = angle between its up-axis ((0,1,0)·q) and world up
    const q = b.rotation()
    const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
    const tilt = Math.acos(Math.max(-1, Math.min(1, upY)))
    if (tilt > maxTilt) maxTilt = tilt
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) nan = true
  }
  if (mTot <= 0) mTot = 1
  cx /= mTot; cy /= mTot; cz /= mTot

  const joints: CaptureJointSample[] = []
  let maxFrac = 0
  for (const j of body.joints) {
    const raw = jointAngle(j, body.bodies)
    const cap = raw >= 0 ? j.capForward : j.capBackward
    const frac = cap > 1e-6 ? Math.abs(raw) / cap : 0
    if (frac > maxFrac) maxFrac = frac
    if (!Number.isFinite(raw)) nan = true
    joints.push({ rawDeg: raw * RAD_TO_DEG, clampedDeg: raw * RAD_TO_DEG, fracOfCap: frac, clamped: false })
  }

  // joint integrity: distance between each joint's two anchor points (≈0 if the skeleton is rigid)
  let maxJointGap = 0
  for (const j of body.joints) {
    const cp = body.bodies[j.parentIndex].translation()
    const qp = body.bodies[j.parentIndex].rotation()
    const cc = body.bodies[j.childIndex].translation()
    const qc = body.bodies[j.childIndex].rotation()
    const ap = rotateVec(qp, j.anchorParent)
    const ac = rotateVec(qc, j.anchorChild)
    const gx = cp.x + ap.x - (cc.x + ac.x)
    const gy = cp.y + ap.y - (cc.y + ac.y)
    const gz = cp.z + ap.z - (cc.z + ac.z)
    const gap = Math.hypot(gx, gy, gz)
    if (gap > maxJointGap) maxJointGap = gap
  }

  const head = body.bodies[0]
  const hp = head.translation()
  const hv = head.linvel()
  const hq = head.rotation()
  if (!Number.isFinite(ke)) nan = true

  return {
    t,
    rootX: hp.x,
    rootZ: hp.z,
    headingDeg: yawOf(hq) * RAD_TO_DEG,
    rootVelX: hv.x,
    rootVelZ: hv.z,
    kineticEnergy: ke,
    comX: cx,
    comZ: cz,
    comY: cy,
    comDrift: Math.hypot(cx - baseCom.x, cz - baseCom.z),
    maxJointFracOfCap: maxFrac,
    nan,
    joints,
    nodes,
    maxTiltDeg: maxTilt * RAD_TO_DEG,
    maxJointGap,
  }
}

export interface CpgCaptureSpec {
  n: number
  excitabilityE: number
  saturationDth: number
  bodyWaves: number
  segmentLengths: number[]
  limbs: number
  limbE: number[]
  limbDth: number
  kFore: number
  kHind: number
}

export interface CpgCaptureSample {
  t: number
  signedActivations: number[]
  phases: number[]
  limbPhases: number[]
  limbOutputs: number[]
}

export function buildCpgCaptureSpec(spec: CpgSpec, segmentLengths: number[]): CpgCaptureSpec {
  const limbE: number[] = []
  for (let i = 0; i < spec.limbs; i++) limbE.push(spec.e[2 * spec.n + i] ?? 0)
  const limbDth = spec.limbs > 0 ? spec.dTh[2 * spec.n] ?? 0 : 0
  return {
    n: spec.n,
    excitabilityE: spec.e[0] ?? 0,
    saturationDth: spec.dTh[0] ?? 0,
    bodyWaves: 1.58,
    segmentLengths: segmentLengths.slice(),
    limbs: spec.limbs,
    limbE,
    limbDth,
    kFore: spec.limbWiring?.kFore ?? -1,
    kHind: spec.limbWiring?.kHind ?? -1,
  }
}

export function buildCpgSample(t: number, state: CpgState, spec: CpgSpec): CpgCaptureSample {
  const signedActivations: number[] = []
  for (let k = 0; k < spec.n; k++) {
    signedActivations.push(signedActivation(state, spec, k))
  }
  const limbPhases: number[] = []
  const limbOutputs: number[] = []
  for (let i = 0; i < spec.limbs; i++) {
    limbPhases.push(limbPhase(state, spec, i))
    limbOutputs.push(limbOutput(state, spec, i))
  }
  return {
    t,
    signedActivations,
    phases: state.phases.slice(),
    limbPhases,
    limbOutputs,
  }
}

export function subsampleCpgSamples(samples: CpgCaptureSample[], max: number): CpgCaptureSample[] {
  if (samples.length <= max) return samples
  const out: CpgCaptureSample[] = []
  const step = (samples.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) out.push(samples[Math.round(i * step)])
  return out
}

export function subsampleSamples(samples: CaptureSample[], max: number): CaptureSample[] {
  if (samples.length <= max) return samples
  const out: CaptureSample[] = []
  const step = (samples.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) out.push(samples[Math.round(i * step)])
  return out
}

function f(n: number, d: number): string {
  if (!Number.isFinite(n)) return Number.isNaN(n) ? 'NaN' : n > 0 ? 'Inf' : '-Inf'
  return n.toFixed(d)
}

function e(n: number): string {
  if (!Number.isFinite(n)) return Number.isNaN(n) ? 'NaN' : n > 0 ? 'Inf' : '-Inf'
  return n.toExponential(2)
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length)
}

interface Bounds {
  ok: boolean
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

function asciiPlot(nodes: { x: number; z: number }[], bounds: Bounds, w: number, h: number): string[] {
  const finite = nodes.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.z))
  if (finite.length < 2 || !bounds.ok) return ['  (non-finite — body diverged)']
  const grid: string[][] = []
  for (let r = 0; r < h; r++) grid.push(new Array(w).fill(' '))
  const spanX = bounds.maxX - bounds.minX || 1
  const spanZ = bounds.maxZ - bounds.minZ || 1
  const toCol = (x: number) => Math.min(w - 1, Math.max(0, Math.round(((x - bounds.minX) / spanX) * (w - 1))))
  const toRow = (z: number) => Math.min(h - 1, Math.max(0, Math.round(((z - bounds.minZ) / spanZ) * (h - 1))))
  for (let i = 0; i < finite.length - 1; i++) {
    const c0 = toCol(finite[i].x)
    const r0 = toRow(finite[i].z)
    const c1 = toCol(finite[i + 1].x)
    const r1 = toRow(finite[i + 1].z)
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0), 1)
    for (let s = 0; s <= steps; s++) {
      const c = Math.round(c0 + ((c1 - c0) * s) / steps)
      const r = Math.round(r0 + ((r1 - r0) * s) / steps)
      if (grid[r][c] === ' ') grid[r][c] = '*'
    }
  }
  const head = finite[0]
  const tail = finite[finite.length - 1]
  grid[toRow(head.z)][toCol(head.x)] = 'H'
  grid[toRow(tail.z)][toCol(tail.x)] = 'T'
  return grid.map((row) => '  ' + row.join(''))
}

function globalBounds(samples: CaptureSample[]): Bounds {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const s of samples) {
    for (const p of s.nodes) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) continue
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.z < minZ) minZ = p.z
      if (p.z > maxZ) maxZ = p.z
    }
  }
  return { ok: minX <= maxX, minX, maxX, minZ, maxZ }
}

function evenIndices(length: number, count: number): number[] {
  if (length <= count) return Array.from({ length }, (_, i) => i)
  const out: number[] = []
  const step = (length - 1) / (count - 1)
  for (let i = 0; i < count; i++) out.push(Math.round(i * step))
  return out
}

export function serializeCapture(spec: CaptureSpec, samples: CaptureSample[]): string {
  const lines: string[] = []
  const duration = samples.length > 0 ? samples[samples.length - 1].t : 0
  const firstNaN = samples.find((s) => s.nan)
  let peakKE = -Infinity
  let peakKEt = 0
  let maxDrift = -Infinity
  let maxDriftT = 0
  let firstSat: { joint: number; t: number } | null = null
  for (const s of samples) {
    if (Number.isFinite(s.kineticEnergy) && s.kineticEnergy > peakKE) {
      peakKE = s.kineticEnergy
      peakKEt = s.t
    }
    if (Number.isFinite(s.comDrift) && s.comDrift > maxDrift) {
      maxDrift = s.comDrift
      maxDriftT = s.t
    }
    if (!firstSat) {
      for (let j = 0; j < s.joints.length; j++) {
        if (s.joints[j].fracOfCap >= 1) {
          firstSat = { joint: j, t: s.t }
          break
        }
      }
    }
  }
  const finalKE = samples.length > 0 ? samples[samples.length - 1].kineticEnergy : 0
  const baseY = samples.length > 0 ? samples[0].comY : 0
  let maxOutOfPlane = 0
  let maxJointGapOverall = 0
  for (const s of samples) {
    const d = Math.abs((s.comY ?? 0) - baseY)
    if (Number.isFinite(d) && d > maxOutOfPlane) maxOutOfPlane = d
    const g = s.maxJointGap ?? 0
    if (Number.isFinite(g) && g > maxJointGapOverall) maxJointGapOverall = g
  }

  lines.push('# Locomotion capture')
  lines.push(`generated: ${new Date().toISOString()}`)
  lines.push(
    `duration: ${f(duration, 2)}s   samples: ${samples.length}   segments: ${spec.segments.length}   joints: ${spec.joints.length}`
  )
  lines.push('')
  lines.push('## summary')
  lines.push(`blewUp: ${firstNaN ? 'YES' : 'no'}`)
  lines.push(`firstNaN: ${firstNaN ? `t=${f(firstNaN.t, 2)}s` : '-'}`)
  lines.push(`peakKE: ${e(peakKE)} @ t=${f(peakKEt, 2)}s`)
  lines.push(`finalKE: ${e(finalKE)}`)
  lines.push(`maxCOMdrift: ${e(maxDrift)} @ t=${f(maxDriftT, 2)}s`)
  lines.push(`outOfPlaneY (vertical drift): ${e(maxOutOfPlane)}`)
  lines.push(`maxJointGap (skeleton stretch — should be ~0): ${e(maxJointGapOverall)}`)
  lines.push(
    `firstJointToSaturate: ${firstSat ? `joint ${firstSat.joint} @ t=${f(firstSat.t, 2)}s` : 'none (stayed within caps)'}`
  )
  lines.push('')

  lines.push('## body spec')
  lines.push(`${pad('idx', 5)}${pad('group', 16)}${pad('len', 9)}${pad('mass', 11)}${pad('inertia', 11)}${pad('capF°', 8)}capB°`)
  for (const seg of spec.segments) {
    const j = spec.joints.find((jt) => jt.segmentIndex === seg.index)
    lines.push(
      pad(String(seg.index), 5) +
        pad(seg.groupId.slice(0, 14), 16) +
        pad(f(seg.length, 3), 9) +
        pad(e(seg.mass), 11) +
        pad(e(seg.inertia), 11) +
        pad(j ? f(j.capForwardDeg, 0) : '-', 8) +
        (j ? f(j.capBackwardDeg, 0) : '-')
    )
  }
  lines.push('')

  lines.push('## scalars (t,s ; head/vel in deg & world units ; comY/tilt°/gap = out-of-plane & skeleton)')
  lines.push(
    `${pad('t', 7)}${pad('rootX', 9)}${pad('rootZ', 9)}${pad('head°', 8)}${pad('KE', 11)}${pad('drift', 11)}${pad('maxJ%', 7)}${pad('comY', 9)}${pad('tilt°', 8)}gap`
  )
  const baseComY = samples.length > 0 ? samples[0].comY : 0
  for (const s of samples) {
    lines.push(
      pad(f(s.t, 2), 7) +
        pad(f(s.rootX, 3), 9) +
        pad(f(s.rootZ, 3), 9) +
        pad(f(s.headingDeg, 1), 8) +
        pad(e(s.kineticEnergy), 11) +
        pad(e(s.comDrift), 11) +
        pad(f(s.maxJointFracOfCap * 100, 0), 7) +
        pad(f(s.comY - baseComY, 3), 9) +
        pad(f(s.maxTiltDeg ?? 0, 1), 8) +
        f(s.maxJointGap ?? 0, 3)
    )
  }
  lines.push('')

  lines.push('## joints — raw angle in deg per sample (* = clamped to cap on render)')
  const jointHeader = [pad('t', 7)]
  for (let j = 0; j < spec.joints.length; j++) jointHeader.push(pad(`j${j}`, 7))
  lines.push(jointHeader.join(''))
  for (const s of samples) {
    const row = [pad(f(s.t, 2), 7)]
    for (const j of s.joints) {
      const cell = f(j.rawDeg, 0) + (j.clamped ? '*' : '')
      row.push(pad(cell, 7))
    }
    lines.push(row.join(''))
  }
  lines.push('')

  const bounds = globalBounds(samples)
  const shapeIdx = evenIndices(samples.length, Math.min(8, samples.length))
  lines.push('## shape — node XZ polyline (head→tail), world units')
  for (const i of shapeIdx) {
    const s = samples[i]
    const pts = s.nodes.map((p) => `(${f(p.x, 2)},${f(p.z, 2)})`).join(' ')
    lines.push(`t=${f(s.t, 2)}: ${pts}`)
  }
  lines.push('')

  const asciiIdx = evenIndices(samples.length, Math.min(3, samples.length))
  lines.push('## ascii top-down (x→right, z→down ; H=head T=tail ; shared scale)')
  lines.push(
    `  scale: x[${f(bounds.minX, 2)}..${f(bounds.maxX, 2)}] z[${f(bounds.minZ, 2)}..${f(bounds.maxZ, 2)}]`
  )
  for (const i of asciiIdx) {
    const s = samples[i]
    lines.push(`  --- t=${f(s.t, 2)}s ---`)
    for (const row of asciiPlot(s.nodes, bounds, 44, 16)) lines.push(row)
  }

  return lines.join('\n')
}

function signedGlyph(value: number, maxAbs: number): string {
  if (!Number.isFinite(value)) return '?'
  if (maxAbs <= 1e-9) return ' '
  const norm = Math.min(1, Math.abs(value) / maxAbs)
  if (norm < 0.08) return ' '
  const ramp = ' .:-=+*#'
  const idx = Math.min(ramp.length - 1, Math.floor(norm * (ramp.length - 1)))
  const ch = ramp[idx]
  if (ch === ' ') return ' '
  return value >= 0 ? ch : ch === '#' ? '@' : ch === '*' ? 'O' : ch === '+' ? 'o' : ch === '=' ? '~' : ch === '-' ? '_' : ch === ':' ? ',' : '.'
}

function measureFundamentalFrequency(samples: CpgCaptureSample[], segmentIndex: number): number {
  if (samples.length < 4) return 0
  const crossings: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].signedActivations[segmentIndex]
    const b = samples[i].signedActivations[segmentIndex]
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) {
      const t0 = samples[i - 1].t
      const t1 = samples[i].t
      const frac = a === b ? 0 : Math.abs(a) / (Math.abs(a) + Math.abs(b))
      crossings.push(t0 + frac * (t1 - t0))
    }
  }
  if (crossings.length < 3) return 0
  const intervals: number[] = []
  for (let i = 1; i < crossings.length; i++) intervals.push(crossings[i] - crossings[i - 1])
  intervals.sort((a, b) => a - b)
  const median = intervals[Math.floor(intervals.length / 2)]
  if (median <= 0) return 0
  return 1 / (2 * median)
}

export function serializeCpgCapture(
  spec: CpgCaptureSpec,
  samples: CpgCaptureSample[],
  drive: number,
  excitability: number
): string {
  const lines: string[] = []
  const duration = samples.length > 0 ? samples[samples.length - 1].t : 0

  let maxAbs = 0
  for (const s of samples) {
    for (const v of s.signedActivations) {
      if (Number.isFinite(v) && Math.abs(v) > maxAbs) maxAbs = Math.abs(v)
    }
  }

  const measuredFreq = measureFundamentalFrequency(samples, 0)
  const expectedFreq = drive * excitability * spec.excitabilityE

  lines.push('# CPG capture (Phase B1)')
  lines.push(`generated: ${new Date().toISOString()}`)
  lines.push(
    `duration: ${f(duration, 2)}s   samples: ${samples.length}   segments: ${spec.n}   drive: ${f(drive, 3)}   excitability: ${f(excitability, 3)}`
  )
  lines.push(
    `axial e: ${f(spec.excitabilityE, 3)}   d_th: ${f(spec.saturationDth, 2)}   BODY_WAVES: ${f(spec.bodyWaves, 3)}`
  )
  lines.push('')

  lines.push('## summary')
  lines.push(`maxAbsSignedActivation: ${e(maxAbs)}`)
  lines.push(`measuredFreqSeg0: ${f(measuredFreq, 3)} Hz`)
  lines.push(`expectedFreq (drive·exc·e): ${f(expectedFreq, 3)} Hz`)
  lines.push(`freqRatio (measured/expected): ${expectedFreq > 1e-9 ? f(measuredFreq / expectedFreq, 3) : '-'}`)
  lines.push('')

  lines.push('## space-time (rows = segments head→tail ; cols = time)')
  lines.push(`  glyph: signed activation, ramp ' .:-=+*#' positive / ',_~+o O@' negative ; scale: ±${e(maxAbs)}`)
  if (samples.length === 0 || spec.n === 0) {
    lines.push('  (no samples)')
  } else {
    const width = samples.length
    for (let k = 0; k < spec.n; k++) {
      const row: string[] = []
      for (let c = 0; c < width; c++) {
        row.push(signedGlyph(samples[c].signedActivations[k], maxAbs))
      }
      lines.push(`  s${pad(String(k), 3)}|${row.join('')}|`)
    }
    const tickRow: string[] = []
    for (let c = 0; c < width; c++) tickRow.push(c === 0 || c === width - 1 ? '|' : c % 10 === 0 ? '.' : ' ')
    lines.push(`      |${tickRow.join('')}|`)
    lines.push(`      t: 0 → ${f(duration, 2)}s`)
  }
  lines.push('')

  lines.push('## phases (final sample, radians ; left chain top, right chain bottom)')
  if (samples.length > 0) {
    const last = samples[samples.length - 1]
    const left: string[] = [pad('seg', 5)]
    const right: string[] = [pad('seg', 5)]
    for (let k = 0; k < spec.n; k++) left.push(pad(String(k), 8))
    for (let k = 0; k < spec.n; k++) right.push(pad(String(k), 8))
    lines.push(left.join(''))
    const leftVals: string[] = [pad('L', 5)]
    for (let k = 0; k < spec.n; k++) leftVals.push(pad(f(last.phases[k] ?? 0, 3), 8))
    lines.push(leftVals.join(''))
    const rightVals: string[] = [pad('R', 5)]
    for (let k = 0; k < spec.n; k++) rightVals.push(pad(f(last.phases[k + spec.n] ?? 0, 3), 8))
    lines.push(rightVals.join(''))

    const lagVals: string[] = [pad('lagL', 5)]
    for (let k = 0; k < spec.n; k++) {
      const d = (last.phases[k] ?? 0) - (last.phases[0] ?? 0)
      const wrapped = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      lagVals.push(pad(f(wrapped, 3), 8))
    }
    lines.push(lagVals.join(''))
  } else {
    lines.push('  (no samples)')
  }
  lines.push('')

  lines.push('## per-segment signed-activation max-abs over capture')
  const segMaxes: number[] = new Array(spec.n).fill(0)
  for (const s of samples) {
    for (let k = 0; k < spec.n; k++) {
      const v = Math.abs(s.signedActivations[k] ?? 0)
      if (Number.isFinite(v) && v > segMaxes[k]) segMaxes[k] = v
    }
  }
  const segHdr: string[] = [pad('seg', 5)]
  for (let k = 0; k < spec.n; k++) segHdr.push(pad(String(k), 9))
  lines.push(segHdr.join(''))
  const segVals: string[] = [pad('max', 5)]
  for (let k = 0; k < spec.n; k++) segVals.push(pad(e(segMaxes[k]), 9))
  lines.push(segVals.join(''))

  if (spec.limbs > 0) {
    lines.push('')
    lines.push('## limb rhythm (4 limbs: LF, RF, LH, RH ; phases in rad, outputs r·(1+cosφ))')
    lines.push(
      `limb e: fore=${f(spec.limbE[0] ?? 0, 3)}/${f(spec.limbE[1] ?? 0, 3)}  hind=${f(spec.limbE[2] ?? 0, 3)}/${f(spec.limbE[3] ?? 0, 3)}   d_th: ${f(spec.limbDth, 3)}   girdles: fore=axial[${spec.kFore}] hind=axial[${spec.kHind}]`
    )
    if (samples.length > 0) {
      const last = samples[samples.length - 1]
      const names = ['LF', 'RF', 'LH', 'RH']
      const hdr: string[] = [pad('', 8)]
      for (const nm of names) hdr.push(pad(nm, 10))
      lines.push(hdr.join(''))
      const phaseRow: string[] = [pad('phase', 8)]
      for (let i = 0; i < spec.limbs; i++) phaseRow.push(pad(f(last.limbPhases[i] ?? 0, 3), 10))
      lines.push(phaseRow.join(''))
      const outRow: string[] = [pad('out', 8)]
      for (let i = 0; i < spec.limbs; i++) outRow.push(pad(e(last.limbOutputs[i] ?? 0), 10))
      lines.push(outRow.join(''))

      const LF = 0, RF = 1, LH = 2, RH = 3
      const diff = (a: number, b: number): number => {
        const d = a - b
        const wrapped = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
        return wrapped
      }
      const dLF_RH = diff(last.limbPhases[LF] ?? 0, last.limbPhases[RH] ?? 0)
      const dRF_LH = diff(last.limbPhases[RF] ?? 0, last.limbPhases[LH] ?? 0)
      const dDiag = diff(last.limbPhases[LF] ?? 0, last.limbPhases[RF] ?? 0)
      const dHF_L = diff(last.limbPhases[LH] ?? 0, last.limbPhases[LF] ?? 0)
      const dHF_R = diff(last.limbPhases[RH] ?? 0, last.limbPhases[RF] ?? 0)
      lines.push('## diagonal-trot check (final sample — wrapped to [-π, π])')
      lines.push(`  LF-RH (should ≈ 0):    ${f(dLF_RH, 3)}`)
      lines.push(`  RF-LH (should ≈ 0):    ${f(dRF_LH, 3)}`)
      lines.push(`  LF-RF (should ≈ ±π):   ${f(dDiag, 3)}`)
      lines.push(`  LH-LF (hind leads fore, should ≈ ±π): ${f(dHF_L, 3)}`)
      lines.push(`  RH-RF (hind leads fore, should ≈ ±π): ${f(dHF_R, 3)}`)

      let maxLimbOut = 0
      for (const s of samples) {
        for (let i = 0; i < spec.limbs; i++) {
          const v = Math.abs(s.limbOutputs[i] ?? 0)
          if (Number.isFinite(v) && v > maxLimbOut) maxLimbOut = v
        }
      }
      lines.push(`  maxAbsLimbOutput over capture: ${e(maxLimbOut)} (≈ 0 means limbs saturated)`)
    }
  }

  return lines.join('\n')
}

export function serializeCoupledCapture(
  bodySpec: CaptureSpec,
  bodySamples: CaptureSample[],
  cpgSpec: CpgCaptureSpec,
  cpgSamples: CpgCaptureSample[],
  drive: number,
  excitability: number
): string {
  const header = `# Coupled CPG→muscle→body capture (Phase B3)\ngenerated: ${new Date().toISOString()}\ndrive: ${drive.toFixed(3)}   excitability: ${excitability.toFixed(3)}\n\n---\n`
  const body = serializeCapture(bodySpec, bodySamples)
  const cpg = serializeCpgCapture(cpgSpec, cpgSamples, drive, excitability)
  return header + body + '\n\n---\n\n' + cpg + '\n\n---\n\n' + serializeLimbTiming(cpgSpec, cpgSamples)
}

// Limb reach vs LOCAL girdle flex over time (D3 footfall phasing). For each CPG sample we show the
// girdle's signed bend (left_out − right_out at the girdle segment: + = flexing LEFT, − = RIGHT) next
// to each leg's phase, marking SWING ('S' = the leg reaching forward, last 23% of the cycle). This
// reads the real claim: "the RIGHT leg reaches forward while the hip flexes LEFT, and vice versa."
function serializeLimbTiming(spec: CpgCaptureSpec, cpgSamples: CpgCaptureSample[]): string {
  const lines: string[] = []
  lines.push('## limb reach vs girdle flex (timing)')
  if (cpgSamples.length === 0 || (cpgSamples[0].limbPhases?.length ?? 0) === 0 || spec.kFore < 0) {
    lines.push('  (no limb samples / no girdles)')
    return lines.join('\n')
  }
  lines.push('  flex = (left−right) activation at the girdle: L = flexing left (+), R = flexing right (−)')
  lines.push('  leg: phase°, S = swing = reaching forward. Want: flex L → RF/RH reach (S); flex R → LF/LH reach.')
  const TWO_PI = Math.PI * 2
  const swingStart = 0.77 * 360
  const cell = (phi: number): string => {
    const deg = (((phi % TWO_PI) + TWO_PI) % TWO_PI) * (180 / Math.PI)
    return `${pad(f(deg, 0), 4)}${deg >= swingStart ? 'S' : ' '}`
  }
  const flex = (v: number): string => `${v >= 0 ? 'L' : 'R'}${pad(f(Math.abs(v), 2), 5)}`
  lines.push(`${pad('t', 6)}  foreFlex  LF    RF   |  hindFlex  LH    RH`)
  const step = Math.max(1, Math.floor(cpgSamples.length / 80))
  for (let i = 0; i < cpgSamples.length; i += step) {
    const s = cpgSamples[i]
    const p = s.limbPhases
    const fore = s.signedActivations[spec.kFore] ?? 0
    const hind = s.signedActivations[spec.kHind] ?? 0
    lines.push(
      pad(f(s.t, 2), 6) + '  ' + pad(flex(fore), 8) + '  ' + cell(p[0] ?? 0) + ' ' + cell(p[1] ?? 0) +
      '  |  ' + pad(flex(hind), 8) + '  ' + cell(p[2] ?? 0) + ' ' + cell(p[3] ?? 0)
    )
  }
  return lines.join('\n')
}

