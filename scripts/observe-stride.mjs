// One stride, up close. Captures the COMBINE walk, isolates one FL grip window (foot-down to up), takes
// 10 snapshots, and at each measures the FL-girdle BEND (signed curvature, + = convex toward the FL
// side, - = concave) so we can see whether the step goes convex-at-plant -> concave-at-release, plus the
// leg line (hip->foot) and forward progress. Dark vertical: note left, image right.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/stride'
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
const cfg = { gravityEnabled: true, landLegsEnabled: true, landGroundEnabled: true, limbCpgEnabled: false, legsLocked: false, environmentEnabled: false,
  cpgDrive: 1.0, cpgExcitability: 0.5, bodyWaves: 0.0, muscleAlpha: 14, muscleBeta: 35, muscleDamping: 6,
  bodyFriction: 0.05, legFriction: 0.6, releaseFriction: 0, gripEnabled: true, gripShift: 0.8, gripDuration: 0.5, gripFeet: ALL,
  stepEnabled: true, legClock: 'time', stepFreqHz: 0.55, sweepReverse: false, sweepAmount: 0.5, sweepSpeed: 37000, liftAmount: 0.25, legStiffness: 3000, legDamping: 120 }
const link = await page.evaluate((cfg) => { window.__studio.drive(false); if (!window.__studio.preset('Walk — mid')) window.__studio.preset('Walk — mid'); window.__studio.apply(cfg); window.__studio.setOverlays(['stance']); window.__studio.drive(true); return window.__studio.buildLink() }, cfg)
await sleep(2000)
const raw = []
for (let i = 0; i < 240; i++) { raw.push(await page.evaluate(() => { const o = window.__locObs, d = window.__studio.diag(); return { t: window.__studio.getSimTime(), cx: d.comX, g: o.gripped[0], trunk: o.trunk.map((p) => ({ x: p.x, z: p.z })), foots: o.foot.map((p) => ({ x: p.x, z: p.z })), hipFL: { x: o.hip[0].x, z: o.hip[0].z }, footFL: { x: o.foot[0].x, z: o.foot[0].z }, gripped: o.gripped.slice(), stance: o.stance.slice(), legs: o.legs.slice() } })); await sleep(50) }
await page.evaluate(() => window.__studio.drive(false))
await browser.close()

// FL grip windows -> representative (median forward)
const wins = []; let cur = null
for (let i = 0; i < raw.length; i++) { if (raw[i].g && !cur) cur = [i]; else if (!raw[i].g && cur) { cur.push(i); if (cur[1] - cur[0] >= 5) wins.push(cur); cur = null } }
if (!wins.length) { console.log('no FL windows'); process.exit(1) }
const fwd = (w) => -(raw[w[1]].cx - raw[w[0]].cx)
const med = [...wins.map(fwd)].sort((a, b) => a - b)[Math.floor(wins.length / 2)]
const rep = wins[wins.map(fwd).map((v, i) => [Math.abs(v - med), i]).sort((a, b) => a[0] - b[0])[0][1]]
const snaps = []; for (let k = 0; k < 10; k++) snaps.push(raw[rep[0] + Math.round(k * (rep[1] - rep[0]) / 9)])
// FL girdle = trunk node nearest the FL hip (use first snap)
const f0 = snaps[0]
let gi = 1, bestD = Infinity
for (let i = 1; i < f0.trunk.length - 1; i++) { const dx = f0.trunk[i].x - f0.hipFL.x, dz = f0.trunk[i].z - f0.hipFL.z; const dd = dx * dx + dz * dz; if (dd < bestD) { bestD = dd; gi = i } }
const flSide = Math.sign(f0.footFL.z - f0.hipFL.z) || 1
const bendAt = (f) => { const a = f.trunk[gi - 1], b = f.trunk[gi], c = f.trunk[gi + 1]; const v1x = b.x - a.x, v1z = b.z - a.z, v2x = c.x - b.x, v2z = c.z - b.z; return Math.atan2(v1x * v2z - v1z * v2x, v1x * v2x + v1z * v2z) * flSide }

