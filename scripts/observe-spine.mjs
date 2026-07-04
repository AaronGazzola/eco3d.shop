// Spine phase-lag monitor. For each gait it captures the lateral (Z) oscillation of every trunk node,
// computes each node's phase + amplitude at the dominant frequency, and reports the head->tail
// intersegmental phase lag (cycles) — the paper's gait signature (Knusel 2020, Fig 2C / Table 4):
//   standing wave  (terrestrial WALK/TROT) -> phase lag ~ 0   (flat profile)
//   traveling wave (SWIM)                   -> positive lag    (sloped, ~1.58 cycles in our build)
// Renders a dark vertical aid: per gait, the phase profile vs the paper's standing/traveling targets,
// plus the amplitude profile (girdles should be nodes = minima). Output under documentation/diagnostics/spine/.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/spine'
function findChromium() { try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = platform() === 'win32' ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright')
  for (const d of readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse())
    for (const e of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-linux', 'chrome')]) if (existsSync(e)) return e
  throw new Error('no chromium') }
const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false))
  for (const t of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(t)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })

async function capture(presetName, extra) {
  const cfg = await page.evaluate(({ presetName, extra }) => { window.__studio.drive(false); window.__studio.preset(presetName); if (extra) window.__studio.apply(extra); window.__studio.drive(true); return window.__studio.getConfig() }, { presetName, extra })
  await sleep(2000)
  const T = [], P = []
  for (let i = 0; i < 260; i++) { const s = await page.evaluate(() => ({ t: window.__studio.getSimTime(), p: window.__locObs.trunk.map((q) => ({ x: q.x, z: q.z })) })); T.push(s.t); P.push(s.p); await sleep(33) }
  await page.evaluate(() => window.__studio.drive(false))
  return { cfg, T, P }
}

const TWO_PI = Math.PI * 2
function analyze({ cfg, T, P }) {
  const t0 = T[0], ts2 = T.map((t) => t - t0)
  const n = P[0].length
  // Per-interior-node CURVATURE (signed local bend angle), translation+rotation invariant — the
  // paper's joint-angle measure, immune to the body drifting/yawing as it swims.
  const sigs = []
  for (let i = 1; i < n - 1; i++) {
    const series = P.map((fr) => {
      const a = fr[i - 1], b = fr[i], c = fr[i + 1]
      const v1x = b.x - a.x, v1z = b.z - a.z, v2x = c.x - b.x, v2z = c.z - b.z
      return Math.atan2(v1x * v2z - v1z * v2x, v1x * v2x + v1z * v2z)
    })
    const mean = series.reduce((s, v) => s + v, 0) / series.length
    sigs.push(series.map((v) => v - mean))
  }
  const proj = (sig, w) => { let cc = 0, ss = 0; for (let k = 0; k < sig.length; k++) { cc += sig[k] * Math.cos(w * ts2[k]); ss += sig[k] * Math.sin(w * ts2[k]) } return { c: cc, s: ss, power: cc * cc + ss * ss } }
  const fG = Math.abs((cfg.cpgDrive ?? 1) * (cfg.cpgExcitability ?? 0.5) * 1.1) || 0.6
  let best = { f: fG, power: -1 }
  for (let f = Math.max(0.1, fG * 0.4); f <= fG * 2.2 + 0.2; f += 0.01) { const w = TWO_PI * f; let tot = 0; for (const s of sigs) tot += proj(s, w).power; if (tot > best.power) best = { f, power: tot } }
  const w = TWO_PI * best.f
  const seg = sigs.map((sig, i) => { const p = proj(sig, w); return { i, phase: Math.atan2(p.s, p.c) / TWO_PI, amp: Math.hypot(p.c, p.s) / P.length } })
  const ampMax = Math.max(...seg.map((s) => s.amp), 1e-9)
  let prev = null, acc = 0
  for (const s of seg) { if (prev === null) { s.un = 0; prev = s.phase; continue } let d = s.phase - prev; while (d > 0.5) d -= 1; while (d < -0.5) d += 1; acc += d; s.un = acc; prev = s.phase }
  const active = seg.filter((s) => s.amp >= 0.25 * ampMax)
  const span = active.length ? active[active.length - 1].un - active[0].un : 0
  return { seg, span, freq: best.f, ampMax }
}

