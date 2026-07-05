// Focused MECHANICAL spine-wave characterizer. Post-processes a node capture (no app changes, no
// perturbation) and describes what the body wave ACTUALLY is — measured from the real Rapier node
// lateral (Z) motion, NOT the commanded CPG signal.
//
//   node scripts/observe-coherence.mjs [nodes-<ts>.json] [--warmup S]   (defaults to newest capture, 3s warmup)
//
// The first seconds are a startup ramp (the body begins straight and the wave grows in), so by default
// the first `--warmup` seconds (3s) are dropped and the SETTLED limit-cycle wave is characterized.
//
// It answers, empirically:
//   • FREQUENCY  — the dominant oscillation frequency the body actually runs at (DFT peak), vs commanded.
//   • AMPLITUDE  — the lateral excursion per segment (the head→tail envelope; anguilliform grows to tail).
//   • SHAPE      — head→tail phase progression in cycles → STANDING vs TRAVELING, its direction,
//                  the wavelength (body-lengths + world units) and the wave speed vs forward COM speed (slip).
//   • COHERENCE  — spectral PURITY per segment: fraction of that segment's motion explained by ONE clean
//                  sinusoid at the dominant freq (fit R²). 1.0 = a pure clean wave; low = chopped/braked/noisy.
//   • STEADINESS — does the wave hold over time: dominant freq, progression and tail amplitude recomputed
//                  on the 1st vs 2nd half of the run. Big drift = the wave is not stationary.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'documentation/diagnostics/observe'
const argv = process.argv.slice(2)
const warmupI = argv.indexOf('--warmup')
const warmup = warmupI >= 0 ? Number(argv[warmupI + 1]) : 3
const arg = argv.find((a) => !a.startsWith('--') && a !== String(warmup))
const file = arg ?? readdirSync(DIR).filter((f) => /^nodes-.*\.json$/.test(f)).sort().pop()
if (!file) { console.log('no node capture found'); process.exit(1) }
const path = arg && arg.includes('/') ? arg : join(DIR, file)
const j = JSON.parse(readFileSync(path, 'utf8'))
const { config: c, spec, samples: allSamples } = j
const samples = allSamples.filter((s) => s.t - allSamples[0].t >= warmup)
if (!samples || samples.length < 12) { console.log('not enough samples after warmup'); process.exit(1) }

const nLegs = c.landLegsEnabled ? 4 : 0
const count = samples[0].nodes.length
const nAx = count - nLegs
const t0 = samples[0].t
const ts = samples.map((s) => s.t - t0)
const dur = ts[ts.length - 1]
const f3 = (x, n = 3) => Number(x).toFixed(n)

// mean-removed lateral (Z) signal per trunk segment
function zsig(idxSet) {
  const out = []
  for (let i = 0; i < nAx; i++) {
    const use = idxSet ? idxSet : samples.map((_, k) => k)
    const mean = use.reduce((a, k) => a + samples[k].nodes[i].z, 0) / use.length
    out.push(use.map((k) => samples[k].nodes[i].z - mean))
  }
  return out
}
const proj = (sig, times, w) => {
  let cc = 0, ss = 0
  for (let k = 0; k < sig.length; k++) { cc += sig[k] * Math.cos(w * times[k]); ss += sig[k] * Math.sin(w * times[k]) }
  return { c: cc, s: ss }
}
const commandedF = Math.abs((c.cpgDrive ?? 1) * (c.cpgExcitability ?? 0.5) * 1.1) || 0.5

// scan for the frequency maximising total power across segments over a chosen sample subset
function dominant(signals, times) {
  let best = { f: commandedF, power: -1 }
  for (let f = Math.max(0.1, commandedF * 0.4); f <= commandedF * 2.2 + 0.2; f += 0.005) {
    const w = 2 * Math.PI * f
    let tot = 0
    for (const sig of signals) { const p = proj(sig, times, w); tot += p.c * p.c + p.s * p.s }
    if (tot > best.power) best = { f, power: tot }
  }
  return best.f
}

// characterize a set of signals at their own dominant frequency
function characterize(idxSet) {
  const times = idxSet ? idxSet.map((k) => ts[k]) : ts
  const N = times.length
  const signals = zsig(idxSet)
  const f = dominant(signals, times)
  const w = 2 * Math.PI * f
  const seg = signals.map((sig, i) => {
    const { c: cc, s: ss } = proj(sig, times, w)
    const amp = 2 * Math.hypot(cc, ss) / N                 // sinusoid amplitude (world units)
    const variance = sig.reduce((a, v) => a + v * v, 0) / N
    const explained = (amp * amp) / 2                       // variance carried by that single sinusoid
    const purity = variance > 1e-9 ? Math.min(1, explained / variance) : 0
    const phase = Math.atan2(ss, cc) / (2 * Math.PI)
    return { i, amp, purity, phase }
  })
  // unwrap head→tail phase
  let prev = null, acc = 0
  for (const s of seg) {
    if (prev === null) { s.un = 0; prev = s.phase; continue }
    let d = s.phase - prev
    while (d > 0.5) d -= 1
    while (d < -0.5) d += 1
    acc += d; s.un = acc; prev = s.phase
  }
  const ampMax = Math.max(...seg.map((s) => s.amp), 1e-9)
  const active = seg.filter((s) => s.amp >= 0.25 * ampMax)
  const progression = active.length ? active[active.length - 1].un - active[0].un : 0
  const meanPurity = active.reduce((a, s) => a + s.purity, 0) / Math.max(1, active.length)
  return { f, seg, active, progression, meanPurity, ampMax }
}

