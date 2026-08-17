// Proves a broken overlay disappears instead of painting a panel over the stream, and that it says why
// over the message channel. Run against dev or a production build:
//   node scripts/check-embed-error.mjs <rig-id>
//
// The failure is forced rather than waited for: getContext is made to throw, which is a render error
// inside the canvas, which is exactly the shape of the client-side exception that produced the grey box.
// The overlay is framed by a same-origin page, because framed is the case that matters — unframed, the
// same failure is supposed to print its stack.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { platform, homedir } from 'os'

const BASE = process.env.EMBED_BASE ?? 'http://localhost:3000'
const [, , RIG] = process.argv
if (!RIG) {
  console.error('usage: node scripts/check-embed-error.mjs <rig-id>')
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
    join(root, d, 'chrome-win64', 'chrome.exe'),
    join(root, d, 'chrome-win', 'chrome.exe'),
    join(root, d, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join(root, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    join(root, d, 'chrome-linux', 'chrome'),
  ]
  for (const d of dirs) for (const exe of candidates(d)) if (existsSync(exe)) return exe
  throw new Error('no chromium binary found — run: npx playwright install chromium')
}

const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({ viewport: { width: 480, height: 320 } })
await ctx.addInitScript(() => {
  HTMLCanvasElement.prototype.getContext = () => {
    throw new Error('check-embed-error: forced canvas failure')
  }
})
const page = await ctx.newPage()

// A same-origin host page. Any route on the origin will do; this one is a 404, which is the cheapest
// document the app will serve.
await page.goto(`${BASE}/__embed-error-host`, { waitUntil: 'domcontentloaded' })
const url = `${BASE}/game/embed#rig=${encodeURIComponent(RIG)}`
await page.evaluate((src) => {
  window.__msgs = []
  window.addEventListener('message', (e) => window.__msgs.push(e.data))
  const frame = document.createElement('iframe')
  frame.id = 'overlay'
  frame.src = src
  frame.style.cssText = 'width:480px;height:320px;border:none;background:transparent'
  document.body.appendChild(frame)
}, url)

await page.waitForTimeout(12000)

const result = await page.evaluate(() => {
  const frame = document.getElementById('overlay')
  const doc = frame.contentDocument
  const body = doc.body
  return {
    bodyBg: doc.defaultView.getComputedStyle(body).backgroundColor,
    htmlBg: doc.defaultView.getComputedStyle(doc.documentElement).backgroundColor,
    text: body.innerText.trim().slice(0, 200),
    errors: window.__msgs.filter((m) => m && m.ns === 'vidstube-overlay' && m.type === 'error'),
  }
})

const transparent = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent'
const checks = [
  ['page stays transparent', transparent(result.bodyBg) && transparent(result.htmlBg)],
  ['nothing is drawn', result.text === ''],
  ['the failure was reported to the host', result.errors.length > 0],
]

console.log(JSON.stringify({ ...result, errors: result.errors.slice(0, 2) }, null, 2))
for (const [name, ok] of checks) console.log(ok ? `PASS  ${name}` : `FAIL  ${name}`)

await browser.close()
process.exit(checks.every(([, ok]) => ok) ? 0 : 1)
