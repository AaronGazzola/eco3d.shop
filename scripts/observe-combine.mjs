// Combine: standing axial wave (bodyWaves=0, CPG on) + diagonal-trot leg sweep (time clock, freq-matched),
// limb oscillators off so they don't fight the standing wave. Measures forward motion, spine phase lag
// (curvature, should be ~0 = standing) and tilt; renders a dark vertical node-map sequence. The walk we want.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/combine'
const DRIVE = Number(process.argv[2] ?? 1.0), ALPHA = Number(process.argv[3] ?? 14), SWEEP = Number(process.argv[4] ?? 0.5), GRIPSHIFT = Number(process.argv[5] ?? 0.8)
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
const freq = DRIVE * 0.5 * 1.1 // axial freq ~ drive*exc*1.1; match the leg clock to it
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
  cpgDrive: DRIVE, cpgExcitability: 0.5, bodyWaves: 0.0, muscleAlpha: ALPHA, muscleBeta: 35, muscleDamping: 6,
  bodyFriction: 0.05, legFriction: 0.6, releaseFriction: 0, gripEnabled: true, gripShift: GRIPSHIFT, gripDuration: 0.5, gripFeet: ALL,
  stepEnabled: true, legClock: 'time', stepFreqHz: freq, sweepReverse: false, sweepAmount: SWEEP, sweepSpeed: 37000, liftAmount: 0.25, legStiffness: 3000, legDamping: 120 }
const link = await page.evaluate((cfg) => { window.__studio.drive(false); if (!window.__studio.preset('Walk — mid')) window.__studio.preset('Walk — mid'); window.__studio.apply(cfg); window.__studio.setOverlays(['stance']); window.__studio.drive(true); return window.__studio.buildLink() }, cfg)
await sleep(2000)
const raw = []
for (let i = 0; i < 160; i++) { raw.push(await page.evaluate(() => { const o = window.__locObs, d = window.__studio.diag(); return { t: window.__studio.getSimTime(), cx: d.comX, cz: d.comZ, tilt: d.maxTiltDeg, trunk: o.trunk.map((p) => ({ x: p.x, z: p.z })), foots: o.foot.map((p) => ({ x: p.x, z: p.z })), gripped: o.gripped.slice(), stance: o.stance.slice(), legs: o.legs.slice() } })); await sleep(50) }
await page.evaluate(() => window.__studio.drive(false))
await browser.close()

// spine lag via curvature
const TWO_PI = Math.PI * 2, t0 = raw[0].t, ts2 = raw.map((r) => r.t - t0)
const n = raw[0].trunk.length, sigs = []
for (let i = 1; i < n - 1; i++) { const series = raw.map((fr) => { const a = fr.trunk[i - 1], b = fr.trunk[i], c = fr.trunk[i + 1]; const v1x = b.x - a.x, v1z = b.z - a.z, v2x = c.x - b.x, v2z = c.z - b.z; return Math.atan2(v1x * v2z - v1z * v2x, v1x * v2x + v1z * v2z) }); const m = series.reduce((s, v) => s + v, 0) / series.length; sigs.push(series.map((v) => v - m)) }
const proj = (sig, w) => { let cc = 0, ss = 0; for (let k = 0; k < sig.length; k++) { cc += sig[k] * Math.cos(w * ts2[k]); ss += sig[k] * Math.sin(w * ts2[k]) } return { c: cc, s: ss, power: cc * cc + ss * ss } }
let best = { f: freq, power: -1 }
for (let f = Math.max(0.1, freq * 0.4); f <= freq * 2.2 + 0.2; f += 0.01) { const w = TWO_PI * f; let tot = 0; for (const s of sigs) tot += proj(s, w).power; if (tot > best.power) best = { f, power: tot } }
const w = TWO_PI * best.f
const seg = sigs.map((sig) => { const p = proj(sig, w); return { phase: Math.atan2(p.s, p.c) / TWO_PI, amp: Math.hypot(p.c, p.s) / raw.length } })
const ampMax = Math.max(...seg.map((s) => s.amp), 1e-9)
let prev = null, acc = 0; for (const s of seg) { if (prev === null) { s.un = 0; prev = s.phase; continue } let d = s.phase - prev; while (d > 0.5) d -= 1; while (d < -0.5) d += 1; acc += d; s.un = acc; prev = s.phase }
const active = seg.filter((s) => s.amp >= 0.25 * ampMax)
const lag = active.length ? active[active.length - 1].un - active[0].un : 0
const fwd = -(raw[raw.length - 1].cx - raw[0].cx), lat = raw[raw.length - 1].cz - raw[0].cz, dt = raw[raw.length - 1].t - raw[0].t
const tiltMax = Math.max(...raw.map((r) => r.tilt))

