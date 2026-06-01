import { BodySpec } from './body'
import { SolverState } from './types'
import { centerOfMass, kineticEnergy, nodePositions } from './solver'
import { CpgSpec, CpgState, signedActivation } from './cpg'

const RAD_TO_DEG = 180 / Math.PI

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
}

export function buildCaptureSpec(spec: BodySpec): CaptureSpec {
  return {
    segments: spec.segments.map((s, i) => ({
      index: i,
      groupId: s.groupId,
      length: s.length,
      mass: s.mass,
      inertia: s.inertiaAboutComY,
    })),
    joints: spec.joints.map((j, i) => ({
      index: i,
      segmentIndex: j.segmentIndex,
      capForwardDeg: j.yawForwardLimit * RAD_TO_DEG,
      capBackwardDeg: j.yawBackwardLimit * RAD_TO_DEG,
    })),
    restRootX: spec.restRootX,
    restRootZ: spec.restRootZ,
  }
}

export function buildSample(
  t: number,
  state: SolverState,
  spec: BodySpec,
  baseCom: { x: number; z: number }
): CaptureSample {
  const com = centerOfMass(state, spec)
  const nodes = nodePositions(state, spec)
  const joints: CaptureJointSample[] = []
  let maxFrac = 0
  let nan =
    !Number.isFinite(state.rootX) ||
    !Number.isFinite(state.rootZ) ||
    !Number.isFinite(state.rootHeadingY)

  for (let i = 0; i < spec.joints.length; i++) {
    const j = spec.joints[i]
    const raw = state.jointAngles[i]
    const capF = j.yawForwardLimit
    const capB = j.yawBackwardLimit
    const cap = raw >= 0 ? capF : capB
    const frac = cap > 1e-6 ? Math.abs(raw) / cap : 0
    if (frac > maxFrac) maxFrac = frac
    if (!Number.isFinite(raw)) nan = true
    joints.push({
      rawDeg: raw * RAD_TO_DEG,
      clampedDeg: raw * RAD_TO_DEG,
      fracOfCap: frac,
      clamped: false,
    })
  }

  const ke = kineticEnergy(state, spec)
  if (!Number.isFinite(ke)) nan = true

  return {
    t,
    rootX: state.rootX,
    rootZ: state.rootZ,
    headingDeg: state.rootHeadingY * RAD_TO_DEG,
    rootVelX: state.rootVelX,
    rootVelZ: state.rootVelZ,
    kineticEnergy: ke,
    comX: com.x,
    comZ: com.z,
    comDrift: Math.hypot(com.x - baseCom.x, com.z - baseCom.z),
    maxJointFracOfCap: maxFrac,
    nan,
    joints,
    nodes,
  }
}

export interface CpgCaptureSpec {
  n: number
  excitabilityE: number
  saturationDth: number
  bodyWaves: number
  segmentLengths: number[]
}

export interface CpgCaptureSample {
  t: number
  signedActivations: number[]
  phases: number[]
}

export function buildCpgCaptureSpec(spec: CpgSpec, bodySpec: BodySpec): CpgCaptureSpec {
  return {
    n: spec.n,
    excitabilityE: spec.e[0] ?? 0,
    saturationDth: spec.dTh[0] ?? 0,
    bodyWaves: 1.58,
    segmentLengths: bodySpec.segments.map((s) => s.length),
  }
}

export function buildCpgSample(t: number, state: CpgState, spec: CpgSpec): CpgCaptureSample {
  const signedActivations: number[] = []
  for (let k = 0; k < spec.n; k++) {
    signedActivations.push(signedActivation(state, spec, k))
  }
  return {
    t,
    signedActivations,
    phases: state.phases.slice(),
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

  lines.push('## scalars (t,s ; head/vel in deg & world units)')
  lines.push(
    `${pad('t', 7)}${pad('rootX', 9)}${pad('rootZ', 9)}${pad('head°', 8)}${pad('KE', 11)}${pad('drift', 11)}maxJ%`
  )
  for (const s of samples) {
    lines.push(
      pad(f(s.t, 2), 7) +
        pad(f(s.rootX, 3), 9) +
        pad(f(s.rootZ, 3), 9) +
        pad(f(s.headingDeg, 1), 8) +
        pad(e(s.kineticEnergy), 11) +
        pad(e(s.comDrift), 11) +
        f(s.maxJointFracOfCap * 100, 0)
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

  return lines.join('\n')
}

