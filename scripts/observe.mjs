// Locomotion observation harness (cross-platform: macOS + Windows).
//
// Default mode captures the world position of every body node (x,y,z) over time at a chosen sample
// rate (default 4/s) and renders a top-down node-skeleton image from those positions — NO browser
// screenshots unless you ask for them (--shots). You also get total config control: override any
// simulation parameter with --set key=value or --config file.json.
//
//   node scripts/observe.mjs login                                  # sign in once, cache the session
//   node scripts/observe.mjs config                                 # print the live sim config (all params)
//   node scripts/observe.mjs run [seconds] [--hz N] [--shots] \
//        [--set key=value ...] [--config overrides.json]            # run sim, capture nodes, render
//
// Examples:
//   node scripts/observe.mjs run 8
//   node scripts/observe.mjs run 12 --hz 10 --set cpgDrive=2.4 --set turnBias=0.3
//   node scripts/observe.mjs run 8 --shots --config presets/fast.json
//
// Outputs to documentation/diagnostics/observe/:
//   nodes-<ts>.json        raw samples + spec + config used
//   nodes-<ts>-topdown.png top-down skeleton: overlay (all frames) + small-multiples over time
//   nodes-<ts>.md          per-node per-axis ranges, COM drift, config used
//   shots-<ts>.png         (only with --shots) multi-angle screenshot contact sheet

import { chromium } from 'playwright-core'
import { mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'

const BASE = process.env.OBSERVE_URL ?? 'http://127.0.0.1:3002'
const EMAIL = process.env.OBSERVE_EMAIL ?? 'aaron@gazzola.dev'
const PASS = process.env.OBSERVE_PASS ?? 'password123!'
const RIG = process.env.OBSERVE_RIG ?? 'baby cyber dragon'
const OUT = 'documentation/diagnostics/observe'
const AUTH = 'scripts/.observe-auth.json'
const ANGLES = ['top', 'side', 'front']

// Cross-platform chromium discovery. Prefer playwright-core's own resolved path (works once the
// matching browser is installed via `npx playwright install chromium`); fall back to scanning the
// ms-playwright cache for the current OS.
function findChromium() {
  try {
    const p = chromium.executablePath()
    if (p && existsSync(p)) return p
  } catch {}
  const root =
    platform() === 'win32'
      ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
      : platform() === 'darwin'
        ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(homedir(), '.cache', 'ms-playwright')
  if (!existsSync(root)) throw new Error(`no ms-playwright cache at ${root} — run: npx playwright install chromium`)
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()
  const candidates = (d) => [
    join(root, d, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    join(root, d, 'chrome-win64', 'chrome.exe'),
    join(root, d, 'chrome-win', 'chrome.exe'),
    join(root, d, 'chrome-linux', 'chrome'),
  ]
  for (const d of dirs) for (const exe of candidates(d)) if (existsSync(exe)) return exe
  throw new Error('no chromium binary found — run: npx playwright install chromium')
}

// ---- arg parsing -----------------------------------------------------------
const [, , CMD = 'config', ...REST] = process.argv
function parseFlags(rest) {
  const out = { positional: [], hz: 4, shots: false, events: false, eventShots: false, sets: {}, configFile: null, legw: null, legyaw: null }
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--shots') out.shots = true
    else if (a === '--events') out.events = true
    else if (a === '--event-shots') { out.events = true; out.eventShots = true }
    else if (a === '--hz') out.hz = Number(rest[++i])
    else if (a === '--legw') out.legw = Number(rest[++i])
    else if (a === '--legyaw') out.legyaw = Number(rest[++i])
    else if (a === '--config') out.configFile = rest[++i]
    else if (a === '--set') {
      const [k, ...v] = rest[++i].split('=')
      out.sets[k] = coerce(v.join('='))
    } else out.positional.push(a)
  }
  return out
}
function coerce(v) {
  if (v === 'true') return true
  if (v === 'false') return false
  const n = Number(v)
  return Number.isFinite(n) && v.trim() !== '' ? n : v
}

const EXE = findChromium()
mkdirSync(OUT, { recursive: true })
const ts = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ...(existsSync(AUTH) && CMD !== 'login' ? { storageState: AUTH } : {}),
})
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text().slice(0, 200)) })
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', String(e).slice(0, 200)))

