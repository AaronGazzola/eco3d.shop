// Top-down simplified-skeleton slideshow. For each of three conditions (undulation-only, sweep-only,
// both) it drives the sim, captures the trunk polyline + feet (with grip/stance state) across ~one
// gait cycle, and renders a left-to-right row of top-down skeletons. Pinned feet = green, swing = red,
// in-stance-not-pinned = amber. Forward (-X) points up; lateral (Z) is horizontal. Emits PNGs (for AI
// review) and a landscape PDF (for the user) under documentation/diagnostics/skeleton/.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/skeleton'
function findChromium() {
  try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = platform() === 'win32' ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright')
  for (const d of readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse())
    for (const e of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-linux', 'chrome')]) if (existsSync(e)) return e
  throw new Error('no chromium')
}
const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false))
  for (const t of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(t)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })

const ONE = { FL: true, FR: false, BL: false, BR: false }
async function capture(cfg) {
  const link = await page.evaluate((cfg) => {
    window.__studio.drive(false)
    if (!window.__studio.preset('Walk — mid')) window.__studio.preset('Walk — mid')
    window.__studio.apply(cfg)
    window.__studio.setOverlays(['stance', 'wave'])
    window.__studio.isolateLimb('FL')
    window.__studio.drive(true)
    return window.__studio.buildLink()
  }, cfg)
  console.log(`LINK ${link}`)
  await sleep(2000)
  const raw = []
  for (let i = 0; i < 60; i++) {
    const s = await page.evaluate(() => {
      const o = window.__locObs
      return o ? { t: window.__studio.getSimTime(), trunk: o.trunk.map((p) => ({ x: p.x, z: p.z })), legs: o.legs.slice(), foot: o.foot.map((p) => ({ x: p.x, z: p.z })), gripped: o.gripped.slice(), stance: o.stance.slice() } : null
    })
    if (s) raw.push(s)
    await sleep(55)
  }
  await page.evaluate(() => window.__studio.drive(false))
  // pick evenly spaced frames
  const N = 5, frames = []
  for (let k = 0; k < N; k++) frames.push(raw[Math.floor((k * (raw.length - 1)) / (N - 1))])
  return frames
}

const SIZE = 200
function boundsOf(frames) {
  let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity
  for (const f of frames) for (const p of [...f.trunk, ...f.foot]) { xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z) }
  const pad = 16, span = Math.max(xmax - xmin, zmax - zmin, 1), scale = (SIZE - 2 * pad) / span
  const cz = (zmin + zmax) / 2, cx = (xmin + xmax) / 2
  return { sx: (z) => SIZE / 2 + (z - cz) * scale, sy: (x) => SIZE / 2 + (x - cx) * scale }
}
function frameCell(f, b) {
  const COL = (i) => f.gripped[i] ? '#22c55e' : (f.stance[i] ? '#f59e0b' : '#f87171')
  const poly = f.trunk.map((p) => `${b.sx(p.z).toFixed(1)},${b.sy(p.x).toFixed(1)}`).join(' ')
  const feet = f.foot.map((p, i) => `<circle cx="${b.sx(p.z).toFixed(1)}" cy="${b.sy(p.x).toFixed(1)}" r="7" fill="${COL(i)}"/><text x="${(b.sx(p.z) + 8).toFixed(1)}" y="${(b.sy(p.x) - 8).toFixed(1)}" font-size="13" fill="#e5e7eb">${f.legs[i]}</text>`).join('')
  const pin = f.legs.filter((_, i) => f.gripped[i]).join(',') || '-'
  return `<div class="frame"><svg width="${SIZE}" height="${SIZE}">
    <polyline points="${poly}" fill="none" stroke="#c4b5fd" stroke-width="3"/>
    ${f.trunk.map((p) => `<circle cx="${b.sx(p.z).toFixed(1)}" cy="${b.sy(p.x).toFixed(1)}" r="3" fill="#c4b5fd"/>`).join('')}
    ${feet}
  </svg><div class="cap">t=${f.t.toFixed(2)}s &nbsp; pin: ${pin}</div></div>`
}
const cenX = (fr) => { let x = 0; for (const p of fr.trunk) x += p.x; return x / fr.trunk.length }

const conditions = [
  { key: 'undulation', title: 'A. Undulation only', sub: 'FL pinned, no sweep, body waves', cfg: { stepEnabled: false, gripEnabled: true, gripFeet: ONE, legClock: 'body', muscleAlpha: 22, stanceMuscleBoost: 0 },
    bullets: ['Body still undulates while FL is pinned', 'One foot + wave alone barely moves it'] },
  { key: 'sweep', title: 'B. Sweep only', sub: 'straight body, FL grips + sweeps', cfg: { stepEnabled: true, gripEnabled: true, gripFeet: ONE, legClock: 'limb', muscleAlpha: 0, stanceMuscleBoost: 0 },
    bullets: ['Spine held straight (no wave)', 'Straight body + pin = locked', 'Leg sweep alone barely moves it'] },
  { key: 'both', title: 'C. Both (limb clock)', sub: 'FL grips + sweeps AND body waves', cfg: { stepEnabled: true, gripEnabled: true, gripFeet: ONE, legClock: 'limb', muscleAlpha: 22, stanceMuscleBoost: 0 },
    bullets: ['On the limb clock the timing is off', 'So FL can push the body BACKWARD', 'Phase (gripShift) must be retuned'] },
]

