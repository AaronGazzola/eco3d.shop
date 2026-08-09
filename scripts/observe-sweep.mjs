// Batch sweep of the spine wave shape (roadmap Phase D-T2, task 5.1c).
//
// 5.1b established that the wave profile responds redistributively: moving one control point pushes bend
// onto its neighbours instead of removing it, so single-lever steps cannot find the shape. This runs MANY
// configurations in ONE browser session and scores every one of them against EVERY §6 metric, so the
// trade-offs can be read off a single table instead of inferred across separate runs.
//
//   node scripts/observe-sweep.mjs [--n 48] [--seconds 12] [--hz 20] [--legw 0.1]
//
// Each sample: applyAbsolute(config) → stop the sim (disposes the MuJoCo driver) → start it (rebuilds from
// rest) → capture → score. The stop/start is what makes samples independent; without it every run would
// inherit the previous run's pose and velocity.
//
// Outputs to docs/diagnostics/observe/:
//   sweep-<ts>.json  every sample: config, link, and the full §6 score
//   sweep-<ts>.md    the ranked table

import { chromium } from 'playwright-core'
import { mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
import { scoreRun } from './observe-metrics.mjs'

const BASE = process.env.OBSERVE_URL ?? 'http://127.0.0.1:3002'
const RIG = process.env.OBSERVE_RIG ?? 'baby cyber dragon'
const OUT = 'docs/diagnostics/observe'
const AUTH = 'scripts/.observe-auth.json'

function findChromium() {
  try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = platform() === 'win32'
    ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
    : platform() === 'darwin'
      ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
      : join(homedir(), '.cache', 'ms-playwright')
  for (const d of readdirSync(root).filter((x) => x.startsWith('chromium-')).sort().reverse())
    for (const exe of [
      join(root, d, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      join(root, d, 'chrome-win64', 'chrome.exe'),
      join(root, d, 'chrome-win', 'chrome.exe'),
      join(root, d, 'chrome-linux', 'chrome'),
    ]) if (existsSync(exe)) return exe
  throw new Error('no chromium binary found — run: npx playwright install chromium')
}

// ---- args -----------------------------------------------------------------
const A = process.argv.slice(2)
const flag = (name, dflt) => { const i = A.indexOf('--' + name); return i >= 0 ? Number(A[i + 1]) : dflt }
const N = flag('n', 48)
const SECONDS = flag('seconds', 12)
const HZ = flag('hz', 20)
const LEGW = flag('legw', 0.1)

// ---- the space, as pinned in the change's task 5.1c -----------------------
// Fixed for every sample. Anything not listed here lands on its DEFAULT, because applyAbsolute is used —
// so a sample cannot silently inherit state from the sample before it.
const BASE_FIXED = {
  gravityEnabled: true, landLegsEnabled: true, landGroundEnabled: true, limbCpgEnabled: false,
  legsLocked: true, environmentEnabled: true, frontDrive: 0, frontSegments: 0, turnBias: 0, limbDrive: 0,
  feedbackIpsi: 0, feedbackContra: 0, cpgExcitability: 0.74, muscleBeta: 35, muscleDamping: 6,
  bodyFriction: 0, legFriction: 0.05, gripEnabled: false, gripClockCpg: true, gripShift: 0.27,
  gripDuration: 1, gripSoftness: 0, girdleBoost: 0, releaseFriction: 0, gripGlowEnabled: true,
  gripFeet: { FL: true, FR: false, BL: false, BR: false },
  stepEnabled: true, stepFeet: { FL: true, FR: true, BL: true, BR: true },
  sweepAmount: 0, sweepSpeed: 3000, liftAmount: 0, legStiffness: 3000, legDamping: 400,
  simEngine: 'mujoco', footThrustEnabled: false, footThrustGain: 0,
  footThrustShift: 0.138, footThrustShiftHind: 0.638, headIsolated: true,
}

// The coarse space. `--space <file.json>` replaces it (and optionally the anchors) for a refinement pass,
// so re-aiming the search never means editing the runner and losing the record of what was searched.
const DEFAULT_GRID = {
  cpgDrive: [0.39, 0.5, 0.65, 0.85, 1.1],
  muscleAlpha: [14, 18, 22],
  waveNose: [0.6, 0.8, 1.0],
  waveShoulder: [0.8, 1.0],
  waveHip: [0.5, 0.7, 0.9, 1.0],
  waveTailMid: [0.2, 0.35, 0.5, 0.7],
  waveTailTip: [0.15, 0.3, 0.5],
}
const spaceIdx = A.indexOf('--space')
const SPACE = spaceIdx >= 0 ? JSON.parse(readFileSync(A[spaceIdx + 1], 'utf8')) : null
const GRID = SPACE?.grid ?? DEFAULT_GRID
// A space file may also override the fixed block — e.g. to switch foot thrust ON for a whole family.
const FIXED = { ...BASE_FIXED, ...(SPACE?.fixed ?? {}) }

// Anchors, always run: the 5.1b baseline, and the UNSHAPED wave at three drives. The unshaped rungs are
// what make the shaping legible — without them a good sample cannot be told apart from "more drive".
const DEFAULT_ANCHORS = [
  { label: 'anchor: 5.1b baseline', cpgDrive: 0.39, muscleAlpha: 18, waveNose: 1, waveShoulder: 1, waveHip: 1, waveTailMid: 0.6, waveTailTip: 0.6 },
  { label: 'anchor: unshaped d0.39', cpgDrive: 0.39, muscleAlpha: 18, waveNose: 1, waveShoulder: 1, waveHip: 1, waveTailMid: 1, waveTailTip: 1 },
  { label: 'anchor: unshaped d0.65', cpgDrive: 0.65, muscleAlpha: 18, waveNose: 1, waveShoulder: 1, waveHip: 1, waveTailMid: 1, waveTailTip: 1 },
  { label: 'anchor: unshaped d1.10', cpgDrive: 1.1, muscleAlpha: 18, waveNose: 1, waveShoulder: 1, waveHip: 1, waveTailMid: 1, waveTailTip: 1 },
]

// Fixed seed so the sample list is reproducible — a sweep nobody can re-run is not evidence.
let seed = 20260808
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

// Draws one sample by picking each GRID key independently, so a space file can sweep ANY SimConfig key
// (thrust gain, muscle beta, …) without the runner knowing what it means.
function draw() {
  // Monotone non-increasing from the shoulder back: the swim envelope grows head→tail, so a bulge in the
  // middle is not a shape worth spending a sample on. Only enforced when those keys are being swept.
  for (let tries = 0; tries < 400; tries++) {
    const v = {}
    for (const k of Object.keys(GRID)) v[k] = pick(GRID[k])
    const w = ['waveShoulder', 'waveHip', 'waveTailMid', 'waveTailTip'].map((k) => (k in v ? v[k] : null))
    const ordered = w.every((x, i) => x === null || i === 0 || w[i - 1] === null || w[i - 1] >= x)
    if (ordered) return v
  }
  return null
}

const GRID_KEYS = Object.keys(GRID)
const key = (v) => GRID_KEYS.map((k) => v[k]).join('|')
const shortLabel = (v) => GRID_KEYS.map((k) => `${k.replace(/^(wave|cpg|muscle|foot)/, '')}=${v[k]}`).join(' ')
const ANCHORS = SPACE?.anchors ?? DEFAULT_ANCHORS
const samples = [...ANCHORS]
const seen = new Set(samples.map(key))
while (samples.length < N) {
  const d = draw()
  if (!d || seen.has(key(d))) continue
  seen.add(key(d))
  samples.push({ label: shortLabel(d), ...d })
}

// ---- run ------------------------------------------------------------------
mkdirSync(OUT, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', String(e).slice(0, 160)))

const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false)) {
  for (const txt of ['1.Pick Model', 'Load', RIG, '3.Animate']) {
    await page.getByText(rx(txt)).first().click({ timeout: 8000 })
    await page.waitForTimeout(1500)
  }
  await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
}
await page.evaluate((w) => window.__studio.legWeight(w), LEGW)
await page.waitForTimeout(400)

console.log(`sweep: ${samples.length} samples × ${SECONDS}s  (~${Math.round((samples.length * (SECONDS + 2.5)) / 60)} min)  legw=${LEGW}`)

// Warm-up, discarded. The FIRST run after a page load reports differently from every run after it: six
// identical runs of the same config read 8.3° of bend spread on the first and 5.9–6.0° on all five
// others, with speed and girdle ratio identical throughout. The MuJoCo driver is built lazily on the
// first Run, so that sample straddles the build. Everything after it reproduces to 0.1°, so one thrown
// away run is the whole fix — and without it the first row of every batch is quietly wrong.
const results = []
const WARMUP = [{ label: '(warm-up, discarded)', ...samples[0] }]
for (let i = 0; i < WARMUP.length + samples.length; i++) {
  const { label, ...vars } = i === 0 ? WARMUP[0] : samples[i - 1]
  const config = { ...FIXED, ...vars }
  // Stop first: the MuJoCo driver is disposed when coupledRunning goes false, so the next start rebuilds
  // the body from rest. Without this every sample inherits the previous sample's pose and velocity.
  await page.evaluate(() => window.__studio.drive(false))
  await page.waitForTimeout(350)
  await page.evaluate((c) => window.__studio.applyAbsolute(c), config)
  await page.evaluate((w) => window.__studio.legWeight(w), LEGW)
  await page.waitForTimeout(250)
  await page.evaluate((o) => { window.__studio.nodeCaptureStart(o); window.__studio.drive(true) }, { hz: HZ, maxSamples: 8000 })
  await page.waitForTimeout(SECONDS * 1000)
  const link = await page.evaluate(() => window.__studio.buildLink())
  const dump = await page.evaluate(() => window.__studio.nodeCaptureStop())
  await page.evaluate(() => window.__studio.drive(false))

  if (!dump.samples?.length || !dump.spineFracPeak?.length) {
    console.log(`${String(i).padStart(3)}/${samples.length}  ${label}  → NO DATA (skipped)`)
    continue
  }
  const s = scoreRun(dump)
  if (i === 0) { console.log(`  warm-up discarded (first run after page load is not repeatable)`); continue }
  results.push({ label, vars, config, link, score: s })
  console.log(
    `${String(i + 1).padStart(3)}/${samples.length}  ${label.padEnd(42)}` +
    ` spread=${s.bendSpread.toFixed(1)}°  girdle=${s.girdleRatio.toFixed(2)}` +
    `  clip=${s.clips ? 'j' + s.clippers.join(',j') : 'none'}  speed=${s.speed.toFixed(2)}  roll=${s.rollPerSec.toFixed(1)}/s`
  )
}

await browser.close()

// ---- report ---------------------------------------------------------------
writeFileSync(`${OUT}/sweep-${stamp}.json`, JSON.stringify({ fixed: FIXED, grid: GRID, seconds: SECONDS, hz: HZ, legWeight: LEGW, results }, null, 1))

const clean = results.filter((r) => !r.score.clips)
// Rank on the two §6 metric-2 numbers together: how uneven the bend is, and how far the girdle pair is
// from turning by equal amounts. Speed and roll are REPORTED, never folded into the rank — §6 sets no
// fixed priority between the metrics, so collapsing them into one number would make that choice silently.
const rank = (r) => r.score.bendSpread + 20 * Math.abs(r.score.girdleRatio - 1)
clean.sort((a, b) => rank(a) - rank(b))

const f = (x, d = 2) => (x == null ? '—' : Number(x).toFixed(d))
const lines = []
lines.push('# Wave-shape sweep — roadmap §6, all metrics per sample')
lines.push(`generated: ${new Date().toISOString()}`)
lines.push(`${results.length} samples scored, ${clean.length} with nothing at its cap. ${SECONDS}s each at ${HZ} Hz, legs ${LEGW} kg.`)
lines.push('')
lines.push('Fixed: MuJoCo, drag on, head isolated, no thrust/grip/sweep. Ranked by bend spread + girdle')
lines.push('imbalance TOGETHER; speed and roll are reported, never folded into the rank (§6 sets no fixed')
lines.push('priority between the metrics, so collapsing them would make the owner\'s choice silently).')
lines.push('')
lines.push('| # | drive | α | nose/shldr/hip/mid/tip | spread° | max/min | girdle f→h | swing | speed | lat% | roll/s | clips |')
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
const row = (r, i) => {
  const s = r.score
  return `| ${i} | ${r.label} | ${f(s.bendSpread, 1)} | ${f(s.bendRatio)} | ${f(s.girdleFrontDeg, 1)}→${f(s.girdleHindDeg, 1)} (${f(s.girdleRatio)}) | ${f(s.swingPeak)} | ${f(s.speed)} | ${f((s.lateralPct ?? 0) * 100, 1)} | ${f(s.rollPerSec, 1)} | ${s.clips ? 'j' + s.clippers.join(',j') : '—'} |`
}
clean.forEach((r, i) => lines.push(row(r, i + 1)))
lines.push('')
lines.push('## Samples that clip (rejected, kept so the useful range stays bounded)')
lines.push('| config | spread° | girdle | speed | clips |')
lines.push('| --- | --- | --- | --- | --- |')
for (const r of results.filter((x) => x.score.clips)) {
  const s = r.score
  lines.push(`| ${r.label} | ${f(s.bendSpread, 1)} | ${f(s.girdleRatio)} | ${f(s.speed)} | j${s.clippers.join(',j')} |`)
}
lines.push('')
lines.push('## Per-joint peak bend (degrees) — top 8 clean samples')
for (const r of clean.slice(0, 8)) {
  lines.push(`\n**${r.label}**`)
  lines.push('  ' + r.score.bendDeg.map((d, i) => `seg${r.score.bendSeg[i]}=${d.toFixed(1)}°`).join('  '))
  lines.push('  caps: ' + r.score.caps.map((c, i) => `seg${r.score.bendSeg[i]}=${c.toFixed(0)}°`).join('  '))
  lines.push(`  link: ${r.link}`)
}
writeFileSync(`${OUT}/sweep-${stamp}.md`, lines.join('\n') + '\n')
console.log(`\n${results.length} scored → sweep-${stamp}.md / .json   (${clean.length} clean)`)
