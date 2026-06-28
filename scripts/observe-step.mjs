// Drill into ONE foot's grip window. Captures many FL grip windows (foot-down to foot-up), takes 10
// evenly-spaced top-down skeleton snapshots per window, compares the windows, concludes whether the
// planted foot pulls the body forward, picks the step closest to the median (most representative), and
// renders it as a DARK vertical aid: concise note on the LEFT, image aligned on the RIGHT, per snapshot.
// Forward = up (-X). Output under documentation/diagnostics/step/.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/step'
const FOOT = (process.argv[2] || 'FL')
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
const ctx = await browser.newContext({ viewport: { width: 700, height: 700 }, ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false))
  for (const t of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(t)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })

// One foot of the actual walk: FL grips + sweeps on the body-wave clock while the body undulates.
const feet = { FL: false, FR: false, BL: false, BR: false }; feet[FOOT] = true
const link = await page.evaluate(({ feet }) => {
  window.__studio.drive(false)
  if (!window.__studio.preset('Walk — mid')) window.__studio.preset('Walk — mid')
  window.__studio.apply({ stepEnabled: true, gripEnabled: true, gripFeet: feet, legClock: 'body', muscleAlpha: 22, stanceMuscleBoost: 0 })
  window.__studio.setOverlays(['stance', 'wave'])
  window.__studio.drive(true)
  return window.__studio.buildLink()
}, { feet })
await sleep(1500)

// High-rate capture (~20 Hz, 16 s) of the foot's state + body skeleton + COM.
const fi = ['FL', 'FR', 'BL', 'BR'].indexOf(FOOT)
const raw = []
for (let i = 0; i < 320; i++) {
  const s = await page.evaluate((fi) => {
    const o = window.__locObs; const d = window.__studio.diag()
    return o ? { t: window.__studio.getSimTime(), g: o.gripped[fi], cx: d.comX, cz: d.comZ,
      trunk: o.trunk.map((p) => ({ x: p.x, z: p.z })), foot: { x: o.foot[fi].x, z: o.foot[fi].z }, legs: o.legs.slice(), gripped: o.gripped.slice(), stance: o.stance.slice(),
      foots: o.foot.map((p) => ({ x: p.x, z: p.z })) } : null
  }, fi)
  if (s) raw.push(s)
  await sleep(50)
}
await page.evaluate(() => window.__studio.drive(false))
await browser.close()

// Segment into grip windows (contiguous gripped==true), keep complete ones.
const windows = []
let cur = null
for (let i = 0; i < raw.length; i++) {
  if (raw[i].g && !cur) cur = [i]
  else if (!raw[i].g && cur) { cur.push(i); if (cur[1] - cur[0] >= 5) windows.push(cur); cur = null }
}
const fwdOf = (w) => -(raw[w[1]].cx - raw[w[0]].cx)            // forward = -X
const slipOf = (w) => { let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity; for (let i = w[0]; i <= w[1]; i++) { const f = raw[i].foot; mnx = Math.min(mnx, f.x); mxx = Math.max(mxx, f.x); mnz = Math.min(mnz, f.z); mxz = Math.max(mxz, f.z) } return Math.hypot(mxx - mnx, mxz - mnz) }
if (windows.length === 0) { console.log('no complete grip windows captured'); process.exit(1) }
const fwds = windows.map(fwdOf)
const sorted = [...fwds].sort((a, b) => a - b)
const median = sorted[Math.floor(sorted.length / 2)]
const mean = fwds.reduce((a, b) => a + b, 0) / fwds.length
const repIdx = fwds.map((v, i) => [Math.abs(v - median), i]).sort((a, b) => a[0] - b[0])[0][1]
const repW = windows[repIdx]
const slipMean = windows.reduce((a, w) => a + slipOf(w), 0) / windows.length

// 10 evenly-spaced snapshots across the representative window.
const N = 10
const snaps = []
for (let k = 0; k < N; k++) snaps.push(raw[repW[0] + Math.round((k * (repW[1] - repW[0])) / (N - 1))])

// where does the forward gain happen across the window (first/middle/last third)?
const cum = (i) => -(raw[repW[0] + Math.round(i)].cx - raw[repW[0]].cx)
const total = fwdOf(repW) || 1e-9
const span = repW[1] - repW[0]
const third = [cum(span / 3) / total, (cum(2 * span / 3) - cum(span / 3)) / total, (cum(span) - cum(2 * span / 3)) / total]
const thirdLabel = ['first', 'middle', 'last'][third.indexOf(Math.max(...third))]
const verdict = Math.abs(mean) < 0.05 ? 'the planted foot does NOT net-pull the body (about zero)'
  : mean < 0 ? 'the planted foot pushes the body BACKWARD during stance'
  : `the planted foot PULLS the body forward each stance (gain concentrated in the ${thirdLabel} third)`

