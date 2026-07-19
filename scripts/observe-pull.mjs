// Per-leg MECHANISM analyzer: does each leg (1) reach forward, (2) grab/pin, (3) pull the body forward?
// Post-processes a node capture WITH events (run observe.mjs with --events). No app changes.
//
//   node scripts/observe-pull.mjs [nodes-<ts>.json]   (defaults to newest capture)
//
// Axes: X = forward, Y = vertical, Z = lateral. Trunk nodes = 0..count-5; the last 4 nodes are the feet
// (FL, FR, BL, BR in limb order). COM = mean of trunk nodes. For each leg the script uses the grip ON
// intervals from the capture's events and measures, per grip window:
//   • foot ΔX during grip  → should be ~0 if the foot is truly PINNED (grab works)
//   • COM  ΔX during grip   → forward body travel WHILE that foot is planted (the PULL)
//   • COM  ΔX during recovery (grip-end → next grip-start) → travel while the foot is NOT planted
// A leg that grabs+pulls shows a pinned foot and net-forward COM during grip; a leg that fights shows
// backward COM during grip or a sliding (non-pinned) foot.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'documentation/diagnostics/observe'
const arg = process.argv[2]
const file = arg ?? readdirSync(DIR).filter((f) => /^nodes-.*\.json$/.test(f)).sort().pop()
if (!file) { console.log('no node capture found'); process.exit(1) }
const path = arg && arg.includes('/') ? arg : join(DIR, file)
const j = JSON.parse(readFileSync(path, 'utf8'))
const { spec, samples, events } = j
if (!events || !events.length) { console.log('capture has no events — re-run observe.mjs with --events'); process.exit(1) }

const count = spec.count
const nLegs = 4
const nAx = count - nLegs
const footIdx = { FL: nAx + 0, FR: nAx + 1, BL: nAx + 2, BR: nAx + 3 }
const t0 = samples[0].t
const f3 = (x, n = 3) => Number(x).toFixed(n)

const com = (s) => { let x = 0, z = 0; for (let i = 0; i < nAx; i++) { x += s.nodes[i].x; z += s.nodes[i].z } return { x: x / nAx, z: z / nAx } }
// linear interpolation of a node/COM quantity at time t
const at = (t, pick) => {
  let lo = 0, hi = samples.length - 1
  if (t <= samples[0].t) return pick(samples[0])
  if (t >= samples[hi].t) return pick(samples[hi])
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (samples[m].t < t) lo = m; else hi = m }
  const a = samples[lo], b = samples[hi]
  const u = (t - a.t) / (b.t - a.t)
  const pa = pick(a), pb = pick(b)
  return pa + u * (pb - pa)
}

const gripIntervals = (leg) => {
  const seq = events.filter((e) => e.leg === leg && e.primitive === 'grip')
  const out = []; let open = null
  for (const e of seq) { if (e.edge === 'start') open = e.t; else if (e.edge === 'end' && open != null) { out.push([open, e.t]); open = null } }
  return out
}

const legs = [...new Set(events.map((e) => e.leg))]
const cfg = j.config
console.log(`file: ${file}`)
console.log(`config: drive=${cfg.cpgDrive} α=${cfg.muscleAlpha} gripShift=${cfg.gripShift} gripDur=${cfg.gripDuration} sweep=${cfg.sweepAmount} gripFeet=${JSON.stringify(cfg.gripFeet)}`)
console.log('')
console.log('leg  grips  footΔX/grip(pin≈0)  COMΔX/grip(PULL)  COMΔX/recovery   netPerCycle   verdict')

for (const leg of legs) {
  const iv = gripIntervals(leg)
  if (!iv.length) { console.log(`${leg.padEnd(4)} (no complete grip interval)`); continue }
  const fi = footIdx[leg]
  let footD = 0, comGrip = 0, comRec = 0, nRec = 0
  for (let k = 0; k < iv.length; k++) {
    const [gs, ge] = iv[k]
    footD += at(ge, (s) => s.nodes[fi].x) - at(gs, (s) => s.nodes[fi].x)
    comGrip += at(ge, (s) => com(s).x) - at(gs, (s) => com(s).x)
    if (k + 1 < iv.length) { const ns = iv[k + 1][0]; comRec += at(ns, (s) => com(s).x) - at(ge, (s) => com(s).x); nRec++ }
  }
  const nG = iv.length
  const footMean = footD / nG, comGripMean = comGrip / nG, comRecMean = nRec ? comRec / nRec : 0
  const netPerCycle = comGripMean + comRecMean
  const pinned = Math.abs(footMean) < 0.15
  const pulls = comGripMean > 0.02
  const verdict = pulls && pinned ? 'GRAB+PULL ok' : !pinned ? 'FOOT SLIDES' : comGripMean < -0.02 ? 'PUSHES BACK' : 'weak'
  console.log(`${leg.padEnd(4)} ${String(nG).padStart(4)}   ${f3(footMean).padStart(14)}   ${f3(comGripMean).padStart(14)}   ${f3(comRecMean).padStart(12)}   ${f3(netPerCycle).padStart(11)}   ${verdict}`)
}
console.log('')
console.log('Reading: footΔX≈0 = foot truly pinned (grab). COMΔX/grip>0 = body pulled forward while planted (pull).')
console.log('COMΔX/recovery<0 (small) = some giveback while unplanted. netPerCycle>0 = that leg nets forward travel.')