const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

async function loadRig() {
  try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
  const wizardVisible = await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false)
  if (!wizardVisible) return
  for (const txt of ['1.Pick Model', 'Load', RIG, '3.Animate']) {
    await page.getByText(rx(txt)).first().click({ timeout: 8000 })
    await page.waitForTimeout(1500)
  }
  await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
}

await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)

if (CMD === 'login') {
  if (await page.getByLabel('Email').count().catch(() => 0)) {
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASS)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForTimeout(6000)
  }
  await ctx.storageState({ path: AUTH })
  console.log('logged in, session cached. url=', page.url())
} else if (CMD === 'config') {
  await loadRig()
  const cfg = await page.evaluate(() => window.__studio.getConfig())
  console.log(JSON.stringify(cfg, null, 2))
} else if (CMD === 'run') {
  const { positional, hz, shots, events, eventShots, sets, configFile, legw, legyaw } = parseFlags(REST)
  const seconds = Number(positional[0] ?? 8)
  let overrides = { ...sets }
  if (configFile) overrides = { ...JSON.parse(readFileSync(configFile, 'utf8')), ...overrides }

  await loadRig()
  const applied = await page.evaluate((ov) => {
    if (Object.keys(ov).length) window.__studio.apply(ov)
    return window.__studio.getConfig()
  }, overrides)
  if (legw != null && Number.isFinite(legw)) {
    await page.evaluate((w) => window.__studio.legWeight(w), legw)
    await page.waitForTimeout(400)
    console.log(`leg weight set to ${legw} kg`)
  }
  if (legyaw != null && Number.isFinite(legyaw)) {
    await page.evaluate((v) => window.__studio.legYaw(v), legyaw)
    await page.waitForTimeout(400)
    console.log(`leg yaw caps set to ±${legyaw} rad (symmetric)`)
  }
  console.log(`run ${seconds}s  hz=${hz}  shots=${shots ? 'ON' : 'off'}  events=${events ? (eventShots ? 'ON+snapshots' : 'ON') : 'off'}  overrides=${JSON.stringify(overrides)}`)

  await page.evaluate((o) => { window.__studio.nodeCaptureStart(o); window.__studio.drive(true) }, { hz, maxSamples: 8000, events, eventSnapshots: eventShots })

  const shotRows = []
  const stamp = ts()
  if (shots) {
    const camWait = 250
    for (let t = 1; t <= seconds; t++) {
      await page.waitForTimeout(Math.max(0, 1000 - ANGLES.length * camWait))
      const files = {}
      for (const a of ANGLES) {
        await page.evaluate((a) => window.__studio.setCam(a), a)
        await page.waitForTimeout(camWait)
        files[a] = `f${String(t).padStart(2, '0')}_${a}.png`
        await page.screenshot({ path: `${OUT}/${files[a]}`, clip: { x: 0, y: 0, width: 980, height: 900 } })
      }
      const d = await page.evaluate(() => window.__studio.diag())
      shotRows.push({ t, files, d })
      console.log(`t=${t}s KE=${d.kineticEnergy.toExponential(2)} drift=${d.comDriftFromStart.toFixed(3)} maxJ=${Math.round(d.maxJointFracOfCap * 100)}%`)
    }
  } else {
    for (let t = 1; t <= seconds; t++) {
      await page.waitForTimeout(1000)
      const d = await page.evaluate(() => window.__studio.diag())
      console.log(`t=${t}s KE=${d.kineticEnergy.toExponential(2)} drift=${d.comDriftFromStart.toFixed(3)} maxJ=${Math.round(d.maxJointFracOfCap * 100)}% comY=${(d.comYDrift ?? 0).toFixed(3)} tilt=${(d.maxTiltDeg ?? 0).toFixed(1)}°`)
    }
  }

  const dump = await page.evaluate(() => window.__studio.nodeCaptureStop())
  await page.evaluate(() => window.__studio.drive(false))

  if (!dump.samples.length) {
    console.log('WARNING: no node samples captured (is the rig loaded and sim running?)')
  } else {
    writeFileSync(`${OUT}/nodes-${stamp}.json`, JSON.stringify({ config: applied, spec: dump.spec, samples: dump.samples, events: dump.events }))
    writeNodeReport(`${OUT}/nodes-${stamp}.md`, dump, applied, { seconds, hz })
    await renderTopDown(`${OUT}/nodes-${stamp}-topdown.png`, dump)
    console.log(`captured ${dump.samples.length} node samples (${dump.spec?.count} nodes @ ${hz}/s) → nodes-${stamp}.*`)
    if (dump.maxCapFrac != null) console.log(`peak maxJointFracOfCap (per-frame peak-hold) = ${Math.round(dump.maxCapFrac * 100)}%  ${dump.maxCapFrac >= 1 ? '⚠ CLIPS CAP' : 'OK (under cap)'}`)
    if (dump.maxRollDeg != null) {
      const perSec = dump.rollFlips / Math.max(1, seconds)
      console.log(`roll: peak |roll|=${dump.maxRollDeg.toFixed(2)}°  reversals=${dump.rollFlips} (${perSec.toFixed(1)}/s)  ${perSec >= 4 ? '⚠ VIBRATING' : 'steady'}`)
    }
    if (dump.sweepLo && dump.sweepHi) {
      console.log('sweep angle reached (rad) vs cap [−back .. +fwd]:')
      for (let i = 0; i < dump.sweepLo.length; i++) {
        const fwdPct = Math.round((dump.sweepHi[i] / Math.max(1e-6, dump.sweepCapF[i])) * 100)
        const backPct = Math.round((-dump.sweepLo[i] / Math.max(1e-6, dump.sweepCapB[i])) * 100)
        console.log(`  ${dump.sweepLegs[i]}: [${dump.sweepLo[i].toFixed(2)} .. ${dump.sweepHi[i].toFixed(2)}]  cap[${(-dump.sweepCapB[i]).toFixed(2)} .. ${dump.sweepCapF[i].toFixed(2)}]  → fwd ${fwdPct}%  back ${backPct}%`)
      }
    }
  }
  if (events) {
    const evs = dump.events ?? []
    if (!evs.length) {
      console.log('events: none detected (no hip joints, or sim did not advance the limb CPG)')
    } else {
      writeEventsReport(`${OUT}/nodes-${stamp}-events.md`, evs, applied)
      console.log(`events: ${evs.length} grip/sweep/lift edges → nodes-${stamp}-events.md`)
      if (eventShots && evs.some((e) => e.nodes)) {
        await renderEventSnapshots(`${OUT}/nodes-${stamp}-events.png`, evs, dump)
        console.log(`event snapshots → nodes-${stamp}-events.png`)
      }
    }
    if (dump.reach && dump.reach.some((r) => r && r.n > 0)) {
      reportReach(`${OUT}/nodes-${stamp}-reach.md`, dump.reach, dump.reachLegs ?? [], applied)
    }
  }
  if (shots && shotRows.length) {
    await buildContactSheet(`${OUT}/shots-${stamp}.png`, shotRows)
    console.log(`saved shots-${stamp}.png`)
  }
}

