// Phase-lock observer (foundational step 1). PURE OBSERVATION — no sim-logic changes. Isolates ONE hip
// (FL) in the rigid-leg undulation state (grip off, step off, legs locked stiff, sweep 0) and answers:
// at what value of the leg clock `mechPhase` is the ACTUAL foot at its most-forward point? Grip + sweep
// fire off `mechPhase` offset by `gripShift`, so the clock phase at foot-most-forward is exactly what
// `gripShift` SHOULD equal for the foot to plant when it reaches forward. Also pre-checks leg rigidity
// (does the physics foot track the kinematic foot-rest, or is it flopping). Dark vertical aid + link.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/phaselock'
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
// Rigid-leg isolated undulation: no grip, no step, legs locked with a high hold stiffness so the foot
// faithfully tracks the girdle undulation (no flopping).
const cfg = { gravityEnabled: true, landLegsEnabled: true, landGroundEnabled: true, limbCpgEnabled: true, legsLocked: true, environmentEnabled: false,
  cpgDrive: 1.87, cpgExcitability: 0.24, muscleAlpha: 3.95, muscleBeta: 13.3, muscleDamping: 11.3,
  bodyFriction: 0.05, legFriction: 0.05, gripEnabled: false, gripShift: 0.05, gripDuration: 0.5, gripFeet: ALL,
  stepEnabled: false, sweepAmount: 0, sweepSpeed: 3000, liftAmount: 0.3, legStiffness: 30000, legDamping: 120 }

