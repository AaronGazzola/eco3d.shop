// Leg-vibration analyzer for the walk ramp. Reads a node-capture JSON and reports, per node, how
// "jittery" its motion is — high-frequency back-and-forth that reads as the leg motor buzzing.
//
// Two metrics per node, on the lateral (Z) and vertical (Y) axes (the axes a swinging/buzzing leg moves on):
//   reversals/s  : how often the velocity flips sign per second. A smooth sweep flips ~twice per gait
//                  cycle (~1-2/s). Buzz flips many times/s (>8 is vibration).
//   rmsAccel     : RMS of the discrete second difference (|Δ²pos|) — the "shake" energy. Smooth = small.
//
// The 4 LEG nodes are the last 4 bodies (the axial chain is built first, legs appended). Reported
// separately as the leg mean/max, which is what we gate the ramp on.
//
//   node scripts/observe-jitter.mjs [path-to-nodes-*.json]   (defaults to newest capture)

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'documentation/diagnostics/observe'
const arg = process.argv[2]
const path = arg ?? newest()
function newest() {
  const files = readdirSync(DIR).filter((f) => f.startsWith('nodes-') && f.endsWith('.json'))
  if (!files.length) throw new Error(`no node captures in ${DIR}`)
  files.sort()
  return join(DIR, files[files.length - 1])
}

const data = JSON.parse(readFileSync(path, 'utf8'))
const samples = data.samples ?? []
if (samples.length < 4) throw new Error(`capture has too few samples (${samples.length})`)
const count = data.spec?.count ?? samples[0].nodes.length
const groupIds = data.spec?.groupIds ?? samples.map((_, i) => `node${i}`)
const dur = samples[samples.length - 1].t - samples[0].t

function axisStats(nodeIdx, axis) {
  const p = samples.map((s) => s.nodes[nodeIdx][axis])
  const n = p.length
  // velocity sign-reversal count (ignore near-zero velocity to avoid counting noise around rest)
  const vel = []
  for (let i = 1; i < n; i++) vel.push(p[i] - p[i - 1])
  const vmax = Math.max(1e-9, ...vel.map(Math.abs))
  let reversals = 0
  let prevSign = 0
  for (const v of vel) {
    if (Math.abs(v) < 0.02 * vmax) continue // deadband: ignore jitter while essentially still
    const sign = Math.sign(v)
    if (prevSign !== 0 && sign !== prevSign) reversals++
    prevSign = sign
  }
  // RMS of second difference
  let acc2 = 0, m = 0
  for (let i = 2; i < n; i++) { const a = p[i] - 2 * p[i - 1] + p[i - 2]; acc2 += a * a; m++ }
  return { reversalsPerSec: reversals / Math.max(dur, 1e-6), rmsAccel: Math.sqrt(acc2 / Math.max(m, 1)) }
}

const rows = []
for (let i = 0; i < count; i++) {
  const z = axisStats(i, 'z')
  const y = axisStats(i, 'y')
  rows.push({
    i,
    gid: (groupIds[i] ?? `node${i}`).slice(0, 24),
    revZ: z.reversalsPerSec, revY: y.reversalsPerSec,
    accZ: z.rmsAccel, accY: y.rmsAccel,
  })
}

const legIdx = [count - 4, count - 3, count - 2, count - 1]
const f = (x, d = 2) => Number(x).toFixed(d)
console.log(`file: ${path}`)
console.log(`samples=${samples.length}  dur=${f(dur)}s  nodes=${count}  (legs assumed = last 4: ${legIdx.join(',')})`)
console.log('idx  groupId                    rev/s(Z)  rev/s(Y)   rmsAcc(Z)  rmsAcc(Y)')
for (const r of rows) {
  const leg = legIdx.includes(r.i) ? ' *LEG' : ''
  console.log(`${String(r.i).padStart(3)}  ${r.gid.padEnd(24)}  ${f(r.revZ).padStart(7)}  ${f(r.revY).padStart(7)}   ${f(r.accZ, 4).padStart(8)}  ${f(r.accY, 4).padStart(8)}${leg}`)
}
const legRows = rows.filter((r) => legIdx.includes(r.i))
const legMaxRev = Math.max(...legRows.flatMap((r) => [r.revZ, r.revY]))
const legMeanRev = legRows.reduce((s, r) => s + (r.revZ + r.revY) / 2, 0) / legRows.length
const legMaxAcc = Math.max(...legRows.flatMap((r) => [r.accZ, r.accY]))
console.log('')
console.log(`LEG SUMMARY: maxRev/s=${f(legMaxRev)}  meanRev/s=${f(legMeanRev)}  maxRmsAccel=${f(legMaxAcc, 4)}`)
console.log(`verdict: ${legMaxRev > 8 ? 'VIBRATING (buzz)' : legMaxRev > 4 ? 'borderline' : 'smooth'}`)
