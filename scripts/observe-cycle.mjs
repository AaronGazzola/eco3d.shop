// Walk-cycle observation: drive a preset with the stance/wave overlays on, capture a left-to-right
// sequence of side-view frames over about one stride, and emit a landscape PDF (images in sequence,
// each captioned with phase + which feet are in stance) plus a one-click shareable config link.
//
//   node scripts/observe-cycle.mjs [preset] [frames] [stepMs]
//   node scripts/observe-cycle.mjs "Walk — mid" 6 350
import { chromium } from 'playwright-core'
import { mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'

const BASE = process.env.OBSERVE_URL ?? 'http://127.0.0.1:3002'
const RIG = process.env.OBSERVE_RIG ?? 'baby cyber dragon'
const AUTH = 'scripts/.observe-auth.json'
const OUT = 'documentation/diagnostics/cycle'
const [, , PRESET = 'Walk — mid', FRAMES = '6', STEPMS = '350', BOOST = '', FOOT = ''] = process.argv
const nFrames = Number(FRAMES)
const stepMs = Number(STEPMS)
const boost = BOOST === '' ? null : Number(BOOST)
const foot = FOOT || null // 'FL'|'FR'|'BL'|'BR' => grip only this foot, sweep off, isolate it

function findChromium() {
  try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = platform() === 'win32'
    ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
    : platform() === 'darwin' ? join(homedir(), 'Library', 'Caches', 'ms-playwright') : join(homedir(), '.cache', 'ms-playwright')
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()
  for (const d of dirs) for (const exe of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-win', 'chrome.exe'), join(root, d, 'chrome-linux', 'chrome')]) if (existsSync(exe)) return exe
  throw new Error('no chromium')
}
const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ viewport: { width: 1100, height: 820 }, ...(existsSync(AUTH) ? { storageState: AUTH } : {}) })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', String(e).slice(0, 200)))

async function loadRig() {
  try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
  const wizard = await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false)
  if (wizard) for (const txt of ['1.Pick Model', 'Load', RIG, '3.Animate']) { await page.getByText(rx(txt)).first().click({ timeout: 8000 }); await page.waitForTimeout(1500) }
  await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
}

await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)
await loadRig()

const applied = await page.evaluate(({ name, boost, foot }) => {
  // forgive a plain hyphen for the em-dash in preset names ("Walk - mid" -> "Walk — mid")
  if (!window.__studio.preset(name)) window.__studio.preset(name.replace(/\s-\s/g, ' — '))
  if (boost != null) window.__studio.apply({ stanceMuscleBoost: boost })
  if (foot) {
    // Isolate ONE foot: only it grips, leg sweep OFF, so the only forward force is the body
    // levering over that planted foot through the spine wave. Dim everything but that limb.
    window.__studio.apply({ gripEnabled: true, stepEnabled: false, gripFeet: { FL: false, FR: false, BL: false, BR: false, [foot]: true } })
    window.__studio.isolateLimb(foot)
  }
  window.__studio.setOverlays(['stance', 'wave'])
  window.__studio.drive(true)
  return window.__studio.getConfig()
}, { name: PRESET, boost, foot })
await page.evaluate(() => window.__studio.setCam('side'))
await sleep(2500)

const frames = []
for (let k = 0; k < nFrames; k++) {
  const state = await page.evaluate(() => ({ t: window.__studio.getSimTime(), obs: window.__locObs, d: window.__studio.diag() }))
  const png = await page.screenshot({ clip: { x: 60, y: 0, width: 900, height: 760 } })
  writeFileSync(join(OUT, `frame-${ts}-${k}.png`), png)
  frames.push({ k, state, b64: png.toString('base64') })
  const legs = state.obs?.legs ?? []
  const stanceList = legs.filter((_, i) => state.obs?.stance?.[i]).join(',') || 'none'
  const ph = legs.map((l, i) => `${l}:${(state.obs?.phase?.[i] ?? 0).toFixed(2)}${state.obs?.stance?.[i] ? '*' : ''}`).join(' ')
  console.log(`frame ${k}: t=${state.t.toFixed(2)}s drift=${state.d.comDriftFromStart.toFixed(2)} comX=${state.d.comX.toFixed(2)} tilt=${(state.d.maxTiltDeg ?? 0).toFixed(1)} | ${ph}`)
  await sleep(stepMs)
}
const link = await page.evaluate(() => window.__studio.buildLink())
await page.evaluate(() => window.__studio.drive(false))

// Build a landscape PDF: frames left-to-right, each captioned with what to look at and why.
const cell = (f) => {
  const legs = f.state.obs?.legs ?? []
  const stance = legs.map((l, i) => `<b style="color:${f.state.obs?.stance?.[i] ? '#16a34a' : '#dc2626'}">${l}</b>`).join(' ')
  const phaseFL = (f.state.obs?.phase?.[0] ?? 0).toFixed(2)
  return `<div class="cell">
    <img src="data:image/png;base64,${f.b64}" />
    <div class="cap"><div class="t">frame ${f.k} · t=${f.state.t.toFixed(2)}s · phaseFL=${phaseFL}</div>
    <div>feet (green=stance/push, red=swing): ${stance}</div></div>
  </div>`
}
const html = `<!doctype html><html><head><meta charset="utf8"><style>
  body{font-family:system-ui,Segoe UI,Arial;margin:14px;color:#f3f4f6;background:#000}
  h1{font-size:16px;margin:0 0 2px;color:#fff} .sub{font-size:11px;color:#9ca3af;margin:0 0 8px}
  .row{display:flex;gap:6px} .cell{flex:1} .cell img{width:100%;border:1px solid #3f3f46;border-radius:4px}
  .cap{font-size:10px;line-height:1.3;margin-top:3px;color:#d1d5db} .cap .t{font-weight:600;color:#fff}
  .foot{font-size:10px;color:#d1d5db;margin-top:8px;border-top:1px solid #27272a;padding-top:5px}
</style></head><body>
  <h1>Walk cycle — preset "${PRESET}" (drive ${applied.cpgDrive}, stance spine boost ${applied.stanceMuscleBoost})</h1>
  <p class="sub">Side view, stance+wave overlays on. Green sphere = foot gripping / power-stroke; red = foot swinging; small octahedron = each girdle's max-forward-reach point (hue by phase). Read left to right across about one stride.</p>
  <div class="row">${frames.map(cell).join('')}</div>
  <p class="foot"><b>What to look at:</b> whether the green (stance) feet form a diagonal pair and stay planted while the body advances over them, and whether feet turn green at full forward reach (near the reach marker) and red as they swing back. <b>Gate:</b> body moves forward, stays upright (tilt small), feet alternate stance/swing in a diagonal pattern. <b>Known gap (Stage 1):</b> the push reads as the body wave dragging the legs rather than the legs+spine driving the body.</p>
</body></html>`
const htmlPath = join(OUT, `walk-cycle-${ts}.html`)
writeFileSync(htmlPath, html)
const page2 = await ctx.newPage()
await page2.goto('file://' + join(process.cwd(), htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' })
const pdfPath = join(OUT, `walk-cycle-${ts}.pdf`)
await page2.pdf({ path: pdfPath, landscape: true, printBackground: true, width: '14in', height: '8in', margin: { top: '0.2in', bottom: '0.2in', left: '0.2in', right: '0.2in' } })

await browser.close()
console.log(`\nPDF:  ${pdfPath}`)
console.log(`LINK: ${link}`)