// ---- node report + rendering ----------------------------------------------
function writeNodeReport(path, dump, cfg, meta) {
  const { samples, spec } = dump
  const n = spec?.count ?? samples[0].nodes.length
  const f = (x, d = 3) => Number(x).toFixed(d)
  const axisRange = (i, axis) => {
    let lo = Infinity, hi = -Infinity
    for (const s of samples) { const v = s.nodes[i][axis]; if (v < lo) lo = v; if (v > hi) hi = v }
    return [lo, hi]
  }
  const com = (s) => {
    let x = 0, y = 0, z = 0
    for (const nd of s.nodes) { x += nd.x; y += nd.y; z += nd.z }
    return { x: x / s.nodes.length, y: y / s.nodes.length, z: z / s.nodes.length }
  }
  const c0 = com(samples[0]), c1 = com(samples[samples.length - 1])
  const lines = []
  lines.push('# Node-position capture')
  lines.push(`generated: ${new Date().toISOString()}`)
  lines.push(`duration: ${f(samples[samples.length - 1].t, 2)}s   samples: ${samples.length}   rate: ${meta.hz}/s   nodes: ${n}`)
  lines.push('')
  lines.push('Axes: X = forward (body length), Y = vertical (height), Z = lateral. Top-down view = X horizontal × Z vertical.')
  lines.push('')
  lines.push(`COM start: x=${f(c0.x)} y=${f(c0.y)} z=${f(c0.z)}`)
  lines.push(`COM end:   x=${f(c1.x)} y=${f(c1.y)} z=${f(c1.z)}`)
  lines.push(`COM travel: Δx=${f(c1.x - c0.x)} Δy=${f(c1.y - c0.y)} Δz=${f(c1.z - c0.z)}  |horizontal|=${f(Math.hypot(c1.x - c0.x, c1.z - c0.z))}`)
  if (dump.maxCapFrac != null) lines.push(`peak maxJointFracOfCap (per-frame peak-hold): ${(dump.maxCapFrac * 100).toFixed(1)}%  ${dump.maxCapFrac >= 1 ? 'CLIPS CAP' : 'under cap'}`)
  if (dump.maxRollDeg != null) lines.push(`roll about long axis: peak |roll|=${dump.maxRollDeg.toFixed(2)}°  reversals=${dump.rollFlips} (${(dump.rollFlips / Math.max(1, meta.seconds)).toFixed(1)}/s)`)
  lines.push('')
  lines.push('## Per-node range over capture (world units)')
  lines.push('idx groupId                 X[min..max]            Y[min..max]            Z[min..max]')
  for (let i = 0; i < n; i++) {
    const [xl, xh] = axisRange(i, 'x'), [yl, yh] = axisRange(i, 'y'), [zl, zh] = axisRange(i, 'z')
    const gid = (spec?.groupIds?.[i] ?? `node${i}`).slice(0, 22).padEnd(22)
    lines.push(`${String(i).padStart(3)} ${gid} ${f(xl).padStart(7)}..${f(xh).padStart(7)}   ${f(yl).padStart(7)}..${f(yh).padStart(7)}   ${f(zl).padStart(7)}..${f(zh).padStart(7)}`)
  }
  lines.push('')
  lines.push('## Config used')
  lines.push('```json')
  lines.push(JSON.stringify(cfg, null, 2))
  lines.push('```')
  writeFileSync(path, lines.join('\n') + '\n')
}

