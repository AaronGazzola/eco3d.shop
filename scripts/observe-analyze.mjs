// Tabulate captured observation runs: amplitude (lateral Z-span per node), frequency (computed
// ν = drive·exc·1.1), forward thrust (COM Δx), and stability (Δy, tail amp). Reads every
// nodes-*.json in documentation/diagnostics/observe (or only those newer than an optional epoch arg).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'documentation/diagnostics/observe'
const sinceArg = process.argv[2] ? Number(process.argv[2]) : 0

const files = readdirSync(DIR)
  .filter((f) => f.startsWith('nodes-') && f.endsWith('.json'))
  .sort()

const rows = []
for (const f of files) {
  let j
  try { j = JSON.parse(readFileSync(join(DIR, f), 'utf8')) } catch { continue }
  const { config: c, samples } = j
  if (!samples || samples.length < 2) continue
  const tISO = f.slice(6, 25).replace(/-/g, (m, i) => (i === 13 || i === 16 ? ':' : m))
  const mtime = new Date(tISO).getTime()
  if (sinceArg && mtime < sinceArg) continue

  const n = samples[0].nodes.length
  const zspan = (i) => {
    let lo = Infinity, hi = -Infinity
    for (const s of samples) { const v = s.nodes[i].z; if (v < lo) lo = v; if (v > hi) hi = v }
    return hi - lo
  }
  const yspan = (i) => {
    let lo = Infinity, hi = -Infinity
    for (const s of samples) { const v = s.nodes[i].y; if (v < lo) lo = v; if (v > hi) hi = v }
    return hi - lo
  }
  const com = (s) => { let x = 0, z = 0; for (const nd of s.nodes) { x += nd.x; z += nd.z } return { x: x / s.nodes.length, z: z / s.nodes.length } }
  const c0 = com(samples[0]), c1 = com(samples[samples.length - 1])
  const dur = samples[samples.length - 1].t - samples[0].t
  const tail = zspan(n - 1)
  const mid = zspan(Math.floor(n / 2))
  const head = zspan(1)
  const maxY = Math.max(...Array.from({ length: n }, (_, i) => yspan(i)))
  const nu = (c.cpgDrive ?? 0) * (c.cpgExcitability ?? 0) * 1.1
  rows.push({
    file: f.slice(6, 25),
    drive: c.cpgDrive, exc: c.cpgExcitability,
    a: c.muscleAlpha, b: c.muscleBeta, d: c.muscleDamping,
    drag: c.environmentEnabled ? 'ON ' : 'off',
    bf: c.bodyFriction,
    nu, tail, mid, head, maxY,
    dx: c1.x - c0.x, dz: c1.z - c0.z, dur,
  })
}

const f2 = (x, w = 6, d = 2) => (x === undefined || x === null ? '—' : Number(x).toFixed(d)).padStart(w)
console.log('time(UTC)            drive  exc   α     β     δ    drag  bf    ν(Hz) tailZ midZ  headZ maxΔY  COMΔx  COMΔz')
for (const r of rows) {
  console.log(
    `${r.file}  ${f2(r.drive, 5)} ${f2(r.exc, 4)} ${f2(r.a, 5)} ${f2(r.b, 5)} ${f2(r.d, 4)} ${r.drag}  ${f2(r.bf, 4)} ${f2(r.nu, 5)} ${f2(r.tail, 5)} ${f2(r.mid, 4)} ${f2(r.head, 4)} ${f2(r.maxY, 5)} ${f2(r.dx, 6)} ${f2(r.dz, 6)}`
  )
}
console.log(`\n${rows.length} runs. amplitude = lateral Z-span (world units); ν = drive·exc·1.1; COMΔx = forward thrust over ~${rows[0]?.dur?.toFixed(0)}s.`)
