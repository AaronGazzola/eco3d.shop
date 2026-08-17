// Proves the public overlay page renders a moving creature with no session, and that the page is
// actually transparent rather than merely styled to look it. Run against a production build:
//   npm run prod:3001            (in one shell)
//   node scripts/verify-embed.mjs <rig-id> [seconds]
//
// A frame in the DOM is not evidence — a blank canvas is also in the DOM. The evidence is: no login
// form, a WebGL context created with an alpha buffer, and two screenshots that differ.
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { platform, homedir } from 'os'

const BASE = process.env.EMBED_BASE ?? 'http://localhost:3001'
const OUT = 'docs/diagnostics/observe'
const [, , RIG, SECONDS = '20'] = process.argv
if (!RIG) {
  console.error('usage: node scripts/verify-embed.mjs <rig-id> [seconds]')
  process.exit(1)
}

function findChromium() {
  try {
    const p = chromium.executablePath()
    if (p && existsSync(p)) return p
  } catch {}
  const root =
    platform() === 'win32'
      ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
      : platform() === 'darwin'
        ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(homedir(), '.cache', 'ms-playwright')
  if (!existsSync(root)) throw new Error(`no ms-playwright cache at ${root} — run: npx playwright install chromium`)
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()
  const candidates = (d) => [
    join(root, d, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    join(root, d, 'chrome-win64', 'chrome.exe'),
    join(root, d, 'chrome-win', 'chrome.exe'),
    join(root, d, 'chrome-linux', 'chrome'),
  ]
  for (const d of dirs) for (const exe of candidates(d)) if (existsSync(exe)) return exe
  throw new Error('no chromium binary found — run: npx playwright install chromium')
}

mkdirSync(OUT, { recursive: true })
// An encoded SimConfig may be passed as a third argument. Without one the page runs whatever the
// defaults are, which since Phase T1 means no tank — and with no tank the fixed camera has no volume to
// frame, so the run would photograph an empty pane and call it a pass.
const SIM = process.argv.slice(4).find((a) => !a.startsWith('--'))
const LEGW = process.env.EMBED_LEGW ?? '0.1'
// Proves the tank boundary outline actually renders. A run with the flag is compared against one without
// it over a thin strip along the window's edge: the outline sits just inside that edge, and at the start
// of a run the creature is centred and nowhere near it.
const WANT_BOUNDS = process.argv.includes('--bounds')
// Wide enough to contain the outline's left edge, which is not flush with the window: the fit leaves 5%
// of room around the floor, putting the line about 11px in on a 480-wide window. Still far from the
// creature, which starts centred.
const EDGE_STRIP_WIDTH = 24
const embedUrl = (withBounds) =>
  `${BASE}/game/embed#rig=${encodeURIComponent(RIG)}` +
  (SIM ? `&sim=${encodeURIComponent(SIM)}&legw=${encodeURIComponent(LEGW)}` : '') +
  (withBounds ? '&bounds=1' : '')
const url = embedUrl(WANT_BOUNDS)
// The window the game is framed in. The overlay box is resizable, so a run at one shape proves nothing
// about another: a reshaped window has to be watched, not argued about.
const BOX_ARG = process.argv.find((a) => a.startsWith('--box='))
const [BOX_W, BOX_H] = BOX_ARG
  ? BOX_ARG.slice('--box='.length).split('x').map(Number)
  : [480, 320]
if (!Number.isFinite(BOX_W) || !Number.isFinite(BOX_H) || BOX_W <= 0 || BOX_H <= 0) {
  console.error('usage: --box=<width>x<height>')
  process.exit(1)
}

const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
// A fresh context: no storage state, so no session — exactly what an OBS browser source is.
const ctx = await browser.newContext({ viewport: { width: BOX_W, height: BOX_H } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

console.log('opening', url)
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 60000 })
await page.waitForTimeout(4000)

const loginVisible = await page.getByText(/sign in|password/i).first().isVisible().catch(() => false)

const surface = await page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    canvasAlpha: gl ? gl.getContextAttributes().alpha : null,
    canvasSize: canvas ? [canvas.width, canvas.height] : null,
  }
})

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const edgeWithFlag = WANT_BOUNDS ? await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: EDGE_STRIP_WIDTH, height: BOX_H } }) : null
const shotA = await page.screenshot({ omitBackground: true })
writeFileSync(join(OUT, `embed-${stamp}-t0.png`), shotA)
await page.waitForTimeout(Number(SECONDS) * 1000)
const shotB = await page.screenshot({ omitBackground: true })
writeFileSync(join(OUT, `embed-${stamp}-t1.png`), shotB)

// The same link without the flag, photographed over the same strip. An empty strip compresses to fewer
// bytes than one carrying the outline, so no pixel decoder is needed to tell them apart.
let boundsDrawn = null
if (WANT_BOUNDS) {
  const bare = await ctx.newPage()
  await bare.goto(embedUrl(false), { waitUntil: 'domcontentloaded' })
  await bare.waitForSelector('canvas', { timeout: 60000 })
  await bare.waitForTimeout(4000)
  const edgeWithout = await bare.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: EDGE_STRIP_WIDTH, height: BOX_H } })
  await bare.close()
  boundsDrawn = !edgeWithFlag.equals(edgeWithout) && edgeWithFlag.length > edgeWithout.length
  console.log('edge strip with the flag:', `${edgeWithFlag.length} bytes`)
  console.log('edge strip without it:   ', `${edgeWithout.length} bytes`)
}

const moved = !shotA.equals(shotB)
const transparent =
  (surface.bodyBg === 'rgba(0, 0, 0, 0)' || surface.bodyBg === 'transparent') &&
  (surface.htmlBg === 'rgba(0, 0, 0, 0)' || surface.htmlBg === 'transparent') &&
  surface.canvasAlpha === true

console.log('login form shown:      ', loginVisible)
console.log('canvas size:           ', surface.canvasSize?.join(' x '))
console.log('page background:       ', `body=${surface.bodyBg} html=${surface.htmlBg}`)
console.log('canvas alpha buffer:   ', surface.canvasAlpha)
console.log(`moved over ${SECONDS}s:      `, moved)
if (WANT_BOUNDS) console.log('boundary outline drawn:', boundsDrawn)
console.log('console errors:        ', errors.length === 0 ? 'none' : errors.join(' | '))
console.log('screenshots:           ', join(OUT, `embed-${stamp}-t0.png`), join(OUT, `embed-${stamp}-t1.png`))

await browser.close()
const ok = !loginVisible && transparent && moved && errors.length === 0 && (!WANT_BOUNDS || boundsDrawn)
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
