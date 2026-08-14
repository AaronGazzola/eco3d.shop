// Captures the home page game surface twice, a few seconds apart, to show the same creature the overlay
// shows and to show that it is moving. Run against a production build:
//   doppler run -- npx next start -p 3002
//   node scripts/capture-home.mjs [seconds]
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { platform, homedir } from 'os'

const BASE = process.env.EMBED_BASE ?? 'http://localhost:3002'
const OUT = 'docs/diagnostics/observe'
const SECONDS = Number(process.argv[2] ?? '15')

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
  if (!existsSync(root)) throw new Error(`no ms-playwright cache at ${root}`)
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()
  for (const d of dirs) {
    for (const c of [
      join(root, d, 'chrome-win64', 'chrome.exe'),
      join(root, d, 'chrome-win', 'chrome.exe'),
      join(root, d, 'chrome-linux', 'chrome'),
    ]) {
      if (existsSync(c)) return c
    }
  }
  throw new Error('no chromium found in the playwright cache')
}

mkdirSync(OUT, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 960, height: 640 } })
const page = await context.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

console.log(`opening ${BASE}/`)
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(8000)

const a = join(OUT, `home-${stamp}-t0.png`)
await page.screenshot({ path: a })
await page.waitForTimeout(SECONDS * 1000)
const b = join(OUT, `home-${stamp}-t1.png`)
await page.screenshot({ path: b })

const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'))
const feedEnabled = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'Feed')
  return b ? !b.disabled : false
})

console.log(`canvas present:   ${hasCanvas}`)
console.log(`feed enabled:     ${feedEnabled}`)
console.log(`console errors:   ${errors.length === 0 ? 'none' : errors.join(' | ')}`)
console.log(`screenshots:      ${a} ${b}`)

await browser.close()
