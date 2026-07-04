// Timing / coordination observer. PURE OBSERVATION — reads window.__locObs (per-leg phase, stance,
// grip) and the trunk skeleton; changes NO sim logic. Answers "are the legs coordinated?": it draws a
// gait diagram (4 tracks, time →, stance bars) and measures the inter-leg phase offsets against the
// diagonal-trot ideal (FL+BR together, FR+BL a half-cycle later), the per-leg duty factor, and how much
// the coordination drifts across the run. Dark vertical aid: note left, image right, + a one-click link.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/timing'
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
// Paper-faithful walk baseline: limb CPG on, legs timed off the measured body wave (the reverted
// default), all feet gripping+stepping. This is the state we tune the TIMING of.
const cfg = { gravityEnabled: true, landLegsEnabled: true, landGroundEnabled: true, limbCpgEnabled: true, legsLocked: false, environmentEnabled: false,
  cpgDrive: 1.87, cpgExcitability: 0.24, muscleAlpha: 3.95, muscleBeta: 13.3, muscleDamping: 11.3,
  bodyFriction: 0.05, legFriction: 0.6, releaseFriction: 0, gripEnabled: true, gripShift: 0.05, gripDuration: 0.5, gripFeet: ALL,
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
const link = await page.evaluate((cfg) => { window.__studio.drive(false); window.__studio.apply(cfg); window.__studio.setOverlays(['stance']); window.__studio.drive(true); return window.__studio.buildLink() }, cfg)
await sleep(2500)

// Sample the observation snapshot over ~14s.
const raw = []
for (let i = 0; i < 280; i++) {
  raw.push(await page.evaluate(() => {
    const o = window.__locObs
    if (!o) return null
    return { t: window.__studio.getSimTime(), legs: o.legs.slice(), phase: o.phase.slice(), stance: o.stance.slice(), gripped: o.gripped.slice(),
      hip: o.hip.map((p) => ({ x: p.x, z: p.z })), foot: o.foot.map((p) => ({ x: p.x, z: p.z })), trunk: o.trunk.map((p) => ({ x: p.x, z: p.z })) }
  }))
  await sleep(50)
}
await page.evaluate(() => window.__studio.drive(false))
await browser.close()

const frames = raw.filter(Boolean)
if (frames.length < 20 || !frames[0].legs.length) { console.log('no leg observation data (legs off?)'); process.exit(1) }
const legs = frames[0].legs
const n = legs.length
const idxOf = (name) => legs.indexOf(name)
const FL = idxOf('FL'), FR = idxOf('FR'), BL = idxOf('BL'), BR = idxOf('BR')

// Circular mean/offset helpers (phase in [0,1) = fraction of a cycle).
const TAU = Math.PI * 2
const circMeanOffset = (arr) => { let sx = 0, sy = 0; for (const d of arr) { sx += Math.cos(d * TAU); sy += Math.sin(d * TAU) } const a = Math.atan2(sy, sx) / TAU; return (a % 1 + 1) % 1 }
const circR = (arr) => { let sx = 0, sy = 0; for (const d of arr) { sx += Math.cos(d * TAU); sy += Math.sin(d * TAU) } return Math.hypot(sx, sy) / arr.length }
// Inter-leg phase offset vs FL (reference), across the whole run.
const offsetSeries = (j) => frames.map((f) => ((f.phase[j] - f.phase[FL]) % 1 + 1) % 1)
const pairOffset = (j) => { const s = offsetSeries(j); return { off: circMeanOffset(s), lock: circR(s) } } // lock 1 = rock-steady, 0 = drifting
const oFR = FR >= 0 ? pairOffset(FR) : null
const oBL = BL >= 0 ? pairOffset(BL) : null
const oBR = BR >= 0 ? pairOffset(BR) : null
// Duty factor per leg = fraction of time in stance.
const duty = legs.map((_, j) => frames.reduce((a, f) => a + (f.stance[j] ? 1 : 0), 0) / frames.length)
// Diagonal-trot scoring: ideal FL-BR ≈ 0, FL-FR ≈ 0.5, FL-BL ≈ 0.5. Distance on the circle.
const cdist = (a, b) => { const d = Math.abs(((a - b) % 1 + 1) % 1); return Math.min(d, 1 - d) }
const trotErr = ((oBR ? cdist(oBR.off, 0) : 0) + (oFR ? cdist(oFR.off, 0.5) : 0) + (oBL ? cdist(oBL.off, 0.5) : 0)) / 3
const lockAvg = [oFR, oBL, oBR].filter(Boolean).reduce((a, o) => a + o.lock, 0) / [oFR, oBL, oBR].filter(Boolean).length

// Gait diagram window: last ~5s, stance = amber, gripped = green, swing = dark.
const tEnd = frames[frames.length - 1].t, tStart = Math.max(frames[0].t, tEnd - 5)
const win = frames.filter((f) => f.t >= tStart)
const W = 250, TRACK_H = 26, GAP = 8, LABELW = 34, PADX = 8
const order = ['FL', 'FR', 'BL', 'BR'].filter((nm) => idxOf(nm) >= 0)
const tx = (t) => LABELW + PADX + ((t - tStart) / Math.max(tEnd - tStart, 1e-6)) * (W - LABELW - 2 * PADX)
const diagramH = order.length * (TRACK_H + GAP) + GAP
const trackSVG = (nm, row) => {
  const j = idxOf(nm)
  const y = GAP + row * (TRACK_H + GAP)
  let cells = ''
  for (let i = 0; i < win.length - 1; i++) {
    const f = win[i], x0 = tx(f.t), x1 = tx(win[i + 1].t)
    const col = f.gripped[j] ? '#22c55e' : (f.stance[j] ? '#f59e0b' : '#27272a')
    cells += `<rect x="${x0.toFixed(1)}" y="${y}" width="${(x1 - x0 + 0.6).toFixed(1)}" height="${TRACK_H}" fill="${col}"/>`
  }
  const isFront = nm === 'FL' || nm === 'FR'
  return `<text x="2" y="${y + TRACK_H / 2 + 4}" fill="${isFront ? '#93c5fd' : '#c4b5fd'}" font-size="12" font-weight="700">${nm}</text>${cells}<rect x="${LABELW + PADX}" y="${y}" width="${W - LABELW - 2 * PADX}" height="${TRACK_H}" fill="none" stroke="#3f3f46" stroke-width="1"/>`
}
const diagram = `<svg width="${W}" height="${diagramH}">${order.map((nm, r) => trackSVG(nm, r)).join('')}</svg>`

const pct = (v) => `${Math.round(v * 100)}%`
const cyc = (v) => `${v.toFixed(2)} cyc`
const verdict = trotErr < 0.08 && lockAvg > 0.85 ? 'COORDINATED diagonal trot' : trotErr < 0.15 ? 'ROUGH trot (timing off / drifting)' : 'UNCOORDINATED'
const concl = `${verdict}. Diagonal-trot timing error ${cyc(trotErr)} (0 = perfect); phase-lock ${pct(lockAvg)} (100% = rock-steady, low = the legs drift out of step). Ideal: FL–BR together (0), FL–FR and FL–BL half a cycle apart (0.50).`
const row = (label, val, sub) => `<div class="row"><div class="k">${label}</div><div class="v">${val}${sub ? `<span class="s"> ${sub}</span>` : ''}</div></div>`
const offRow = (nm, o, ideal) => o ? row(`FL→${nm} offset`, cyc(o.off), `ideal ${ideal.toFixed(2)} · lock ${pct(o.lock)}`) : ''
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:300px}
 h1{font-size:19px;margin:0 0 6px;color:#fff} .res{font-size:14px;font-weight:700;margin:6px 0 10px;padding:8px 9px;border-radius:7px;background:#1e293b;color:#cbd5e1;line-height:1.35}
 .legend{font-size:12px;color:#d1d5db;margin:8px 0;line-height:1.35}
 .diagram{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px;padding:6px;margin:8px 0}
 .row{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #1f2937;padding:5px 2px;font-size:13px}
 .k{color:#9ca3af} .v{color:#f3f4f6;font-weight:700;text-align:right} .v .s{color:#6b7280;font-weight:400;font-size:11px}
 .sw{display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;margin:0 2px}
</style></head><body>
 <h1>Leg timing &amp; coordination</h1>
 <div class="res">${concl}</div>
 <div class="legend"><b>Gait diagram</b> (last 5s, time →):
  <span class="sw" style="background:#22c55e"></span>gripped
  <span class="sw" style="background:#f59e0b"></span>stance
  <span class="sw" style="background:#27272a;border:1px solid #3f3f46"></span>swing.
  A diagonal trot shows FL &amp; BR bars aligned, FR &amp; BL aligned, the two pairs interleaved.</div>
 <div class="diagram">${diagram}</div>
 ${offRow('FR', oFR, 0.5)}
 ${offRow('BL', oBL, 0.5)}
 ${offRow('BR', oBR, 0.0)}
 ${order.map((nm) => row(`${nm} duty`, pct(duty[idxOf(nm)]), 'stance fraction')).join('')}
 ${row('Phase-lock', pct(lockAvg), 'steady vs drifting')}
 ${row('Trot error', cyc(trotErr), 'lower = better')}
</body></html>`
const htmlPath = join(OUT, `timing-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `timing-${ts}.json`), JSON.stringify({ link, legs, offsets: { FR: oFR, BL: oBL, BR: oBR }, duty, trotErr, lockAvg }, null, 2))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 300, height: 900 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `timing-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `timing-${ts}.pdf`), printBackground: true, width: '300px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`trotErr ${trotErr.toFixed(3)} lock ${lockAvg.toFixed(2)} -> ${OUT}/timing-${ts}.pdf`)
console.log(`link: ${link}`)