const full = characterize(null)
const half = Math.floor(samples.length / 2)
const firstHalf = characterize(samples.map((_, k) => k).slice(0, half))
const secondHalf = characterize(samples.map((_, k) => k).slice(half))

// COM forward (X) speed for slip
const comX = (k) => samples[k].nodes.reduce((a, n) => a + n.x, 0) / count
const comSpeed = (comX(samples.length - 1) - comX(0)) / dur

// body length from spec.segLength (trunk segments) if available
const segLen = spec?.segLength ? spec.segLength.slice(0, nAx) : null
const bodyLen = segLen ? segLen.reduce((a, v) => a + v, 0) : null

const kind = (p) => Math.abs(p) < 0.2 ? 'STANDING' : Math.abs(p) < 0.6 ? 'MIXED' : 'TRAVELING'
const dir = full.progression > 0 ? 'head→tail' : 'tail→head'
const wavelengths = Math.abs(full.progression)              // cycles spanning the body = body-lengths / wavelength
const waveLenUnits = bodyLen && wavelengths > 1e-6 ? bodyLen / wavelengths : null
const waveSpeed = waveLenUnits != null ? full.f * waveLenUnits : null
// In undulatory swimming the wave travels backward along the body and drives the COM forward, so the
// two velocities point OPPOSITE ways by design. Slip compares magnitudes: what fraction of the wave's
// speed is NOT converted into forward travel (0% = perfect no-slip walking; high = swimming/skidding).
const opposing = waveSpeed != null && comSpeed * waveSpeed < 0
const slip = waveSpeed && Math.abs(waveSpeed) > 1e-6 ? 1 - Math.abs(comSpeed) / Math.abs(waveSpeed) : null

const headAmp = full.seg[0].amp, tailAmp = full.seg[nAx - 1].amp
const maxSeg = full.seg.reduce((a, s) => (s.amp > a.amp ? s : a), full.seg[0])

console.log(`file: ${file}`)
console.log(`config: drive=${c.cpgDrive} exc=${c.cpgExcitability} α=${c.muscleAlpha} β=${c.muscleBeta} legs=${c.landLegsEnabled} grip=${c.gripEnabled}  warmup=${f3(warmup, 0)}s  settled=${f3(dur, 1)}s  samples=${samples.length}  trunkNodes=${nAx}`)
console.log('\n== PER-SEGMENT (mechanical body wave, head→tail) ==')
console.log('seg   amp(Z)   phase   unwrapped   purity(R²)')
for (const s of full.seg) {
  const low = s.amp >= 0.25 * full.ampMax ? '' : '  (low)'
  console.log(`${String(s.i).padStart(3)}  ${f3(s.amp).padStart(6)}  ${f3(s.phase).padStart(6)}  ${f3(s.un).padStart(8)}   ${f3(s.purity).padStart(6)}${low}`)
}

console.log('\n== NATURE OF THE WAVE ==')
console.log(`FREQUENCY   measured ${f3(full.f)} Hz (period ${f3(1 / full.f, 2)}s)   |   commanded ν=${f3(commandedF)} Hz   (measured/commanded = ${f3(full.f / commandedF, 2)})`)
console.log(`AMPLITUDE   head ${f3(headAmp)} → tail ${f3(tailAmp)}  (tail/head ×${f3(tailAmp / Math.max(headAmp, 1e-6), 1)})   peak at seg ${maxSeg.i} = ${f3(maxSeg.amp)}`)
console.log(`SHAPE       ${f3(full.progression)} cycles head→tail  →  ${kind(full.progression)} WAVE, travelling ${dir}`)
if (waveLenUnits != null) console.log(`WAVELENGTH  ${f3(wavelengths, 2)} wave(s) span the body  →  λ ≈ ${f3(waveLenUnits, 2)} world-units (body ${f3(bodyLen, 2)})`)
if (waveSpeed != null) console.log(`SPEED       |wave| ${f3(Math.abs(waveSpeed))} u/s   |COM| ${f3(Math.abs(comSpeed))} u/s (${opposing ? 'opposing wave = thrust' : 'same dir = anomaly'})   →  slip ${slip != null ? f3(slip * 100, 0) + '%' : 'n/a'} (0% = no-slip walk, high = swim/skid)`)
console.log(`COHERENCE   mean spectral purity ${f3(full.meanPurity)} (1.0 = one clean sinusoid; low = chopped/braked/noisy)   active segs=${full.active.length}/${nAx}`)

console.log('\n== STEADINESS (1st half vs 2nd half of the run) ==')
console.log(`            freq        progression      tailAmp        purity`)
const row = (lbl, h) => `${lbl.padEnd(11)} ${f3(h.f).padStart(6)} Hz  ${f3(h.progression).padStart(6)} cyc   ${f3(h.seg[nAx - 1].amp).padStart(6)}   ${f3(h.meanPurity).padStart(6)}`
console.log(row('1st half', firstHalf))
console.log(row('2nd half', secondHalf))
const dFreq = Math.abs(secondHalf.f - firstHalf.f)
const dProg = Math.abs(secondHalf.progression - firstHalf.progression)
const dAmp = Math.abs(secondHalf.seg[nAx - 1].amp - firstHalf.seg[nAx - 1].amp) / Math.max(firstHalf.seg[nAx - 1].amp, 1e-6)
console.log(`drift       Δfreq ${f3(dFreq)} Hz   Δprogression ${f3(dProg)} cyc   ΔtailAmp ${f3(dAmp * 100, 0)}%   → ${dProg < 0.15 && dAmp < 0.2 ? 'STEADY' : 'NON-STATIONARY'}`)