const N = 10, snaps = []; for (let k = 0; k < N; k++) snaps.push(raw[Math.round(k * (raw.length - 1) / (N - 1))])
const SIZE = 190
let xmn = Infinity, xmx = -Infinity, zmn = Infinity, zmx = -Infinity
for (const f of snaps) for (const p of [...f.trunk, ...f.foots]) { xmn = Math.min(xmn, p.x); xmx = Math.max(xmx, p.x); zmn = Math.min(zmn, p.z); zmx = Math.max(zmx, p.z) }
const pad = 16, sp = Math.max(xmx - xmn, zmx - zmn, 1), sc = (SIZE - 2 * pad) / sp
const sx = (z) => SIZE / 2 + (z - (zmn + zmx) / 2) * sc, sy = (x) => SIZE / 2 + (x - (xmn + xmx) / 2) * sc
const frameSVG = (f) => { const COL = (i) => f.gripped[i] ? '#22c55e' : (f.stance[i] ? '#f59e0b' : '#f87171'); const poly = f.trunk.map((p) => `${sx(p.z).toFixed(1)},${sy(p.x).toFixed(1)}`).join(' '); const dots = f.trunk.map((p) => `<circle cx="${sx(p.z).toFixed(1)}" cy="${sy(p.x).toFixed(1)}" r="3" fill="#c4b5fd"/>`).join(''); const ft = f.foots.map((p, i) => `<circle cx="${sx(p.z).toFixed(1)}" cy="${sy(p.x).toFixed(1)}" r="7" fill="${COL(i)}"/>`).join(''); return `<svg width="${SIZE}" height="${SIZE}"><polyline points="${poly}" fill="none" stroke="#c4b5fd" stroke-width="3"/>${dots}${ft}</svg>` }
const c0 = snaps[0].cx
const rows = snaps.map((f, k) => `<div class="row"><div class="note"><div class="p">frame ${k + 1}/10</div><div class="f">fwd ${(-(f.cx - c0)).toFixed(2)}</div><div class="tag">pin ${f.legs.filter((_, i) => f.gripped[i]).join('+') || '-'}</div></div><div class="img">${frameSVG(f)}</div></div>`).join('')
const standing = Math.abs(lag) < 0.3, moves = fwd > 0.3, upright = tiltMax < 12
const ok = standing && moves && upright
const concl = `drive ${DRIVE}, alpha ${ALPHA}, sweep ${SWEEP}: forward ${fwd >= 0 ? '+' : ''}${fwd.toFixed(2)} (${(fwd / dt).toFixed(2)} u/s), lateral ${lat.toFixed(2)}, spine lag ${lag.toFixed(2)} (${standing ? 'standing' : 'traveling'}), tilt ${tiltMax.toFixed(1)}deg. ${ok ? 'Forward + standing spine + upright.' : 'Not yet: ' + [moves ? '' : 'no forward', standing ? '' : 'spine still traveling', upright ? '' : 'tips'].filter(Boolean).join(', ') + '.'}`
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:460px}
 h1{font-size:22px;margin:0 0 6px;color:#fff} .res{font-size:17px;font-weight:700;margin:6px 0 10px;padding:8px 9px;border-radius:7px;line-height:1.35}
 .res.good{background:#14532d;color:#bbf7d0} .res.bad{background:#7f1d1d;color:#fecaca}
 .legend{font-size:14px;color:#d1d5db;margin:0 0 8px}
 .row{display:flex;align-items:center;gap:10px;border-top:2px solid #1f2937;padding:5px 0}
 .note{width:200px;flex:0 0 200px} .note .p{font-size:18px;font-weight:800;color:#fff} .note .f{font-size:17px;color:#cbd5e1} .note .tag{font-size:15px;color:#93c5fd}
 .img{flex:0 0 ${SIZE}px;text-align:right} .img svg{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px}
</style></head><body>
 <h1>Combine: standing spine + diagonal-trot legs</h1>
 <div class="res ${ok ? 'good' : 'bad'}">${concl}</div>
 <div class="legend">Top-down, forward = up. Spine purple; feet green pinned / amber stance / red swing. Watch the body climb the frame while the spine flexes as a standing wave.</div>
 ${rows}
</body></html>`
const htmlPath = join(OUT, `combine-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `combine-${ts}.json`), JSON.stringify({ link, fwd, lat, lag, tiltMax, DRIVE, ALPHA, SWEEP }))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 460, height: 1200 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `combine-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `combine-${ts}.pdf`), printBackground: true, width: '460px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`fwd=${fwd.toFixed(2)} lag=${lag.toFixed(2)} tilt=${tiltMax.toFixed(1)} -> ${OUT}/combine-${ts}.pdf`)
console.log(`LINK ${link}`)