async function renderTopDown(path, dump) {
  const { samples } = dump
  // shared bounds across all frames so motion is visible (X horizontal, Z vertical-in-image)
  let xl = Infinity, xh = -Infinity, zl = Infinity, zh = -Infinity
  for (const s of samples) for (const nd of s.nodes) {
    if (nd.x < xl) xl = nd.x; if (nd.x > xh) xh = nd.x
    if (nd.z < zl) zl = nd.z; if (nd.z > zh) zh = nd.z
  }
  const pad = 0.1 * Math.max(xh - xl, zh - zl, 0.5)
  xl -= pad; xh += pad; zl -= pad; zh += pad
  const W = 320, H = 220
  const sx = (x) => ((x - xl) / (xh - xl)) * W
  const sz = (z) => ((z - zl) / (zh - zl)) * H
  const path2 = (s) => s.nodes.map((nd, i) => `${i ? 'L' : 'M'}${sx(nd.x).toFixed(1)},${sz(nd.z).toFixed(1)}`).join(' ')
  const dots = (s, r, fill) => s.nodes.map((nd) => `<circle cx="${sx(nd.x).toFixed(1)}" cy="${sz(nd.z).toFixed(1)}" r="${r}" fill="${fill}"/>`).join('')

  // overlay: every frame faint, head node highlighted, + COM trajectory
  const overlay = samples.map((s, i) => {
    const a = 0.12 + 0.6 * (i / Math.max(1, samples.length - 1))
    return `<path d="${path2(s)}" fill="none" stroke="rgba(90,200,255,${a.toFixed(2)})" stroke-width="1.3"/>`
  }).join('')
  const comPts = samples.map((s) => {
    let x = 0, z = 0; for (const nd of s.nodes) { x += nd.x; z += nd.z }
    return `${sx(x / s.nodes.length).toFixed(1)},${sz(z / s.nodes.length).toFixed(1)}`
  }).join(' ')

  // small-multiples: up to 12 evenly spaced frames
  const K = Math.min(12, samples.length)
  const step = (samples.length - 1) / Math.max(1, K - 1)
  const picks = Array.from({ length: K }, (_, k) => samples[Math.round(k * step)])
  const cells = picks.map((s) => `
    <div style="position:relative">
      <svg width="${W}" height="${H}" style="background:#0d1117;display:block">
        <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#30363d"/>
        <path d="${path2(s)}" fill="none" stroke="#58c4ff" stroke-width="2"/>
        ${dots(s, 2.6, '#ffd34d')}
        <circle cx="${sx(s.nodes[0].x).toFixed(1)}" cy="${sz(s.nodes[0].z).toFixed(1)}" r="4" fill="#ff5d5d"/>
      </svg>
      <div style="position:absolute;top:2px;left:4px;font-size:11px;color:#8b949e">t=${s.t.toFixed(2)}s</div>
    </div>`).join('')

  const html = `<html><body style="margin:0;background:#161b22;font-family:monospace;color:#c9d1d9;padding:10px">
    <div style="font-size:13px;margin-bottom:6px">Top-down node skeleton — X (forward) → horizontal, Z (lateral) ↓ vertical. Red = head node. Bounds shared across all frames.</div>
    <div style="display:flex;gap:12px;margin-bottom:14px">
      <div>
        <div style="font-size:12px;color:#8b949e;margin-bottom:3px">Overlay: all ${samples.length} frames (faint→bright over time) + COM path (orange)</div>
        <svg width="${W * 2}" height="${H * 2}" style="background:#0d1117;display:block">
          <rect x="0" y="0" width="${W * 2}" height="${H * 2}" fill="none" stroke="#30363d"/>
          <g transform="scale(2)">${overlay}<polyline points="${comPts}" fill="none" stroke="#ffa657" stroke-width="0.8" stroke-dasharray="3 2"/></g>
        </svg>
      </div>
    </div>
    <div style="font-size:12px;color:#8b949e;margin-bottom:4px">Snapshots over time:</div>
    <div style="display:grid;grid-template-columns:repeat(4,${W}px);gap:8px">${cells}</div>
  </body></html>`
  const p2 = await ctx.newPage()
  await p2.setContent(html)
  await p2.waitForTimeout(250)
  await p2.screenshot({ path, fullPage: true })
  await p2.close()
}

