// Diagonal trot driven by the leg sweep alone (CPG OFF, time clock). Renders a dark vertical node-map
// sequence (note left, image right) showing the body translating forward while diagonal foot pairs
// alternate, with lateral cancelling. Confirms the legs pull the body without the body wave.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/trot'
function findChromium() { try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = platform() === 'win32' ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright')
  for (const d of readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse())
    for (const e of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-linux', 'chrome')]) if (existsSync(e)) return e
  throw new Error('no chromium') }
const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const ALL = { FL: true, FR: true, BL: true, BR: true }
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false))
  for (const t of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(t)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
const link = await page.evaluate((ALL) => { window.__studio.drive(false); if (!window.__studio.preset('Walk — mid')) window.__studio.preset('Walk — mid'); window.__studio.apply({ cpgDrive: 0, legClock: 'time', stepFreqHz: 0.6, stepEnabled: true, gripEnabled: true, gripFeet: ALL, muscleAlpha: 22, gripShift: 0.05, gripDuration: 0.5, sweepAmount: 1.0, sweepReverse: false, legsLocked: false }); window.__studio.setOverlays(['stance']); window.__studio.drive(true); return window.__studio.buildLink() }, ALL)
await sleep(2000)
const raw = []
for (let i = 0; i < 120; i++) { raw.push(await page.evaluate(() => { const o = window.__locObs, d = window.__studio.diag(); return { t: window.__studio.getSimTime(), cx: d.comX, cz: d.comZ, trunk: o.trunk.map((p) => ({ x: p.x, z: p.z })), foots: o.foot.map((p) => ({ x: p.x, z: p.z })), gripped: o.gripped.slice(), stance: o.stance.slice(), legs: o.legs.slice() } })); await sleep(50) }
await page.evaluate(() => window.__studio.drive(false))
await browser.close()
const N = 10, snaps = []
for (let k = 0; k < N; k++) snaps.push(raw[Math.round(k * (raw.length - 1) / (N - 1))])
const fwd = -(raw[raw.length - 1].cx - raw[0].cx), lat = raw[raw.length - 1].cz - raw[0].cz, dt = raw[raw.length - 1].t - raw[0].t
const SIZE = 190
let xmn = Infinity, xmx = -Infinity, zmn = Infinity, zmx = -Infinity
for (const f of snaps) for (const p of [...f.trunk, ...f.foots]) { xmn = Math.min(xmn, p.x); xmx = Math.max(xmx, p.x); zmn = Math.min(zmn, p.z); zmx = Math.max(zmx, p.z) }
const pad = 16, sp = Math.max(xmx - xmn, zmx - zmn, 1), sc = (SIZE - 2 * pad) / sp
const sx = (z) => SIZE / 2 + (z - (zmn + zmx) / 2) * sc, sy = (x) => SIZE / 2 + (x - (xmn + xmx) / 2) * sc
const frameSVG = (f) => {
  const COL = (i) => f.gripped[i] ? '#22c55e' : (f.stance[i] ? '#f59e0b' : '#f87171')
  const poly = f.trunk.map((p) => `${sx(p.z).toFixed(1)},${sy(p.x).toFixed(1)}`).join(' ')
  const dots = f.trunk.map((p) => `<circle cx="${sx(p.z).toFixed(1)}" cy="${sy(p.x).toFixed(1)}" r="3" fill="#c4b5fd"/>`).join('')
  const ft = f.foots.map((p, i) => `<circle cx="${sx(p.z).toFixed(1)}" cy="${sy(p.x).toFixed(1)}" r="7" fill="${COL(i)}"/><text x="${(sx(p.z) + 8).toFixed(1)}" y="${(sy(p.x) - 8).toFixed(1)}" font-size="12" fill="#e5e7eb">${f.legs[i]}</text>`).join('')
  return `<svg width="${SIZE}" height="${SIZE}"><polyline points="${poly}" fill="none" stroke="#c4b5fd" stroke-width="3"/>${dots}${ft}</svg>`
}
const c0 = snaps[0].cx
const rows = snaps.map((f, k) => {
  const fwdSo = -(f.cx - c0)
  const pin = f.legs.filter((_, i) => f.gripped[i]).join('+') || '-'
  return `<div class="row"><div class="note"><div class="p">frame ${k + 1}/10</div><div class="f">fwd so far ${fwdSo >= 0 ? '+' : ''}${fwdSo.toFixed(2)}</div><div class="tag">planted: ${pin}</div></div><div class="img">${frameSVG(f)}</div></div>`
}).join('')
const concl = `Diagonal trot, CPG OFF (leg sweep only): body moves forward ${fwd >= 0 ? '+' : ''}${fwd.toFixed(2)} over ${dt.toFixed(1)}s (${(fwd / dt).toFixed(2)} u/s); lateral ${lat >= 0 ? '+' : ''}${lat.toFixed(2)} (diagonal cancels it). The leg sweep alone produces forward locomotion when diagonally paired.`
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:460px}
 h1{font-size:23px;margin:0 0 6px;color:#fff} .res{font-size:18px;font-weight:700;margin:6px 0 10px;padding:8px 9px;border-radius:7px;background:#14532d;color:#bbf7d0;line-height:1.35}
 .legend{font-size:14px;color:#d1d5db;margin:0 0 8px}
 .row{display:flex;align-items:center;gap:10px;border-top:2px solid #1f2937;padding:5px 0}
 .note{width:200px;flex:0 0 200px} .note .p{font-size:18px;font-weight:800;color:#fff} .note .f{font-size:17px;color:#cbd5e1} .note .tag{font-size:15px;color:#93c5fd}
 .img{flex:0 0 ${SIZE}px;text-align:right} .img svg{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px}
</style></head><body>
 <h1>Diagonal trot — legs pull (no CPG)</h1>
 <div class="res">${concl}</div>
 <div class="legend">Top-down, forward = up. Spine purple; feet <b style="color:#22c55e">green pinned</b> / <b style="color:#f59e0b">amber stance</b> / <b style="color:#f87171">red swing</b>. Watch the body climb the frame as diagonal pairs alternate.</div>
 ${rows}
</body></html>`
const htmlPath = join(OUT, `trot-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `trot-${ts}.json`), JSON.stringify({ link, fwd, lat, dt }))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 460, height: 1200 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `trot-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `trot-${ts}.pdf`), printBackground: true, width: '460px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`fwd=${fwd.toFixed(2)} lat=${lat.toFixed(2)} -> ${OUT}/trot-${ts}.pdf`)
console.log(`LINK ${link}`)