// bounds across snaps for consistent scale
const SIZE = 190
function boundsOf(frames) {
  let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity
  for (const f of frames) for (const p of [...f.trunk, f.foot]) { xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z) }
  const pad = 16, sp = Math.max(xmax - xmin, zmax - zmin, 1), scale = (SIZE - 2 * pad) / sp
  const cz = (zmin + zmax) / 2, cx = (xmin + xmax) / 2
  return { sx: (z) => SIZE / 2 + (z - cz) * scale, sy: (x) => SIZE / 2 + (x - cx) * scale }
}
const b = boundsOf(snaps)
function frameSVG(f) {
  const COL = (i) => f.gripped[i] ? '#22c55e' : (f.stance[i] ? '#f59e0b' : '#f87171')
  const poly = f.trunk.map((p) => `${b.sx(p.z).toFixed(1)},${b.sy(p.x).toFixed(1)}`).join(' ')
  const dots = f.trunk.map((p) => `<circle cx="${b.sx(p.z).toFixed(1)}" cy="${b.sy(p.x).toFixed(1)}" r="3" fill="#c4b5fd"/>`).join('')
  const ft = f.foots.map((p, i) => `<circle cx="${b.sx(p.z).toFixed(1)}" cy="${b.sy(p.x).toFixed(1)}" r="7" fill="${COL(i)}"/><text x="${(b.sx(p.z) + 8).toFixed(1)}" y="${(b.sy(p.x) - 8).toFixed(1)}" font-size="12" fill="#e5e7eb">${f.legs[i]}</text>`).join('')
  return `<svg width="${SIZE}" height="${SIZE}"><polyline points="${poly}" fill="none" stroke="#c4b5fd" stroke-width="3"/>${dots}${ft}</svg>`
}

// per-snapshot concise note
const c0 = snaps[0].cx
const rows = snaps.map((f, k) => {
  const pct = Math.round((k / (N - 1)) * 100)
  const fwd = -(f.cx - c0)
  const dprev = k === 0 ? 0 : -(f.cx - snaps[k - 1].cx)
  const tag = k === 0 ? 'foot plants at forward reach' : k === N - 1 ? 'foot releases' : (dprev > 0.02 ? 'body moves forward over foot' : dprev < -0.02 ? 'body slips back' : 'body stalls')
  const star = Math.abs(dprev) > Math.abs(total) / N ? ' ★' : ''
  return `<div class="row"><div class="note"><div class="p">${pct}% of stance${star}</div><div class="f">fwd so far ${fwd >= 0 ? '+' : ''}${fwd.toFixed(2)}</div><div class="tag">${tag}</div></div><div class="img">${frameSVG(f)}</div></div>`
}).join('')

const stepList = fwds.map((v, i) => `${i === repIdx ? '►' : ''}${(v >= 0 ? '+' : '') + v.toFixed(2)}`).join('  ')
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box}
 body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:460px}
 h1{font-size:24px;margin:0 0 4px;color:#fff;line-height:1.1}
 .concl{font-size:18px;background:#111827;border:1px solid #374151;border-radius:8px;padding:10px;margin:8px 0 6px;line-height:1.35}
 .concl b{color:#fff} .v{font-weight:800;font-size:19px;color:#fde68a;display:block;margin-top:4px}
 .meta{font-size:14px;color:#9ca3af;margin:0 0 10px;line-height:1.4}
 .legend{font-size:14px;color:#d1d5db;margin:0 0 8px}
 .row{display:flex;align-items:center;gap:10px;border-top:2px solid #1f2937;padding:6px 0}
 .note{width:210px;flex:0 0 210px}
 .note .p{font-size:19px;font-weight:800;color:#fff} .note .f{font-size:17px;color:#cbd5e1} .note .tag{font-size:16px;color:#93c5fd;line-height:1.25;margin-top:2px}
 .img{flex:0 0 ${SIZE}px;text-align:right} .img svg{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px;display:inline-block}
</style></head><body>
 <h1>${FOOT} grip window — does the planted foot pull the body?</h1>
 <div class="concl"><b>Conclusion (${windows.length} steps compared):</b> mean forward per stance ${(mean>=0?'+':'')+mean.toFixed(2)}, range ${(Math.min(...fwds)>=0?'+':'')+Math.min(...fwds).toFixed(2)} to ${(Math.max(...fwds)>=0?'+':'')+Math.max(...fwds).toFixed(2)}; foot slip ${slipMean.toFixed(3)} (≈ held). <span class="v">${verdict}</span></div>
 <div class="meta">Per-step forward (► = step shown, closest to median): ${stepList}</div>
 <div class="legend">Top-down; forward = up. Feet: <b style="color:#22c55e">green pinned</b>, <b style="color:#f59e0b">amber stance</b>, <b style="color:#f87171">red swing</b>. ★ = frame with the biggest forward change.</div>
 ${rows}
</body></html>`
const htmlPath = join(OUT, `step-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `step-${ts}.json`), JSON.stringify({ link, fwds, mean, median, slipMean, repIdx, third }))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 460, height: 1200 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `step-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `step-${ts}.pdf`), printBackground: true, width: '460px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`steps=${windows.length} mean=${mean.toFixed(2)} shown=#${repIdx} -> ${OUT}/step-${ts}.pdf`)
console.log(`LINK ${link}`)