function writeEventsReport(path, evs, cfg) {
  const f = (x, d = 3) => Number(x).toFixed(d)
  const stepDuty = Math.min(0.95, Math.max(0.05, cfg.gripDuration))
  const lines = []
  lines.push('# Primitive-window timing (grip / sweep / lift)')
  lines.push(`generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('Windows are computed from the limb-CPG phase ONLY — the grip/step switches need NOT be on,')
  lines.push('so this timing is observed without the behaviour interfering with the animation.')
  lines.push(`gripShift=${f(cfg.gripShift, 3)}  gripDuration=${f(cfg.gripDuration, 3)}  stepDuty(clamped)=${f(stepDuty, 3)}`)
  lines.push('grip = rel<gripDuration (foot planted) ; sweep = rel<stepDuty (leg sweeping BACKWARD, power')
  lines.push('stroke) ; lift = rel>=stepDuty (leg sweeping FORWARD, recovery swing).')
  lines.push('So the sweep DIRECTION flips: BACKWARD while `sweep` is on, FORWARD while `lift` is on.')
  lines.push(`gripEnabled=${cfg.gripEnabled}  stepEnabled=${cfg.stepEnabled}  (whether the behaviour was actually applied)`)
  lines.push('')
  const legs = [...new Set(evs.map((e) => e.leg))]
  const prims = ['grip', 'sweep', 'lift']
  const intervalsOf = (leg, prim) => {
    const seq = evs.filter((e) => e.leg === leg && e.primitive === prim)
    const out = []
    let open = null
    for (const e of seq) {
      if (e.edge === 'start') open = e
      else if (e.edge === 'end' && open) { out.push([open.t, e.t]); open = null }
    }
    return out
  }
  lines.push('## ON intervals per leg × primitive  [tStart → tEnd  (dur)]')
  for (const leg of legs) {
    lines.push(`\n### ${leg}`)
    for (const prim of prims) {
      const intervals = intervalsOf(leg, prim)
      const txt = intervals.map(([a, b]) => `[${f(a, 2)}→${f(b, 2)} (${f(b - a, 2)}s)]`).join(' ')
      const label = prim === 'sweep' ? 'sweepBack' : prim === 'lift' ? 'sweepFwd' : prim
      lines.push(`${label.padEnd(9)}: ${txt || '(no complete interval)'}`)
    }
  }
  lines.push('')
  // Sync check: the backward sweep window should coincide with the grip window (both open at the grip
  // start and close at the grip end). Compare each grip interval to the nearest sweepBack interval.
  lines.push('## Sweep↔grip sync check (backward sweep should align with the grip window)')
  for (const leg of legs) {
    const grips = intervalsOf(leg, 'grip')
    const backs = intervalsOf(leg, 'sweep')
    if (!grips.length || !backs.length) { lines.push(`${leg}: (insufficient intervals)`); continue }
    let maxStart = 0, maxEnd = 0
    for (const [gs, ge] of grips) {
      const near = backs.reduce((best, iv) => (Math.abs(iv[0] - gs) < Math.abs(best[0] - gs) ? iv : best), backs[0])
      maxStart = Math.max(maxStart, Math.abs(near[0] - gs))
      maxEnd = Math.max(maxEnd, Math.abs(near[1] - ge))
    }
    const ok = maxStart < 0.05 && maxEnd < 0.05
    lines.push(`${leg}: max start Δ=${f(maxStart, 3)}s  max end Δ=${f(maxEnd, 3)}s  → ${ok ? 'IN SYNC' : 'OUT OF SYNC'}`)
  }
  lines.push('')
  lines.push('## Raw edge list')
  lines.push('t       leg  primitive edge   rel    phase')
  for (const e of evs) {
    lines.push(`${f(e.t, 3).padStart(7)}  ${e.leg.padEnd(4)} ${e.primitive.padEnd(9)} ${e.edge.padEnd(5)} ${f(e.rel, 3).padStart(6)} ${f(e.phase, 3).padStart(6)}`)
  }
  writeFileSync(path, lines.join('\n') + '\n')
}

