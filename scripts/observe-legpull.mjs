// Single-leg pull test (step 2). PURE OBSERVATION — no sim-logic changes. Only FL grips (via the joint
// pin) and steps, on the VERIFIED timing (gripShift 0.07 from observe-phaselock); the other three feet
// slide (no grip). Question: does one planted+sweeping leg, timed to the undulation, pull the body
// FORWARD (-x) during its stance, with the foot staying pinned — or does it just writhe/veer? A single
// anchor cannot stop yaw, so some lateral veer is expected; we care about net forward + per-stance pull.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/legpull'
function findChromium() { try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = platform() === 'win32' ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright')
  for (const d of readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse())
    for (const e of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-linux', 'chrome')]) if (existsSync(e)) return e
  throw new Error('no chromium') }
const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const FL_ONLY = { FL: true, FR: false, BL: false, BR: false }
const cfg = { gravityEnabled: true, landLegsEnabled: true, landGroundEnabled: true, limbCpgEnabled: true, legsLocked: false, environmentEnabled: false,
  cpgDrive: 1.87, cpgExcitability: 0.24, muscleAlpha: 3.95, muscleBeta: 13.3, muscleDamping: 11.3,
  bodyFriction: 0.05, legFriction: 0.05, releaseFriction: 0, gripEnabled: true, gripShift: 0.07, gripDuration: 0.5, gripFeet: FL_ONLY,
  stepEnabled: true, sweepAmount: 0.5, sweepSpeed: 3000, liftAmount: 0.3, legStiffness: 3000, legDamping: 120 }

const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false))
  for (const t of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(t)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
const link = await page.evaluate((cfg) => { window.__studio.drive(false); window.__studio.apply(cfg); window.__studio.isolateLimb('FL'); window.__studio.setOverlays(['stance']); window.__studio.drive(true); return window.__studio.buildLink() }, cfg)
await sleep(2500)

const raw = []
for (let i = 0; i < 340; i++) {
  raw.push(await page.evaluate(() => {
    const o = window.__locObs, d = window.__studio.diag()
    if (!o || !o.legs.length) return null
    const j = o.legs.indexOf('FL') < 0 ? 0 : o.legs.indexOf('FL')
    return { t: window.__studio.getSimTime(), comX: d.comX, comZ: d.comZ, gripped: o.gripped[j], stance: o.stance[j], footX: o.foot[j].x, footZ: o.foot[j].z }
  }))
  await sleep(45)
}
await page.evaluate(() => window.__studio.drive(false))
await browser.close()

const f = raw.filter(Boolean)
if (f.length < 40) { console.log('no data'); process.exit(1) }
const dur = f[f.length - 1].t - f[0].t
// Net motion. Forward = -x. netFwd > 0 means the body advanced.
const netFwd = -(f[f.length - 1].comX - f[0].comX)
const netLat = f[f.length - 1].comZ - f[0].comZ
const fwdPerSec = netFwd / Math.max(dur, 1e-6)
// Per-grip intervals: forward gained during each FL stance, and foot slip while pinned.
const grips = []
let cur = null
for (let i = 0; i < f.length; i++) {
  if (f[i].gripped && !cur) cur = [i]
  else if (!f[i].gripped && cur) { cur.push(i - 1); if (cur[1] - cur[0] >= 3) grips.push(cur); cur = null }
}
if (cur && f.length - 1 - cur[0] >= 3) grips.push([cur[0], f.length - 1])
const stanceFwd = grips.map(([a, b]) => -(f[b].comX - f[a].comX))
const slips = grips.map(([a, b]) => { let mx = 0; for (let i = a; i <= b; i++) { const dx = f[i].footX - f[a].footX, dz = f[i].footZ - f[a].footZ; mx = Math.max(mx, Math.hypot(dx, dz)) } return mx })
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
const avgStanceFwd = mean(stanceFwd)
const fwdCount = stanceFwd.filter((v) => v > 0).length
const slipAvg = mean(slips)
const footAmp = (() => { const xs = f.map((s) => s.comX); return (Math.max(...xs) - Math.min(...xs)) })()

// --- render: top-down COM path + per-stance forward bars ---
const P = 300, PAD = 26
const zs = f.map((s) => s.comZ), fw = f.map((s) => -s.comX)
const zmn = Math.min(...zs), zmx = Math.max(...zs), fmn = Math.min(...fw), fmx = Math.max(...fw)
const span = Math.max(zmx - zmn, fmx - fmn, 0.5)
const sc = (P - 2 * PAD) / span
const px = (z) => PAD + (z - (zmn + zmx) / 2) * sc + (P - 2 * PAD) / 2
const py = (v) => P - (PAD + (v - (fmn + fmx) / 2) * sc + (P - 2 * PAD) / 2)
const path = f.map((s, i) => `${i ? 'L' : 'M'}${px(s.comZ).toFixed(1)},${py(-s.comX).toFixed(1)}`).join(' ')
const gripDots = f.filter((s) => s.gripped).map((s) => `<circle cx="${px(s.comZ).toFixed(1)}" cy="${py(-s.comX).toFixed(1)}" r="1.6" fill="#22c55e"/>`).join('')
const pathSVG = `<svg width="${P}" height="${P}">
  <line x1="${PAD}" y1="${py(-f[0].comX).toFixed(1)}" x2="${P - PAD}" y2="${py(-f[0].comX).toFixed(1)}" stroke="#3f3f46" stroke-dasharray="3 3"/>
  <path d="${path}" fill="none" stroke="#64748b" stroke-width="1.5"/>${gripDots}
  <circle cx="${px(f[0].comZ).toFixed(1)}" cy="${py(-f[0].comX).toFixed(1)}" r="4" fill="#f87171"/>
  <circle cx="${px(f[f.length-1].comZ).toFixed(1)}" cy="${py(-f[f.length-1].comX).toFixed(1)}" r="4" fill="#22d3ee"/>
  <text x="6" y="14" fill="#9ca3af" font-size="10">forward ↑   green = FL gripped</text>
  <text x="6" y="${P-8}" fill="#f87171" font-size="10">● start</text>
  <text x="${P-52}" y="${P-8}" fill="#22d3ee" font-size="10">● end</text>
</svg>`
const BW = 300, BH = 90, bx = (i) => 20 + i * ((BW - 28) / Math.max(stanceFwd.length, 1)), bmax = Math.max(...stanceFwd.map(Math.abs), 1e-6)
const bars = stanceFwd.map((v, i) => { const h = (Math.abs(v) / bmax) * (BH / 2 - 6); const y0 = BH / 2; return `<rect x="${bx(i).toFixed(1)}" y="${(v >= 0 ? y0 - h : y0).toFixed(1)}" width="${((BW - 28) / Math.max(stanceFwd.length, 1) - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${v >= 0 ? '#22c55e' : '#f87171'}"/>` }).join('')
const barsSVG = `<svg width="${BW}" height="${BH}"><line x1="14" y1="${BH/2}" x2="${BW-6}" y2="${BH/2}" stroke="#3f3f46"/>${bars}<text x="2" y="12" fill="#22c55e" font-size="9">fwd</text><text x="2" y="${BH-4}" fill="#f87171" font-size="9">back</text></svg>`

const verdict = netFwd > 0.15 && avgStanceFwd > 0 && slipAvg < 0.15 ? 'FL PULLS FORWARD' : netFwd > 0.05 ? 'weak / noisy forward' : 'NO net forward pull'
const concl = `${verdict}. Net forward ${netFwd.toFixed(2)} over ${dur.toFixed(0)}s (${fwdPerSec.toFixed(2)} u/s); lateral veer ${netLat.toFixed(2)} (a single anchor cannot stop yaw). Per-stance: ${fwdCount}/${stanceFwd.length} grips advanced the body, avg ${avgStanceFwd.toFixed(3)} each. Foot pin slip ${slipAvg.toFixed(3)} (low = holds).`
const row = (k, v, s) => `<div class="row"><div class="k">${k}</div><div class="v">${v}${s ? `<span class="s"> ${s}</span>` : ''}</div></div>`
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:334px}
 h1{font-size:18px;margin:0 0 6px;color:#fff} .res{font-size:14px;font-weight:700;margin:6px 0 10px;padding:8px 9px;border-radius:7px;background:#1e293b;color:#cbd5e1;line-height:1.35}
 .cap{font-size:12px;color:#9ca3af;margin:10px 0 2px}
 .chart{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px;padding:4px;text-align:center}
 .row{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #1f2937;padding:5px 2px;font-size:13px}
 .k{color:#9ca3af} .v{color:#f3f4f6;font-weight:700;text-align:right} .v .s{color:#6b7280;font-weight:400;font-size:11px}
</style></head><body>
 <h1>FL single-leg pull test</h1>
 <div class="res">${concl}</div>
 <div class="cap">Top-down COM path (forward = up). Green dots = FL gripping. Straight up = pure forward; sideways = veer.</div>
 <div class="chart">${pathSVG}</div>
 <div class="cap">Forward gained during each FL stance (green = advanced, red = went backward).</div>
 <div class="chart">${barsSVG}</div>
 ${row('Net forward', netFwd.toFixed(2), `${fwdPerSec.toFixed(2)} u/s`)}
 ${row('Lateral veer', netLat.toFixed(2), 'expected for 1 foot')}
 ${row('Stances advancing', `${fwdCount}/${stanceFwd.length}`, 'forward per grip')}
 ${row('Avg per-stance fwd', avgStanceFwd.toFixed(3), '')}
 ${row('Foot pin slip', slipAvg.toFixed(3), 'low = holds')}
</body></html>`
const htmlPath = join(OUT, `legpull-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `legpull-${ts}.json`), JSON.stringify({ link, netFwd, netLat, fwdPerSec, avgStanceFwd, fwdCount, stances: stanceFwd.length, slipAvg }, null, 2))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 334, height: 900 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `legpull-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `legpull-${ts}.pdf`), printBackground: true, width: '334px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`netFwd ${netFwd.toFixed(2)} (${fwdPerSec.toFixed(2)}u/s) lat ${netLat.toFixed(2)} stancesFwd ${fwdCount}/${stanceFwd.length} slip ${slipAvg.toFixed(3)} -> ${OUT}/legpull-${ts}.pdf`)
console.log(`link: ${link}`)
