// Roadmap §6 metric 1 — foot stillness during the CPG-clocked plant window.
//
//   node scripts/observe-plant.mjs docs/diagnostics/observe/nodes-<ts>.json [more.json ...]
//
// The window runs from each foot's max-forward reach to its max-backward reach, taken from that leg's
// girdle-clock phase with SEPARATE front and hind shifts (footThrustShift / footThrustShiftHind). The
// window is never derived from body motion: at any given girdle phase the front feet sit at max forward
// while the hind sit at max backward, and a shared shift silently scores the swing instead of the stance.
//
// Reported per foot: world distance travelled during the window, and that distance as a percentage of
// how far the body advanced over the same window. 0% is planted, 100% means the foot simply rode along.

import { readFileSync } from 'node:fs'

const FILES = process.argv.slice(2)
if (FILES.length === 0) throw new Error('usage: node scripts/observe-plant.mjs <nodes-*.json> [...]')

const wrap01 = (v) => ((v % 1) + 1) % 1

function score(file) {
  const j = JSON.parse(readFileSync(file, 'utf8'))
  const samples = j.samples ?? []
  if (!samples.length || !samples[0].legs) {
    throw new Error(`${file} carries no per-leg samples — recapture with a build that records them`)
  }
  const cfg = j.config ?? {}
  const shiftF = cfg.footThrustShift ?? 0.36
  const shiftH = cfg.footThrustShiftHind ?? 0.86
  const nLegs = samples[0].legs.length

  // Body reference = the mean of the trunk nodes, so a single waving segment cannot stand in for
  // "the body advanced". Leg nodes sit low; trunk nodes are everything before the first leg node.
  const nNodes = samples[0].nodes.length
  const trunkCount = nNodes - nLegs
  const com = samples.map((s) => {
    let x = 0
    let z = 0
    for (let i = 0; i < trunkCount; i++) {
      x += s.nodes[i].x
      z += s.nodes[i].z
    }
    return [x / trunkCount, z / trunkCount]
  })

  const out = []
  for (let li = 0; li < nLegs; li++) {
    const shift = samples[0].legs[li].limbIdx < 2 ? shiftF : shiftH
    const rel = samples.map((s) => wrap01(s.legs[li].phase - shift))
    // A window is a maximal run of rel < 0.5. Runs touching either end of the capture are dropped: a
    // partial window understates travel and would flatter the result.
    const windows = []
    let start = null
    for (let i = 0; i < rel.length; i++) {
      const inW = rel[i] < 0.5
      if (inW && start === null) start = i
      if (!inW && start !== null) {
        windows.push([start, i - 1])
        start = null
      }
    }
    if (windows.length && windows[0][0] === 0) windows.shift()

    const travels = []
    const pcts = []
    for (const [a, b] of windows) {
      if (b - a < 2) continue
      let foot = 0
      for (let i = a + 1; i <= b; i++) {
        const p = samples[i - 1].legs[li]
        const q = samples[i].legs[li]
        foot += Math.hypot(q.footX - p.footX, q.footZ - p.footZ)
      }
      const body = Math.hypot(com[b][0] - com[a][0], com[b][1] - com[a][1])
      travels.push(foot)
      if (body > 1e-6) pcts.push((100 * foot) / body)
    }
    const mean = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN)
    out.push({
      leg: samples[0].legs[li].leg,
      windows: travels.length,
      travel: mean(travels),
      pct: mean(pcts),
    })
  }
  return { file, cfg, out }
}

for (const f of FILES) {
  const { file, cfg, out } = score(f)
  const tag = `sweepTracksHip=${cfg.sweepTracksHip === true} thrust=${cfg.footThrustEnabled ? cfg.footThrustGain : 'off'} sweepAmount=${cfg.sweepAmount}`
  console.log(`\n## ${file.split(/[\\/]/).pop()}   ${tag}`)
  console.log('leg   windows   foot travel (u)   as % of body advance')
  for (const r of out) {
    console.log(`${r.leg.padEnd(6)}${String(r.windows).padEnd(10)}${r.travel.toFixed(3).padEnd(18)}${r.pct.toFixed(1)}%`)
  }
  const pcts = out.map((r) => r.pct).filter((v) => Number.isFinite(v))
  if (pcts.length) {
    console.log(`mean across feet: ${(pcts.reduce((s, x) => s + x, 0) / pcts.length).toFixed(1)}%   (0% planted, 100% rode along)`)
  }
}
