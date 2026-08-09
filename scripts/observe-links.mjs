// Build shareable studio links for a set of named configs, WITHOUT running a sim.
//
// The observe-loop rule is that a link is never hand-assembled: it must come out of the app's own
// buildLink(), so it cannot drift from what the app actually accepts. This script loads the studio,
// applies each config absolutely (so nothing leaks between configs), sets the leg weight, and reads
// the link back.
//
//   node scripts/observe-links.mjs scripts/spaces/confirm.json --legw 0.1 --set headIsolated=true
//
// Reads the `anchors` array of a space file: each anchor is a partial config plus a `label`.
// A `fixed` object in the same file is merged under every anchor. --set applies on top of both.

import { chromium } from 'playwright-core'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'

const BASE = process.env.OBSERVE_URL ?? 'http://127.0.0.1:3002'
const RIG = process.env.OBSERVE_RIG ?? 'baby cyber dragon'
const AUTH = 'scripts/.observe-auth.json'

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

function coerce(v) {
  if (v === 'true') return true
  if (v === 'false') return false
  const n = Number(v)
  return Number.isFinite(n) && v.trim() !== '' ? n : v
}

const [, , SPACE_FILE, ...REST] = process.argv
if (!SPACE_FILE) throw new Error('usage: node scripts/observe-links.mjs <space.json> [--legw n] [--set k=v]')

let legw = null
const sets = {}
for (let i = 0; i < REST.length; i++) {
  if (REST[i] === '--legw') legw = Number(REST[++i])
  else if (REST[i] === '--set') {
    const [k, ...v] = REST[++i].split('=')
    sets[k] = coerce(v.join('='))
  }
}

const space = JSON.parse(readFileSync(SPACE_FILE, 'utf8'))
const anchors = space.anchors
if (!Array.isArray(anchors) || anchors.length === 0) throw new Error(`${SPACE_FILE} has no anchors array`)

const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ...(existsSync(AUTH) ? { storageState: AUTH } : {}),
})
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', String(e).slice(0, 200)))

const rx = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

await page.goto(`${BASE}/admin/animate`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(1500)

try { await page.waitForFunction(() => !!window.__studio, null, { timeout: 4000 }) } catch {}
if (await page.getByText(rx('1.Pick Model')).first().isVisible().catch(() => false)) {
  for (const txt of ['1.Pick Model', 'Load', RIG, '3.Animate']) {
    await page.getByText(rx(txt)).first().click({ timeout: 8000 })
    await page.waitForTimeout(1500)
  }
  await page.waitForFunction(() => !!window.__studio, null, { timeout: 8000 })
}

const out = []
for (const anchor of anchors) {
  const { label, ...rest } = anchor
  const config = { ...(space.fixed ?? {}), ...rest, ...sets }
  const link = await page.evaluate(
    ([cfg, w]) => {
      window.__studio.applyAbsolute(cfg)
      if (w != null) window.__studio.legWeight(w)
      return window.__studio.buildLink()
    },
    [config, legw],
  )
  // Read the config back out of the app so the printed summary is what the app holds, not what was sent.
  const applied = await page.evaluate(() => window.__studio.getConfig())
  out.push({ label: label ?? '(unlabelled)', link, applied })
  console.log(`\n## ${label ?? '(unlabelled)'}`)
  console.log(link)
}

console.log('\n--- what the app holds after each apply ---')
for (const { label, applied } of out) {
  console.log(
    `${label.padEnd(28)} engine=${applied.simEngine} drag=${applied.environmentEnabled} head=${applied.headIsolated} ` +
      `drive=${applied.cpgDrive} a=${applied.muscleAlpha} wave=${applied.waveNose}/${applied.waveShoulder}/${applied.waveHip}/${applied.waveTailMid}/${applied.waveTailTip} ` +
      `thrust=${applied.footThrustEnabled ? applied.footThrustGain : 'off'} shift=${applied.footThrustShift}/${applied.footThrustShiftHind}`,
  )
}

// Round-trip proof. The observe-loop rule is that a link is proved, not asserted: a link that
// reproduces MOST of the state is worse than none. Each link is opened in a FRESH page (so nothing
// can be inherited from the session that built it) and the config read back must match key for key.
console.log('\n--- round trip: each link opened fresh, config compared key by key ---')
let failures = 0
for (const { label, link, applied } of out) {
  const fresh = await ctx.newPage()
  await fresh.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await fresh.waitForTimeout(1200)
  try { await fresh.waitForFunction(() => !!window.__studio, null, { timeout: 8000 }) } catch {}
  const reloaded = await fresh.evaluate(() => window.__studio.getConfig())
  const legLoaded = await fresh.evaluate(() => {
    const g = window.__studio.diag && null
    return g
  }).catch(() => null)
  const diffs = Object.keys(applied).filter((k) => JSON.stringify(applied[k]) !== JSON.stringify(reloaded[k]))
  if (diffs.length === 0) console.log(`PASS  ${label}`)
  else {
    failures++
    console.log(`FAIL  ${label} — ${diffs.length} key(s) differ:`)
    for (const k of diffs) console.log(`        ${k}: built ${JSON.stringify(applied[k])} → reloaded ${JSON.stringify(reloaded[k])}`)
  }
  void legLoaded
  await fresh.close()
}
console.log(failures === 0 ? '\nall links reproduce their config exactly' : `\n${failures} link(s) do NOT reproduce — do not hand these over`)

await browser.close()