// Grip/sweep timing validation. The controller now clocks off the MEASURED undulation phase (0 =
// max-forward foot reach). Here we project the ACTUAL foot reach onto that same phase: if the phase
// estimator is right, max-forward reach lands at φ_fwd ≈ 0 for every leg, so a grip window at
// gripShift=0 opens at max-forward and (gripDuration 0.5) releases at max-backward — for any drive/muscle.
function reportReach(path, reach, legs, cfg) {
  const TWO_PI = Math.PI * 2
  const wrap01 = (x) => ((x % 1) + 1) % 1
  // signed cyclic distance in cycles, in (−0.5, 0.5]
  const cdistSigned = (a, b) => { let d = wrap01(a) - wrap01(b); if (d > 0.5) d -= 1; if (d <= -0.5) d += 1; return d }
  const cdist = (a, b) => Math.abs(cdistSigned(a, b))
  const rows = []
  let sumSin = 0, sumCos = 0 // amplitude-weighted circular mean of φ_fwd
  for (let h = 0; h < reach.length; h++) {
    const r = reach[h]
    if (!r || r.n === 0) continue
    const phiFwdRad = Math.atan2(r.s, r.c)
    const phiFwd = wrap01(phiFwdRad / TWO_PI)
    const amp = Math.hypot(r.c, r.s) / r.n // first-harmonic amplitude of fore-aft reach (world units)
    sumSin += amp * Math.sin(phiFwdRad); sumCos += amp * Math.cos(phiFwdRad)
    rows.push({ leg: legs[h] ?? `L${h}`, phiFwd, amp, rawMax: r.phiAtMax, rawMin: r.phiAtMin, n: r.n })
  }
  const meanFwd = wrap01(Math.atan2(sumSin, sumCos) / TWO_PI)
  const ampMax = Math.max(...rows.map((r) => r.amp), 1e-9)
  // spread among legs that actually reach (amp ≥ 25% of the strongest); low-amplitude front legs are noise.
  const spread = Math.max(...rows.filter((r) => r.amp >= 0.25 * ampMax).map((r) => cdist(r.phiFwd, meanFwd)), 0)

  const gripShift = cfg.gripShift, gripDuration = cfg.gripDuration
  const startErr = cdistSigned(gripShift, meanFwd)          // grip opens at gripShift; want meanFwd (≈0)
  const endErr = cdistSigned(gripShift + gripDuration, wrap01(meanFwd + 0.5))

  const f = (x, d = 3) => Number(x).toFixed(d)
  const lines = []
  lines.push('# Grip/sweep timing validation (measured-undulation clock)')
  lines.push(`generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('Controller clocks off the foot\'s MEASURED reach phase (0 = max-forward). Below, the ACTUAL')
  lines.push('foot reach is projected onto that phase: φ_fwd ≈ 0 means max-forward reach lands at phase 0,')
  lines.push('so grip/sweep at gripShift≈0 open exactly at max-forward reach. Observed with grip+step OFF.')
  lines.push('')
  lines.push('leg   φ_fwd  amp     rawMaxφ rawMinφ  samples   (φ_fwd≈0 = aligned)')
  for (const r of rows) {
    lines.push(`${r.leg.padEnd(4)} ${f(r.phiFwd).padStart(6)} ${f(r.amp).padStart(6)}  ${f(r.rawMax).padStart(6)} ${f(r.rawMin).padStart(7)}  ${String(r.n).padStart(6)}`)
  }
  lines.push('')
  lines.push(`amplitude-weighted mean φ_fwd = ${f(meanFwd)}   per-leg spread = ${f(spread)} cycles  (both ≈0 = estimator good)`)
  lines.push('')
  lines.push('## Current config alignment:')
  lines.push(`   gripShift=${f(gripShift)}  → grip/sweep open at max-forward off by ${f(startErr)} cycles (want 0)`)
  lines.push(`   gripDuration=${f(gripDuration)} → grip/sweep close at max-backward off by ${f(endErr)} cycles (want 0; gripDuration 0.5 = exact half)`)
  writeFileSync(path, lines.join('\n') + '\n')

  console.log(`reach: meanφ_fwd=${f(meanFwd)} spread=${f(spread)} (≈0=aligned) | gripShift off-by start=${f(startErr)} end=${f(endErr)} | ${rows.map((r) => `${r.leg}:${f(r.phiFwd, 2)}`).join(' ')}`)
}

async function renderEventSnapshots(path, evs, dump) {
  const withNodes = evs.filter((e) => e.nodes)
  const CAP = 48
  const truncated = withNodes.length > CAP
  const picks = withNodes.slice(0, CAP)
  let xl = Infinity, xh = -Infinity, zl = Infinity, zh = -Infinity
  for (const e of picks) for (const nd of e.nodes) {
    if (nd.x < xl) xl = nd.x; if (nd.x > xh) xh = nd.x
    if (nd.z < zl) zl = nd.z; if (nd.z > zh) zh = nd.z
  }
  const pad = 0.1 * Math.max(xh - xl, zh - zl, 0.5)
  xl -= pad; xh += pad; zl -= pad; zh += pad
  const W = 240, H = 170
  const sx = (x) => ((x - xl) / (xh - xl)) * W
  const sz = (z) => ((z - zl) / (zh - zl)) * H
  const COLOR = { grip: '#58c4ff', sweep: '#7ee787', lift: '#ffa657' }
  const cells = picks.map((e) => {
    const d = e.nodes.map((nd, i) => `${i ? 'L' : 'M'}${sx(nd.x).toFixed(1)},${sz(nd.z).toFixed(1)}`).join(' ')
    const dots = e.nodes.map((nd) => `<circle cx="${sx(nd.x).toFixed(1)}" cy="${sz(nd.z).toFixed(1)}" r="2.2" fill="#ffd34d"/>`).join('')
    const stroke = COLOR[e.primitive] ?? '#fff'
    return `<div style="position:relative">
      <svg width="${W}" height="${H}" style="background:#0d1117;display:block">
        <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#30363d"/>
        <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2"/>${dots}
        <circle cx="${sx(e.nodes[0].x).toFixed(1)}" cy="${sz(e.nodes[0].z).toFixed(1)}" r="3.6" fill="#ff5d5d"/>
      </svg>
      <div style="position:absolute;top:2px;left:4px;font-size:11px;color:${stroke}">${e.leg} ${e.primitive} ${e.edge}</div>
      <div style="position:absolute;bottom:2px;left:4px;font-size:10px;color:#8b949e">t=${e.t.toFixed(2)}s</div>
    </div>`
  }).join('')
  const html = `<html><body style="margin:0;background:#161b22;font-family:monospace;color:#c9d1d9;padding:10px">
    <div style="font-size:13px;margin-bottom:6px">Node skeleton at primitive-window boundaries — top-down (X→ horizontal, Z↓ vertical). Red = head. Colour = primitive (grip=blue, sweep=green, lift=orange).${truncated ? ` <span style="color:#ffa657">[showing first ${CAP} of ${withNodes.length} events]</span>` : ''}</div>
    <div style="display:grid;grid-template-columns:repeat(4,${W}px);gap:8px">${cells}</div>
  </body></html>`
  const p2 = await ctx.newPage()
  await p2.setContent(html)
  await p2.waitForTimeout(250)
  await p2.screenshot({ path, fullPage: true })
  await p2.close()
}

async function buildContactSheet(path, rows) {
  const step = Math.max(1, Math.ceil(rows.length / 8))
  const pick = rows.filter((_, i) => i % step === 0)
  const dataUrl = (f) => 'data:image/png;base64,' + readFileSync(`${OUT}/${f}`).toString('base64')
  const html = `<html><body style="margin:0;background:#222;font-family:monospace;color:#ddd">
  <div style="display:grid;grid-template-columns:120px repeat(${ANGLES.length},1fr);gap:2px">
    <div></div>${ANGLES.map((a) => `<div style="text-align:center;padding:4px">${a}</div>`).join('')}
    ${pick.map((r) => `
      <div style="font-size:11px;padding:4px">t=${r.t}s<br>KE=${r.d.kineticEnergy.toExponential(1)}<br>drift=${r.d.comDriftFromStart.toFixed(2)}<br>maxJ=${Math.round(r.d.maxJointFracOfCap * 100)}%</div>
      ${ANGLES.map((a) => `<img src="${dataUrl(r.files[a])}" style="width:100%;display:block">`).join('')}
    `).join('')}
  </div></body></html>`
  const p2 = await ctx.newPage()
  await p2.setContent(html)
  await p2.waitForTimeout(300)
  await p2.screenshot({ path, fullPage: true })
  await p2.close()
}

await browser.close()