const SIZE = 200
let xmn = Infinity, xmx = -Infinity, zmn = Infinity, zmx = -Infinity
for (const f of snaps) for (const p of [...f.trunk, ...f.foots]) { xmn = Math.min(xmn, p.x); xmx = Math.max(xmx, p.x); zmn = Math.min(zmn, p.z); zmx = Math.max(zmx, p.z) }
const pad = 18, sp = Math.max(xmx - xmn, zmx - zmn, 1), sc = (SIZE - 2 * pad) / sp
const sx = (z) => SIZE / 2 + (z - (zmn + zmx) / 2) * sc, sy = (x) => SIZE / 2 + (x - (xmn + xmx) / 2) * sc
const frameSVG = (f) => {
  const COL = (i) => f.gripped[i] ? '#22c55e' : (f.stance[i] ? '#f59e0b' : '#f87171')
  const poly = f.trunk.map((p) => `${sx(p.z).toFixed(1)},${sy(p.x).toFixed(1)}`).join(' ')
  const dots = f.trunk.map((p, i) => `<circle cx="${sx(p.z).toFixed(1)}" cy="${sy(p.x).toFixed(1)}" r="${i === gi ? 5 : 3}" fill="${i === gi ? '#fde047' : '#c4b5fd'}"/>`).join('')
  const leg = `<line x1="${sx(f.hipFL.z).toFixed(1)}" y1="${sy(f.hipFL.x).toFixed(1)}" x2="${sx(f.footFL.z).toFixed(1)}" y2="${sy(f.footFL.x).toFixed(1)}" stroke="#38bdf8" stroke-width="3"/>`
  const ft = f.foots.map((p, i) => `<circle cx="${sx(p.z).toFixed(1)}" cy="${sy(p.x).toFixed(1)}" r="${i === 0 ? 8 : 6}" fill="${COL(i)}"/>`).join('')
  return `<svg width="${SIZE}" height="${SIZE}"><polyline points="${poly}" fill="none" stroke="#c4b5fd" stroke-width="3"/>${dots}${leg}${ft}</svg>`
}
const c0 = snaps[0].cx
const bends = snaps.map(bendAt)
const rows = snaps.map((f, k) => {
  const b = bends[k], cc = b > 0.03 ? 'convex(FL)' : b < -0.03 ? 'concave(FL)' : 'straight'
  return `<div class="row"><div class="note"><div class="p">${Math.round(k / 9 * 100)}% of stance</div><div class="f">FL girdle: ${cc} ${b.toFixed(2)}</div><div class="f">fwd ${(-(f.cx - c0)).toFixed(2)}</div></div><div class="img">${frameSVG(f)}</div></div>`
}).join('')
const startB = bends[0], endB = bends[bends.length - 1], amp = Math.max(...bends) - Math.min(...bends)
const flips = startB > 0.03 && endB < -0.03
const concl = `FL girdle bend over the step: start ${startB.toFixed(2)} -> end ${endB.toFixed(2)} (range ${amp.toFixed(2)} rad). ${flips ? 'Goes convex->concave as wanted, but small.' : 'Does NOT cleanly go convex(FL)->concave(FL) — the bend is weak/mis-timed.'} A forceful lizard step wants a big convex-at-plant to concave-at-release swing at this girdle.`
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:470px}
 h1{font-size:21px;margin:0 0 6px;color:#fff} .res{font-size:16px;font-weight:700;margin:6px 0 10px;padding:8px 9px;border-radius:7px;background:#1e293b;color:#cbd5e1;line-height:1.35}
 .legend{font-size:13px;color:#d1d5db;margin:0 0 8px;line-height:1.35}
 .row{display:flex;align-items:center;gap:10px;border-top:2px solid #1f2937;padding:5px 0}
 .note{width:230px;flex:0 0 230px} .note .p{font-size:18px;font-weight:800;color:#fff} .note .f{font-size:16px;color:#cbd5e1}
 .img{flex:0 0 ${SIZE}px;text-align:right} .img svg{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px}
</style></head><body>
 <h1>One FL stride: girdle bend + leg</h1>
 <div class="res">${concl}</div>
 <div class="legend">Top-down, forward = up. Yellow node = FL girdle; cyan line = FL leg (hip→foot); big dot = FL foot (green pinned). Convex(FL) = girdle bulges toward the FL foot side; concave(FL) = opposite.</div>
 ${rows}
</body></html>`
const htmlPath = join(OUT, `stride-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `stride-${ts}.json`), JSON.stringify({ link, bends, gi, flSide, startB, endB, amp }))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 470, height: 1200 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `stride-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `stride-${ts}.pdf`), printBackground: true, width: '470px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`gi=${gi} bend ${startB.toFixed(2)}->${endB.toFixed(2)} amp ${amp.toFixed(2)} -> ${OUT}/stride-${ts}.pdf`)
