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
const SIM = process.argv[4]
const LEGW = process.env.EMBED_LEGW ?? '0.1'
const url =
  `${BASE}/game/embed#rig=${encodeURIComponent(RIG)}` +
  (SIM ? `&sim=${encodeURIComponent(SIM)}&legw=${encodeURIComponent(LEGW)}` : '')
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
// A fresh context: no storage state, so no session — exactly what an OBS browser source is.
const ctx = await browser.newContext({ viewport: { width: 480, height: 320 } })
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
const shotA = await page.screenshot({ omitBackground: true })
writeFileSync(join(OUT, `embed-${stamp}-t0.png`), shotA)
await page.waitForTimeout(Number(SECONDS) * 1000)
const shotB = await page.screenshot({ omitBackground: true })
writeFileSync(join(OUT, `embed-${stamp}-t1.png`), shotB)

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
console.log('console errors:        ', errors.length === 0 ? 'none' : errors.join(' | '))
console.log('screenshots:           ', join(OUT, `embed-${stamp}-t0.png`), join(OUT, `embed-${stamp}-t1.png`))

await browser.close()
const ok = !loginVisible && transparent && moved && errors.length === 0
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