const EXPL = [
  'SINGLE FRONT-LEFT FOOT ONLY (forward = up; net forward over ~3.6s):',
  '  A. Undulation only ~0.02 u/s (about none). The body still undulates with FL pinned, but one pinned foot + the wave alone nets almost no forward motion.',
  '  B. Sweep only ~-0.04 u/s (about none). Straight body (alpha 0): FL sweeps over the pin but the body barely moves — a straight body + a pin is effectively locked.',
  '  C. Both on the LIMB clock ~-0.33 u/s = BACKWARD. With the limb-CPG clock the grip/sweep phase (gripShift/stepShift, tuned for the body-wave clock) is misaligned, so FL grips/sweeps at the wrong moment and pushes the body backward.',
  '  Reference: the same single foot on the BODY-WAVE clock (grip+sweep+undulation) pulls FORWARD about 0.7 u/s — so the mechanism CAN pull; the phase is the lever.',
  '',
  'WHY: forward motion needs BOTH (a) the body free to shift over the pin (undulation; a straight body locks) AND (b) the foot to grip near max-forward reach and sweep back IN PHASE. Changing the clock changes that phase, so the grip/sweep offset must be retuned to it; untuned, the foot works backward.',
  '',
  'PLAN:',
  '  1. Stay on a single foot. Sweep gripShift/stepShift to find the offset where FL grips at max-forward and sweeps back, giving clear, repeatable FORWARD motion.',
  '  2. Verify each FL step nets the body forward (skeleton + drift), convex at grip start to concave at release.',
  '  3. Only then add the contralateral foot, re-checking the gate.',
].join('\n')
const sections = []
for (const c of conditions) {
  const frames = await capture(c.cfg)
  writeFileSync(join(OUT, `${c.key}-${ts}.json`), JSON.stringify(frames))
  const dt = frames[frames.length - 1].t - frames[0].t
  const spd = -(cenX(frames[frames.length - 1]) - cenX(frames[0])) / dt
  const verdict = Math.abs(spd) < 0.1 ? `about none (${spd.toFixed(2)} u/s)` : (spd < 0 ? `BACKWARD (${spd.toFixed(2)} u/s)` : `forward (${spd.toFixed(2)} u/s)`)
  const vcls = Math.abs(spd) < 0.1 ? 'none' : (spd < 0 ? 'bad' : 'good')
  const b = boundsOf(frames)
  const cells = frames.map((f, i) => `<div class="stag" style="margin-left:${i * 30}px">${frameCell(f, b)}</div>`).join('')
  sections.push(`<section>
    <div class="ntitle">${c.title}</div>
    <div class="sub">${c.sub}</div>
    ${c.bullets.map((x) => `<div class="b">• ${x}</div>`).join('')}
    <div class="res ${vcls}">Net: ${verdict}</div>
    <div class="cascade">${cells}</div>
  </section>`)
}

// Vertical layout for a narrow (~400px) screen: large /plain notes, frames cascading staggered down.
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box}
 body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:460px}
 h1{font-size:27px;margin:0 0 4px;line-height:1.1;color:#fff} .lead{font-size:16px;color:#9ca3af;margin:0 0 8px;line-height:1.3}
 .legend{font-size:15px;color:#d1d5db;margin:0 0 12px;line-height:1.4}
 section{border-top:3px solid #27272a;padding:12px 0 6px;margin-top:6px}
 .ntitle{font-size:25px;font-weight:800;line-height:1.1;color:#fff}
 .sub{font-size:16px;color:#9ca3af;margin:1px 0 6px}
 .b{font-size:19px;line-height:1.35;margin:1px 0;color:#e5e7eb}
 .res{font-size:20px;font-weight:800;margin:8px 0;padding:4px 9px;border-radius:7px;display:inline-block}
 .res.good{background:#14532d;color:#bbf7d0} .res.bad{background:#7f1d1d;color:#fecaca} .res.none{background:#1e293b;color:#cbd5e1}
 .cascade{display:flex;flex-direction:column;gap:4px;margin-top:4px}
 .frame svg{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px;display:block}
 .cap{font-size:14px;color:#9ca3af;margin:1px 0 4px}
 .expl{font-size:16px;border-top:3px solid #27272a;margin-top:10px;padding-top:10px;white-space:pre-wrap;line-height:1.4;color:#e5e7eb}
</style></head><body>
 <h1>Walking: single front-left foot</h1>
 <div class="lead">Top-down skeletons. Forward = up, lateral = across. Read each cascade top to bottom (one gait cycle).</div>
 <div class="legend">Feet: <b style="color:#22c55e">green = pinned</b>, <b style="color:#f59e0b">amber = stance window</b>, <b style="color:#f87171">red = swing</b>. Purple = spine.</div>
 ${sections.join('')}
 <div class="expl">${EXPL}</div>
</body></html>`
const htmlPath = join(OUT, `skeleton-${ts}.html`)
writeFileSync(htmlPath, html)
const page2 = await ctx.newPage()
await page2.setViewportSize({ width: 460, height: 1200 })
await page2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await page2.evaluate(() => document.body.scrollHeight)
await page2.screenshot({ path: join(OUT, `skeleton-${ts}.png`), fullPage: true })
await page2.pdf({ path: join(OUT, `skeleton-${ts}.pdf`), printBackground: true, width: '460px', height: `${h + 24}px`, pageRanges: '1' })
await browser.close()
console.log('PNG + PDF + JSON written to', OUT, 'stamp', ts)
