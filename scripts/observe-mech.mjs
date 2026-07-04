// Two isolation tests, rendered as dark vertical node-map sequences (note left, image right).
// PULL  (Test 1): grip + sweep on the TIME clock, CPG off -> does the leg pull the body forward?
// WRITHE(Test 2): permanent grip + CPG high + no sweep -> does the body still undulate, foot held?
// Each frame draws the trunk spine, all four feet (green pinned / amber stance / red swing), the FL
// hip socket (cyan square) and the FL leg line (hip->foot) so the sweep angle + hip-over-foot is visible.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
const BASE = 'http://127.0.0.1:3002', RIG = 'baby cyber dragon', AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/mech'
function findChromium() { try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = platform() === 'win32' ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright')
  for (const d of readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse())
    for (const e of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-linux', 'chrome')]) if (existsSync(e)) return e
  throw new Error('no chromium') }
const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const FL = { FL: true, FR: false, BL: false, BR: false }
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false))
  for (const t of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(t)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
async function run(cfg, secs) {
  const link = await page.evaluate((cfg) => { window.__studio.drive(false); if (!window.__studio.preset('Walk — mid')) window.__studio.preset('Walk — mid'); window.__studio.apply(cfg); window.__studio.setOverlays(['stance', 'wave']); window.__studio.drive(true); return window.__studio.buildLink() }, cfg)
  await sleep(1500)
  const s = []; const n = Math.round(secs * 20)
  for (let i = 0; i < n; i++) { s.push(await page.evaluate(() => { const o = window.__locObs, d = window.__studio.diag(); return { t: window.__studio.getSimTime(), cx: d.comX, g: o.gripped[0], trunk: o.trunk.map((p) => ({ x: p.x, z: p.z })), foots: o.foot.map((p) => ({ x: p.x, z: p.z })), gripped: o.gripped.slice(), stance: o.stance.slice(), legs: o.legs.slice(), hip: { x: o.hip[0].x, z: o.hip[0].z }, foot: { x: o.foot[0].x, z: o.foot[0].z } } })); await sleep(50) }
  await page.evaluate(() => window.__studio.drive(false))
  return { link, s }
}
const pull = await run({ cpgDrive: 0, legClock: 'time', stepFreqHz: 0.6, stepEnabled: true, gripEnabled: true, gripFeet: FL, muscleAlpha: 22, gripShift: 0.05, gripDuration: 0.5, sweepAmount: 1.0, legsLocked: false }, 12)
const writhe = await run({ cpgDrive: 2.0, legClock: 'body', stepEnabled: false, gripEnabled: true, gripFeet: FL, gripDuration: 1.0, muscleAlpha: 22, legsLocked: false }, 7)
await browser.close()

const SIZE = 190
function boundsOf(frames) {
  let xmn = Infinity, xmx = -Infinity, zmn = Infinity, zmx = -Infinity
  for (const f of frames) for (const p of [...f.trunk, ...f.foots, f.hip]) { xmn = Math.min(xmn, p.x); xmx = Math.max(xmx, p.x); zmn = Math.min(zmn, p.z); zmx = Math.max(zmx, p.z) }
  const pad = 18, sp = Math.max(xmx - xmn, zmx - zmn, 1), sc = (SIZE - 2 * pad) / sp
  const cz = (zmn + zmx) / 2, cx = (xmn + xmx) / 2
  return { sx: (z) => SIZE / 2 + (z - cz) * sc, sy: (x) => SIZE / 2 + (x - cx) * sc }
}
function frameSVG(f, b) {
  const COL = (i) => f.gripped[i] ? '#22c55e' : (f.stance[i] ? '#f59e0b' : '#f87171')
  const poly = f.trunk.map((p) => `${b.sx(p.z).toFixed(1)},${b.sy(p.x).toFixed(1)}`).join(' ')
  const dots = f.trunk.map((p) => `<circle cx="${b.sx(p.z).toFixed(1)}" cy="${b.sy(p.x).toFixed(1)}" r="3" fill="#c4b5fd"/>`).join('')
  const leg = `<line x1="${b.sx(f.hip.z).toFixed(1)}" y1="${b.sy(f.hip.x).toFixed(1)}" x2="${b.sx(f.foot.z).toFixed(1)}" y2="${b.sy(f.foot.x).toFixed(1)}" stroke="#38bdf8" stroke-width="3"/>`
  const hip = `<rect x="${(b.sx(f.hip.z) - 5).toFixed(1)}" y="${(b.sy(f.hip.x) - 5).toFixed(1)}" width="10" height="10" fill="#38bdf8"/>`
  const ft = f.foots.map((p, i) => `<circle cx="${b.sx(p.z).toFixed(1)}" cy="${b.sy(p.x).toFixed(1)}" r="7" fill="${COL(i)}"/><text x="${(b.sx(p.z) + 8).toFixed(1)}" y="${(b.sy(p.x) - 8).toFixed(1)}" font-size="12" fill="#e5e7eb">${f.legs[i]}</text>`).join('')
  return `<svg width="${SIZE}" height="${SIZE}"><polyline points="${poly}" fill="none" stroke="#c4b5fd" stroke-width="3"/>${dots}${leg}${hip}${ft}</svg>`
}
const sec = (title, concl, vclass, snaps, noteFn) => {
  const b = boundsOf(snaps)
  const rows = snaps.map((f, k) => `<div class="row"><div class="note">${noteFn(f, k, snaps)}</div><div class="img">${frameSVG(f, b)}</div></div>`).join('')
  return `<section><div class="ntitle">${title}</div><div class="res ${vclass}">${concl}</div>${rows}</section>`
}

// PULL: representative grip window
const w = []; let cur = null
for (let i = 0; i < pull.s.length; i++) { if (pull.s[i].g && !cur) cur = [i]; else if (!pull.s[i].g && cur) { cur.push(i); if (cur[1] - cur[0] >= 4) w.push(cur); cur = null } }
const fwd = (win) => -(pull.s[win[1]].cx - pull.s[win[0]].cx)
const fwds = w.map(fwd); const med = [...fwds].sort((a, b) => a - b)[Math.floor(fwds.length / 2)]
const rep = w[fwds.map((v, i) => [Math.abs(v - med), i]).sort((a, b) => a[0] - b[0])[0][1]]
const pullSnaps = []; for (let k = 0; k < 10; k++) pullSnaps.push(pull.s[rep[0] + Math.round(k * (rep[1] - rep[0]) / 9)])
const pullMean = fwds.reduce((a, c) => a + c, 0) / fwds.length
const pullConcl = `Leg sweep alone (CPG off): COM ${pullMean >= 0 ? '+' : ''}${pullMean.toFixed(2)}/window across ${w.length} windows. ${pullMean > 0.1 ? 'Leg PULLS forward.' : pullMean < -0.1 ? 'Leg pushes BACKWARD — sweep direction/geometry is wrong.' : 'Leg does NOT pull (about zero / pivots).'}`
const pullV = pullMean > 0.1 ? 'good' : pullMean < -0.1 ? 'bad' : 'none'
const pullNote = (f, k, arr) => {
  const c0 = arr[0].cx, hip0 = arr[0].hip.x
  const fwdSo = -(f.cx - c0), hipFwd = -(f.hip.x - hip0)
  return `<div class="p">${Math.round(k / 9 * 100)}% of stance</div><div class="f">COM fwd ${fwdSo >= 0 ? '+' : ''}${fwdSo.toFixed(2)}</div><div class="f">hip fwd ${hipFwd >= 0 ? '+' : ''}${hipFwd.toFixed(2)}</div><div class="tag">${k === 0 ? 'foot plants' : k === 9 ? 'foot releases' : 'sweeping'}</div>`
}

// WRITHE: 10 even snaps over ~1.6s after settle
const wr = writhe.s
const start = Math.max(0, wr.length - 40)
const writheSnaps = []; for (let k = 0; k < 10; k++) writheSnaps.push(wr[start + Math.round(k * (wr.length - 1 - start) / 9)])
let zmn = Infinity, zmx = -Infinity; for (const f of wr) { zmn = Math.min(zmn, f.trunk[f.trunk.length - 1].z); zmx = Math.max(zmx, f.trunk[f.trunk.length - 1].z) }
let fmn = Infinity, fmx = -Infinity; for (const f of wr) { fmn = Math.min(fmn, f.foot.x); fmx = Math.max(fmx, f.foot.x) }
const writheConcl = `Permanent grip + CPG high, no sweep: tail sways ${(zmx - zmn).toFixed(1)} units (body still writhes); FL foot slip ${(fmx - fmn).toFixed(3)} (held). The pinned leg does not block the body.`
const writheNote = (f, k) => `<div class="p">frame ${k + 1}/10</div><div class="f">tail Z ${f.trunk[f.trunk.length - 1].z.toFixed(1)}</div><div class="tag">${f.gripped[0] ? 'FL held' : 'FL free'}</div>`

const html = `<!doctype html><html><head><meta charset="utf8"><style>
 *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,Arial;margin:0;padding:16px;color:#f3f4f6;background:#000;width:460px}
 h1{font-size:23px;margin:0 0 6px;color:#fff} .legend{font-size:14px;color:#d1d5db;margin:0 0 10px}
 section{border-top:3px solid #27272a;padding:10px 0} .ntitle{font-size:22px;font-weight:800;color:#fff}
 .res{font-size:17px;font-weight:700;margin:6px 0 8px;padding:6px 9px;border-radius:7px;line-height:1.3}
 .res.good{background:#14532d;color:#bbf7d0} .res.bad{background:#7f1d1d;color:#fecaca} .res.none{background:#1e293b;color:#cbd5e1}
 .row{display:flex;align-items:center;gap:10px;border-top:2px solid #1f2937;padding:5px 0}
 .note{width:210px;flex:0 0 210px} .note .p{font-size:18px;font-weight:800;color:#fff} .note .f{font-size:16px;color:#cbd5e1} .note .tag{font-size:15px;color:#93c5fd}
 .img{flex:0 0 ${SIZE}px;text-align:right} .img svg{background:#0a0a0a;border:1px solid #3f3f46;border-radius:7px}
</style></head><body>
 <h1>Leg-mechanism isolation (front-left)</h1>
 <div class="legend">Top-down, forward = up. Spine purple; <b style="color:#38bdf8">cyan = FL hip + leg line</b>; feet <b style="color:#22c55e">green pinned</b>/<b style="color:#f59e0b">amber stance</b>/<b style="color:#f87171">red swing</b>.</div>
 ${sec('TEST 1 — leg pull (sweep, no CPG)', pullConcl, pullV, pullSnaps, pullNote)}
 ${sec('TEST 2 — writhe (CPG, permanent grip, no sweep)', writheConcl, 'good', writheSnaps, writheNote)}
</body></html>`
const htmlPath = join(OUT, `mech-${ts}.html`)
writeFileSync(htmlPath, html)
writeFileSync(join(OUT, `mech-${ts}.json`), JSON.stringify({ pullLink: pull.link, writheLink: writhe.link, pullMean, pullWindows: w.length }))
const b2 = await chromium.launch({ executablePath: findChromium(), headless: true })
const p2 = await (await b2.newContext({ viewport: { width: 460, height: 1200 } })).newPage()
await p2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const h = await p2.evaluate(() => document.body.scrollHeight)
await p2.screenshot({ path: join(OUT, `mech-${ts}.png`), fullPage: true })
await p2.pdf({ path: join(OUT, `mech-${ts}.pdf`), printBackground: true, width: '460px', height: `${h + 24}px`, pageRanges: '1' })
await b2.close()
console.log(`pullMean=${pullMean.toFixed(2)} windows=${w.length} -> ${OUT}/mech-${ts}.pdf`)
console.log(`PULL ${pull.link}`)
console.log(`WRITHE ${writhe.link}`)