const W = 420, H = 150
function chart(seg, span) {
  const n = seg.length
  const ymin = Math.min(-0.3, ...seg.map((s) => s.un)) - 0.1, ymax = Math.max(1.7, ...seg.map((s) => s.un)) + 0.1
  const X = (i) => 30 + (i / (n - 1)) * (W - 40), Y = (v) => H - 24 - ((v - ymin) / (ymax - ymin)) * (H - 40)
  const ours = seg.map((s) => `${X(s.i).toFixed(1)},${Y(s.un).toFixed(1)}`).join(' ')
  const dots = seg.map((s) => `<circle cx="${X(s.i).toFixed(1)}" cy="${Y(s.un).toFixed(1)}" r="3" fill="#c4b5fd"/>`).join('')
  const swimRef = `${X(0).toFixed(1)},${Y(0).toFixed(1)} ${X(n - 1).toFixed(1)},${Y(1.58).toFixed(1)}`
  const ampBars = seg.map((s) => { const bx = X(s.i), bh = (s.amp / Math.max(...seg.map((q) => q.amp), 1e-9)) * 26; return `<rect x="${(bx - 3).toFixed(1)}" y="${(H - bh).toFixed(1)}" width="6" height="${bh.toFixed(1)}" fill="#475569"/>` }).join('')
  return `<svg width="${W}" height="${H + 24}">
    <line x1="30" y1="${Y(0).toFixed(1)}" x2="${W - 10}" y2="${Y(0).toFixed(1)}" stroke="#22c55e" stroke-width="2" stroke-dasharray="5 4"/>
    <text x="${W - 12}" y="${(Y(0) - 4).toFixed(1)}" font-size="11" fill="#22c55e" text-anchor="end">walk target = 0 (standing)</text>
    <polyline points="${swimRef}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="5 4"/>
    <text x="${(W - 12)}" y="${(Y(1.58) + 12).toFixed(1)}" font-size="11" fill="#38bdf8" text-anchor="end">swim target = 1.58 (traveling)</text>
    <polyline points="${ours}" fill="none" stroke="#c4b5fd" stroke-width="3"/>${dots}
    ${ampBars}
    <text x="4" y="${Y(ymax).toFixed(1)}" font-size="11" fill="#9ca3af">${ymax.toFixed(1)}</text>
    <text x="4" y="${Y(ymin).toFixed(1)}" font-size="11" fill="#9ca3af">${ymin.toFixed(1)}</text>
    <text x="30" y="${(H + 20)}" font-size="11" fill="#9ca3af">head</text>
    <text x="${W - 10}" y="${(H + 20)}" font-size="11" fill="#9ca3af" text-anchor="end">tail</text>
  </svg>`
}

// Step 2: drive a standing wave by sweeping the axial phase-lag knob (bodyWaves) on the isolated
// spine. 1.58 = swim traveling; target 0 = standing. Find where the MECHANICAL lag reaches ~0.
const gaits = [
  { key: 'bw158', title: 'bodyWaves 1.58 (swim)', preset: 'Spine swim — 2 cruise', extra: { bodyWaves: 1.58 } },
  { key: 'bw10', title: 'bodyWaves 1.0', preset: 'Spine swim — 2 cruise', extra: { bodyWaves: 1.0 } },
  { key: 'bw05', title: 'bodyWaves 0.5', preset: 'Spine swim — 2 cruise', extra: { bodyWaves: 0.5 } },
  { key: 'bw00', title: 'bodyWaves 0.0 (standing target)', preset: 'Spine swim — 2 cruise', extra: { bodyWaves: 0.0 } },
]
const sections = []
for (const g of gaits) {
  const cap = await capture(g.preset, g.extra)
  const a = analyze(cap)
  writeFileSync(join(OUT, `${g.key}-${ts}.json`), JSON.stringify({ cfg: cap.cfg, seg: a.seg, span: a.span, freq: a.freq }))
  const kind = Math.abs(a.span) < 0.2 ? 'STANDING' : Math.abs(a.span) < 0.6 ? 'mixed' : 'TRAVELING'
  const ok = Math.abs(a.span) < 0.2
  const cls = ok ? 'good' : Math.abs(a.span) < 0.6 ? 'neutral' : 'bad'
  const verdict = `mechanical lag ${a.span.toFixed(2)} cycles = ${kind}${ok ? ' — standing achieved' : ''}`
  sections.push(`<section><div class="ntitle">${g.title}</div><div class="res ${cls}">${verdict}</div><div class="ch">${chart(a.seg, a.span)}</div><div class="cap">Purple = our per-segment phase (head→tail). Green dashed = standing target (0). Blue dashed = swim traveling (1.58). Grey bars = lateral amplitude. freq ≈ ${a.freq.toFixed(2)} Hz.</div></section>`)
}
const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:460px}
 h1{font-size:22px;margin:0 0 4px;color:#fff} .lead{font-size:14px;color:#9ca3af;margin:0 0 8px;line-height:1.35}
 section{border-top:3px solid #27272a;padding:10px 0} .ntitle{font-size:21px;font-weight:800;color:#fff}
 .res{font-size:16px;font-weight:700;margin:6px 0 8px;padding:7px 9px;border-radius:7px;line-height:1.3}
 .res.good{background:#14532d;color:#bbf7d0} .res.bad{background:#7f1d1d;color:#fecaca} .res.neutral{background:#1e293b;color:#cbd5e1}
 .ch svg{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px;display:block}
 .cap{font-size:13px;color:#9ca3af;margin-top:5px;line-height:1.35}
</style></head><body>
 <h1>Driving a standing wave (bodyWaves sweep)</h1>
 <div class="lead">Isolated spine. Sweeping the axial phase-lag knob bodyWaves from 1.58 (swim/traveling) toward 0 (standing). Win = the MECHANICAL lag (purple) flattens onto the green standing target (0).</div>
 ${sections.join('')}
</body></html>`
const htmlPath = join(OUT, `spine-${ts}.html`)
writeFileSync(htmlPath, html)
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 460, height: 1200 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `spine-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `spine-${ts}.pdf`), printBackground: true, width: '460px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
await browser.close()
console.log(`-> ${OUT}/spine-${ts}.pdf`)