const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false))
  for (const t of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(t)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
const link = await page.evaluate((cfg) => { window.__studio.drive(false); window.__studio.apply(cfg); window.__studio.isolateLimb('FL'); window.__studio.setOverlays(['wave']); window.__studio.drive(true); return window.__studio.buildLink() }, cfg)
await sleep(3000)

// Sample FL: sim-time, COM x, actual foot x, foot-rest (reach) x, and the measured mechPhase.
const raw = []
for (let i = 0; i < 320; i++) {
  raw.push(await page.evaluate(() => {
    const o = window.__locObs, d = window.__studio.diag()
    if (!o || !o.legs.length) return null
    const j = o.legs.indexOf('FL') < 0 ? 0 : o.legs.indexOf('FL')
    return { t: window.__studio.getSimTime(), comX: d.comX, footX: o.foot[j].x, reachX: o.reach[j].x, phase: o.phase[j] }
  }))
  await sleep(45)
}
await page.evaluate(() => window.__studio.drive(false))
await browser.close()

const f = raw.filter(Boolean)
if (f.length < 40) { console.log('no data'); process.exit(1) }
// Fore-aft position relative to COM (forward = -x, so bigger footRel = more forward). Mean-removed.
const footRelRaw = f.map((s) => s.comX - s.footX)
const reachRelRaw = f.map((s) => s.comX - s.reachX)
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
const fm = mean(footRelRaw), rm = mean(reachRelRaw)
const footRel = footRelRaw.map((v) => v - fm)
const reachRel = reachRelRaw.map((v) => v - rm)
const phase = f.map((s) => s.phase)
const amp = (a) => { const s = [...a].sort((x, y) => x - y); return (s[Math.floor(s.length * 0.97)] - s[Math.floor(s.length * 0.03)]) / 2 }
const footAmp = amp(footRel), reachAmp = amp(reachRel)
// Rigidity: how closely the physics foot tracks the kinematic foot-rest (fore-aft), as a % of amplitude.
const rmsGap = Math.sqrt(mean(footRel.map((v, i) => (v - reachRel[i]) ** 2)))
const rigidPct = Math.max(0, 100 * (1 - rmsGap / Math.max(footAmp, 1e-6)))

// Per-cycle: at what mechPhase is the ACTUAL foot most-forward? Detect cycles by phase wrap (1 -> 0).
const TAU = Math.PI * 2
const cyc = []
let cur = []
for (let i = 1; i < f.length; i++) {
  if (phase[i] < phase[i - 1] - 0.5) { if (cur.length > 4) cyc.push(cur); cur = [] }
  cur.push(i)
}
if (cur.length > 4) cyc.push(cur)
const peakPhases = cyc.map((idxs) => { let best = idxs[0]; for (const i of idxs) if (footRel[i] > footRel[best]) best = i; return phase[best] })
const circMean = (arr) => { let sx = 0, sy = 0; for (const d of arr) { sx += Math.cos(d * TAU); sy += Math.sin(d * TAU) } return ((Math.atan2(sy, sx) / TAU) % 1 + 1) % 1 }
const circR = (arr) => { let sx = 0, sy = 0; for (const d of arr) { sx += Math.cos(d * TAU); sy += Math.sin(d * TAU) } return Math.hypot(sx, sy) / arr.length }
const phiAtMax = circMean(peakPhases)                 // clock phase where the foot is most forward
const signed = phiAtMax > 0.5 ? phiAtMax - 1 : phiAtMax // wrap to [-0.5, 0.5]
const lockR = peakPhases.length ? circR(peakPhases) : 0
const stabilityCyc = peakPhases.length > 1 ? Math.sqrt(-2 * Math.log(Math.max(lockR, 1e-6))) / TAU : 0 // circ std, cycles

// Binned mean footRel vs mechPhase (the alignment curve).
const NB = 24
const binSum = new Array(NB).fill(0), binN = new Array(NB).fill(0)
for (let i = 0; i < f.length; i++) { const b = Math.min(NB - 1, Math.floor(phase[i] * NB)); binSum[b] += footRel[i]; binN[b]++ }
const binAvg = binSum.map((s, i) => (binN[i] ? s / binN[i] : 0))
let peakBin = 0; for (let i = 1; i < NB; i++) if (binAvg[i] > binAvg[peakBin]) peakBin = i

// --- render ---
const W = 300, H1 = 150, H2 = 120, PADX = 34, PADY = 12
// Chart A: last ~4 cycles, footRel (cyan) + mechPhase sawtooth (amber), dashed verticals at foot maxima.
const winIdx = cyc.slice(-4).flat()
const wi0 = winIdx.length ? winIdx[0] : 0, wi1 = winIdx.length ? winIdx[winIdx.length - 1] : f.length - 1
const t0 = f[wi0].t, t1 = f[wi1].t
const ax = (t) => PADX + ((t - t0) / Math.max(t1 - t0, 1e-6)) * (W - PADX - 8)
const fMax = Math.max(...footRel.map(Math.abs), 1e-6)
const ay = (v) => PADY + (1 - (v / fMax + 1) / 2) * (H1 - 2 * PADY)
const pyTop = PADY, pyBot = H1 - PADY
const footPath = winIdx.map((i, k) => `${k ? 'L' : 'M'}${ax(f[i].t).toFixed(1)},${ay(footRel[i]).toFixed(1)}`).join(' ')
const phasePath = winIdx.map((i, k) => `${k ? 'L' : 'M'}${ax(f[i].t).toFixed(1)},${(pyBot - phase[i] * (pyBot - pyTop)).toFixed(1)}`).join(' ')
const footMaxLines = cyc.slice(-4).map((idxs) => { let best = idxs[0]; for (const i of idxs) if (footRel[i] > footRel[best]) best = i; return best })
  .map((i) => `<line x1="${ax(f[i].t).toFixed(1)}" y1="${pyTop}" x2="${ax(f[i].t).toFixed(1)}" y2="${pyBot}" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="3 3"/>`).join('')
const chartA = `<svg width="${W}" height="${H1}">
  <line x1="${PADX}" y1="${ay(0).toFixed(1)}" x2="${W - 8}" y2="${ay(0).toFixed(1)}" stroke="#3f3f46" stroke-width="1"/>
  ${footMaxLines}
  <path d="${phasePath}" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.8"/>
  <path d="${footPath}" fill="none" stroke="#22d3ee" stroke-width="2"/>
  <text x="2" y="${ay(fMax) + 4}" fill="#22d3ee" font-size="9">fwd</text>
  <text x="2" y="${pyBot}" fill="#f59e0b" font-size="9">ph1</text>
  <text x="2" y="${pyTop + 8}" fill="#f59e0b" font-size="9">ph0</text>
</svg>`
// Chart B: binned footRel vs mechPhase, peak marked, phase-0 line.
const bx = (b) => PADX + (b / (NB - 1)) * (W - PADX - 8)
const bMax = Math.max(...binAvg.map(Math.abs), 1e-6)
const by = (v) => PADY + (1 - (v / bMax + 1) / 2) * (H2 - 2 * PADY)
const binPath = binAvg.map((v, b) => `${b ? 'L' : 'M'}${bx(b).toFixed(1)},${by(v).toFixed(1)}`).join(' ')
const chartB = `<svg width="${W}" height="${H2}">
  <line x1="${PADX}" y1="${by(0).toFixed(1)}" x2="${W - 8}" y2="${by(0).toFixed(1)}" stroke="#3f3f46" stroke-width="1"/>
  <line x1="${bx(0).toFixed(1)}" y1="${PADY}" x2="${bx(0).toFixed(1)}" y2="${H2 - PADY}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="${bx(0).toFixed(1)}" y="${H2 - 2}" fill="#f59e0b" font-size="9" text-anchor="middle">ph0</text>
  <path d="${binPath}" fill="none" stroke="#22d3ee" stroke-width="2"/>
  <line x1="${bx(peakBin).toFixed(1)}" y1="${PADY}" x2="${bx(peakBin).toFixed(1)}" y2="${H2 - PADY}" stroke="#22d3ee" stroke-width="1.5"/>
  <text x="${bx(peakBin).toFixed(1)}" y="${PADY - 2}" fill="#22d3ee" font-size="9" text-anchor="middle">foot fwd</text>
</svg>`

const cyf = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(3)} cyc`
const rigid = rigidPct > 85
const aligned = Math.abs(signed) <= 0.05
const verdict = !rigid ? 'LEG NOT RIGID — measurement unreliable' : aligned ? 'CLOCK ALIGNED to the foot' : 'CLOCK OFFSET from the foot'
const concl = !rigid
  ? `The foot only tracks the girdle at ${rigidPct.toFixed(0)}% (needs > 85%). Raise legStiffness before trusting the phase numbers.`
  : `Foot is rigid (${rigidPct.toFixed(0)}% tracking). The actual foot is most-forward at mechPhase ${cyf(signed)} (0 = the clock's zero). ${aligned ? 'Within tolerance — grip at gripShift≈0 fires on the forward reach.' : `So gripShift should be ${phiAtMax.toFixed(2)} (not 0.05) for the foot to plant when it is actually most-forward.`}`
const row = (k, v, s) => `<div class="row"><div class="k">${k}</div><div class="v">${v}${s ? `<span class="s"> ${s}</span>` : ''}</div></div>`
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:340px}
 h1{font-size:18px;margin:0 0 6px;color:#fff} .res{font-size:14px;font-weight:700;margin:6px 0 10px;padding:8px 9px;border-radius:7px;background:#1e293b;color:#cbd5e1;line-height:1.35}
 .cap{font-size:12px;color:#9ca3af;margin:10px 0 2px}.legend{font-size:11px;color:#9ca3af;margin:0 0 4px}
 .chart{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px;padding:4px}
 .row{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #1f2937;padding:5px 2px;font-size:13px}
 .k{color:#9ca3af} .v{color:#f3f4f6;font-weight:700;text-align:right} .v .s{color:#6b7280;font-weight:400;font-size:11px}
 .sw{display:inline-block;width:16px;height:3px;vertical-align:2px;margin:0 2px}
</style></head><body>
 <h1>FL clock ↔ foot phase-lock</h1>
 <div class="res">${concl}</div>
 <div class="cap">Actual foot fore-aft (<span class="sw" style="background:#22d3ee"></span>cyan) vs mechPhase sawtooth (<span class="sw" style="background:#f59e0b"></span>amber), last 4 cycles. Dashed cyan = foot most-forward; it should sit at phase 0 (amber sawtooth bottom→top reset).</div>
 <div class="chart">${chartA}</div>
 <div class="cap">Mean foot fore-aft vs clock phase. The cyan peak (foot most-forward) should sit on the amber ph0 line.</div>
 <div class="chart">${chartB}</div>
 ${row('Foot fwd @ clock phase', cyf(signed), 'want 0.00')}
 ${row('→ gripShift should be', phiAtMax.toFixed(2), 'currently 0.05')}
 ${row('Cycle-to-cycle spread', `${stabilityCyc.toFixed(3)} cyc`, 'lower = steadier')}
 ${row('Leg rigidity', `${rigidPct.toFixed(0)}%`, 'foot tracks girdle')}
 ${row('Foot amplitude', footAmp.toFixed(3), 'fore-aft swing')}
 ${row('Cycles measured', `${peakPhases.length}`, '')}
</body></html>`
const htmlPath = join(OUT, `phaselock-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `phaselock-${ts}.json`), JSON.stringify({ link, phiAtMax, signed, stabilityCyc, rigidPct, footAmp, reachAmp, cycles: peakPhases.length }, null, 2))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 340, height: 900 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `phaselock-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `phaselock-${ts}.pdf`), printBackground: true, width: '340px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`rigid ${rigidPct.toFixed(0)}%  foot-fwd@ ${signed.toFixed(3)}cyc  gripShift->${phiAtMax.toFixed(2)}  cycles ${peakPhases.length} -> ${OUT}/phaselock-${ts}.pdf`)
console.log(`link: ${link}`)
