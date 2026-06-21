// Classify the axial body wave as STANDING vs TRAVELING from a captured node run, purely by
// post-processing the lateral (Z) oscillation of each trunk segment — no app changes.
//
//   node scripts/observe-wave.mjs [nodes-<ts>.json]   (defaults to the most recent capture)
//
// Method: estimate the dominant oscillation frequency by a coarse DFT scan over the trunk segments'
// Z signals, then project each segment onto that frequency to get its phase + amplitude. The head→tail
// progression of phase is the diagnostic:
//   • TRAVELING wave  → phase advances monotonically head→tail (swim ≈ 1.58 cycles total, amp grows to tail)
//   • STANDING wave   → phase ~flat with π steps at nodes, total head→tail progression ≈ 0
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'documentation/diagnostics/observe'
const arg = process.argv[2]
const file = arg ?? readdirSync(DIR).filter((f) => /^nodes-.*\.json$/.test(f)).sort().pop()
if (!file) { console.log('no node capture found'); process.exit(1) }
const path = arg && arg.includes('/') ? arg : join(DIR, file)
const j = JSON.parse(readFileSync(path, 'utf8'))
const { config: c, samples } = j
if (!samples || samples.length < 8) { console.log('not enough samples'); process.exit(1) }

const count = samples[0].nodes.length
const nLegs = c.landLegsEnabled ? 4 : 0
const nAx = count - nLegs // trunk/axial nodes are the first (count - 4) when legs are built
const t0 = samples[0].t
const ts = samples.map((s) => s.t - t0)
const dur = ts[ts.length - 1]

// Build a per-segment, mean-removed signal set. `which` selects MECHANICAL (node lateral Z) or NEURAL
// (per-segment CPG activity, samples[].cpg) — the paper's Fig 6 wave classification is on the NEURAL
// signal, which omits the EMG-to-curvature mechanical delay present in the body shape.
function buildSignals(which) {
  if (which === 'cpg') {
    if (!samples[0].cpg) return null
    const nC = samples[0].cpg.length
    const out = []
    for (let i = 0; i < nC; i++) {
      const mean = samples.reduce((a, s) => a + s.cpg[i], 0) / samples.length
      out.push(samples.map((s) => s.cpg[i] - mean))
    }
    return out
  }
  const out = []
  for (let i = 0; i < nAx; i++) {
    const mean = samples.reduce((a, s) => a + s.nodes[i].z, 0) / samples.length
    out.push(samples.map((s) => s.nodes[i].z - mean))
  }
  return out
}
const TWO_PI = Math.PI * 2
const f3 = (x, n = 3) => Number(x).toFixed(n)
const proj = (sig, w) => {
  let cc = 0, ss = 0
  for (let k = 0; k < sig.length; k++) { cc += sig[k] * Math.cos(w * ts[k]); ss += sig[k] * Math.sin(w * ts[k]) }
  return { c: cc, s: ss, power: cc * cc + ss * ss }
}
const fGuess = Math.abs((c.cpgDrive ?? 1) * (c.cpgExcitability ?? 0.5) * 1.1) || 0.5

function analyze(signals, label, verbose) {
  if (!signals) return null
  // DFT scan for the frequency maximising total power across segments
  let best = { f: fGuess, power: -1 }
  for (let f = Math.max(0.1, fGuess * 0.4); f <= fGuess * 2.2 + 0.2; f += 0.01) {
    const w = 2 * Math.PI * f
    let tot = 0
    for (const sig of signals) tot += proj(sig, w).power
    if (tot > best.power) best = { f, power: tot }
  }
  const w = 2 * Math.PI * best.f
  const seg = signals.map((sig, i) => {
    const p = proj(sig, w)
    return { i, phase: Math.atan2(p.s, p.c) / TWO_PI, amp: Math.hypot(p.c, p.s) / samples.length }
  })
  const ampMax = Math.max(...seg.map((s) => s.amp), 1e-9)
  let prev = null, acc = 0
  for (const s of seg) {
    if (prev === null) { s.un = 0; prev = s.phase; continue }
    let d = s.phase - prev
    while (d > 0.5) d -= 1
    while (d < -0.5) d += 1
    acc += d; s.un = acc; prev = s.phase
  }
  const active = seg.filter((s) => s.amp >= 0.25 * ampMax)
  const span = active.length ? active[active.length - 1].un - active[0].un : 0
  const kind = Math.abs(span) < 0.2 ? 'STANDING' : Math.abs(span) < 0.6 ? 'mixed' : 'TRAVELING'
  console.log(`\n[${label}] dominant freq ≈ ${f3(best.f)} Hz   segments=${signals.length}`)
  if (verbose) {
    console.log('seg  phase  unwrapped  amp')
    for (const s of seg) console.log(`${String(s.i).padStart(3)}  ${f3(s.phase).padStart(6)}  ${f3(s.un).padStart(8)}  ${f3(s.amp).padStart(6)}${s.amp >= 0.25 * ampMax ? '' : '   (low)'}`)
  }
  console.log(`[${label}] head→tail phase progression (active segs) = ${f3(span)} cycles  →  ${kind} WAVE`)
  return { span, kind }
}

const verbose = process.argv.includes('-v')
console.log(`file: ${file}`)
console.log(`config: drive=${c.cpgDrive} limbDrive=${c.limbDrive ?? 0} exc=${c.cpgExcitability} legs=${c.landLegsEnabled} limbCPG=${c.limbCpgEnabled} α=${c.muscleAlpha} β=${c.muscleBeta}   dur=${f3(dur, 1)}s`)
analyze(buildSignals('cpg'), 'NEURAL (CPG activity — paper Fig 6)', verbose)
analyze(buildSignals('mech'), 'MECHANICAL (body shape)', verbose)
console.log('\n(swim traveling wave ≈ 1.58 cycles; standing wave ≈ 0; NEURAL is the paper\'s classification)')
