// Visual observation harness — drives the real app in a headless chromium and screenshots the 3D
// canvas from multiple angles over time, so the actual RENDERED behaviour (lift-off, spin, thrash)
// can be SEEN, not inferred from numbers. The studio render draws each segment at its real physics
// transform, so the frames are truthful. See documentation/observation-loop.md for the full process.
//
// MUST run from the REAL host (PowerShell tool), NOT the Bash sandbox — the sandbox reaches
// localhost but resets the external Supabase auth fetch. Needs the app server up on 127.0.0.1:3002.
// Uses the chromium already installed under ms-playwright (no admin). Auth cached after `login`.
//
//   node scripts/observe-swim.mjs login                       # sign in once, cache the session
//   node scripts/observe-swim.mjs controls                    # dump visible clickable controls
//   node scripts/observe-swim.mjs run [secs] [on|off] [drive] [exc]   # run sim, multi-angle capture
//
// Outputs to documentation/diagnostics/frames/: f<NN>_<angle>.png per second + contact-sheet.png.

import { chromium } from 'playwright-core'
import { mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function findChromium() {
  const root = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort()
  for (const d of dirs.reverse()) {
    for (const exe of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-win', 'chrome.exe')]) {
      if (existsSync(exe)) return exe
    }
  }
  throw new Error('no chromium found under ms-playwright — run: npx playwright install chromium')
}

const EXE = findChromium()
const BASE = process.env.OBSERVE_URL ?? 'http://127.0.0.1:3002'
const EMAIL = process.env.OBSERVE_EMAIL ?? 'aaron@gazzola.dev'
const PASS = process.env.OBSERVE_PASS ?? 'password123!'
const RIG = process.env.OBSERVE_RIG ?? 'baby cyber dragon'
const OUT = 'documentation/diagnostics/frames'
const AUTH = 'scripts/.observe-auth.json'
// The swimmer body lies along X, so the 'front' preset ([0,4,22], looking down −Z) is the lengthwise
// SIDE PROFILE (height vs length) — best for spotting lift-off; 'top' shows the planar wave; 'reset'
// is the 3/4 overview. ('side' [22,4,0] looks down the spine — axial, not useful here.)
const ANGLES = ['front', 'top', 'reset']
const [, , CMD = 'controls', ...REST] = process.argv

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ...(existsSync(AUTH) && CMD !== 'login' ? { storageState: AUTH } : {}),
})
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text().slice(0, 200)) })
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', String(e).slice(0, 200)))

const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

async function dumpControls(tag) {
  const els = await page.evaluate(() => {
    const out = []
    for (const e of document.querySelectorAll('button,[role=button],a,input,select,[role=tab],[role=slider]')) {
      const r = e.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const t = (e.innerText || e.value || e.getAttribute('aria-label') || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 50)
      out.push(`${e.tagName.toLowerCase()} "${t}"`)
    }
    return out
  })
  console.log(`--- controls (${tag}) ---\n${els.join('\n')}`)
}

async function loadRig() {
  for (const txt of ['1.Pick Model', 'Load', RIG, '3.Animate']) {
    await page.getByText(rx(txt)).first().click({ timeout: 8000 })
    await page.waitForTimeout(1500)
  }
  // wait for the dev observation hook to mount
  await page.waitForFunction(() => !!(window.__studio), null, { timeout: 8000 })
}

await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)

if (CMD === 'login') {
  if (await page.getByLabel('Email').count().catch(() => 0)) {
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASS)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForTimeout(6000)
  }
  await ctx.storageState({ path: AUTH })
  console.log('logged in, session cached. url=', page.url())
} else if (CMD === 'controls') {
  await dumpControls('current')
} else if (CMD === 'run') {
  const seconds = Number(REST[0] ?? 20)
  const drag = (REST[1] ?? 'on') === 'on'
  const drive = REST[2] != null ? Number(REST[2]) : null
  const exc = REST[3] != null ? Number(REST[3]) : null

  await loadRig()
  await page.evaluate(({ drag, drive, exc }) => {
    if (drive != null && exc != null) window.__studio.tune(drive, exc)
    window.__studio.drag(drag)
    window.__studio.drive(true)
  }, { drag, drive, exc })
  console.log(`running: drag=${drag ? 'ON' : 'OFF'} drive=${drive ?? 'default'} exc=${exc ?? 'default'} angles=${ANGLES.join(',')}`)

  const rows = []
  const camWait = 250
  const perAngle = ANGLES.length * camWait
  for (let t = 1; t <= seconds; t++) {
    await page.waitForTimeout(Math.max(0, 1000 - perAngle))
    const files = {}
    for (const a of ANGLES) {
      await page.evaluate((a) => window.__studio.setCam(a), a)
      await page.waitForTimeout(camWait)
      const f = `f${String(t).padStart(2, '0')}_${a}.png`
      await page.screenshot({ path: `${OUT}/${f}`, clip: { x: 0, y: 0, width: 980, height: 900 } })
      files[a] = f
    }
    const d = await page.evaluate(() => window.__studio.diag())
    rows.push({ t, files, d })
    console.log(`t=${t}s  KE=${d.kineticEnergy.toExponential(2)}  drift=${d.comDriftFromStart.toFixed(3)}  maxJ=${Math.round(d.maxJointFracOfCap * 100)}%`)
  }
  await page.evaluate(() => window.__studio.drive(false))
  await buildContactSheet(rows)
  console.log(`saved ${rows.length}×${ANGLES.length} frames + contact-sheet.png to ${OUT}/`)
}

async function buildContactSheet(rows) {
  // subsample to ~8 rows for legibility; embed PNGs as data URLs (no image libs needed)
  const step = Math.max(1, Math.ceil(rows.length / 8))
  const pick = rows.filter((_, i) => i % step === 0)
  const dataUrl = (f) => 'data:image/png;base64,' + readFileSync(`${OUT}/${f}`).toString('base64')
  const html = `<html><body style="margin:0;background:#222;font-family:monospace;color:#ddd">
  <div style="display:grid;grid-template-columns:120px repeat(${ANGLES.length},1fr);gap:2px">
    <div></div>${ANGLES.map((a) => `<div style="text-align:center;padding:4px">${a}</div>`).join('')}
    ${pick.map((r) => `
      <div style="font-size:11px;padding:4px">t=${r.t}s<br>KE=${r.d.kineticEnergy.toExponential(1)}<br>drift=${r.d.comDriftFromStart.toFixed(2)}<br>maxJ=${Math.round(r.d.maxJointFracOfCap * 100)}%</div>
      ${ANGLES.map((a) => `<img src="${dataUrl(r.files[a])}" style="width:100%;display:block">`).join('')}
    `).join('')}
  </div></body></html>`
  const p2 = await ctx.newPage()
  await p2.setContent(html)
  await p2.waitForTimeout(300)
  await p2.screenshot({ path: `${OUT}/contact-sheet.png`, fullPage: true })
  await p2.close()
}

await browser.close()
