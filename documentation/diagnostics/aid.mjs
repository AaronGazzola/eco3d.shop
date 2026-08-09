import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const D = 'documentation/diagnostics/observe'
const RUNS = [
  ['tail 0.60', 'baseline (D-T2 best so far)', 'nodes-2026-08-08T13-04-30.json', '#58c4ff'],
  ['tail 0.40', 'cut the tail harder', 'nodes-2026-08-08T13-05-36.json', '#7ee787'],
  ['tail 0.25', 'cut the tail hardest', 'nodes-2026-08-08T13-06-18.json', '#d2a8ff'],
  ['hip 0.75', 'cut the hip instead', 'nodes-2026-08-08T13-07-19.json', '#ffa657'],
  ['hip 0.55', 'cut the hip hard', 'nodes-2026-08-08T13-08-03.json', '#ff7b72'],
]

function bendDeg(j) {
  const S = j.samples
  const segLen = j.spec?.segLength ?? []
  const nAx = segLen.length ? segLen.filter((L) => L > 1e-9).length : S[0].nodes.length
  const peak = new Array(nAx - 2).fill(0)
  for (const s of S)
    for (let i = 1; i <= nAx - 2; i++) {
      const a = s.nodes[i - 1], b = s.nodes[i], c = s.nodes[i + 1]
      const ux = b.x - a.x, uz = b.z - a.z, vx = c.x - b.x, vz = c.z - b.z
      const th = Math.abs(Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz)) * 180 / Math.PI
      if (th > peak[i - 1]) peak[i - 1] = th
    }
  return peak
}

const rows = RUNS.map(([name, note, file, colour]) => {
  const j = JSON.parse(readFileSync(join(D, file), 'utf8'))
  const S = j.samples, n = S[0].nodes.length
  const com = (s) => { let x = 0, z = 0; for (const nd of s.nodes) { x += nd.x; z += nd.z } return { x: x / n, z: z / n } }
  const a = com(S[0]), b = com(S[S.length - 1]), T = S[S.length - 1].t - S[0].t
  const deg = bendDeg(j)
  const frac = j.spineFracPeak
  const gd = j.spineGirdleDist, seg = j.spineSeg
  const gi = frac.map((_, i) => i).filter((i) => gd[i] === 0).sort((x, y) => seg[x] - seg[y])
  const front = frac[gi[0]], hind = frac[gi[gi.length - 1]]
  const lo = Math.min(...deg), hi = Math.max(...deg)
  return {
    name, note, colour, deg,
    caps: j.spineCapF.map((r) => (r * 180) / Math.PI),
    speed: Math.hypot(b.x - a.x, b.z - a.z) / T,
    lat: Math.abs(b.z - a.z),
    spread: hi - lo, ratio: hi / lo,
    girdle: hind / front,
    maxCap: j.maxCapFrac,
    clippers: frac.map((f, i) => (f >= 0.995 ? seg[i] : null)).filter((v) => v !== null),
    rollPerSec: j.rollFlips / T, peakRoll: j.maxRollDeg,
    link: j.link,
  }
})

const NJ = Math.min(...rows.map((r) => r.deg.length))
const W = 380, H = 300, PL = 34, PB = 26, PT = 14, PR = 8
const yMax = 34
const X = (i) => PL + (i / (NJ - 1)) * (W - PL - PR)
const Y = (v) => H - PB - (v / yMax) * (H - PB - PT)

const capPts = Array.from({ length: NJ }, (_, i) => `${X(i)},${Y(rows[0].caps[i])}`).join(' ')
const series = rows.map((r) => `
  <polyline points="${r.deg.slice(0, NJ).map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${r.colour}" stroke-width="2"/>
  ${r.deg.slice(0, NJ).map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="2.4" fill="${r.colour}"/>`).join('')}`).join('')

const grid = [0, 10, 20, 30].map((v) => `
  <line x1="${PL}" y1="${Y(v)}" x2="${W - PR}" y2="${Y(v)}" stroke="#30363d" stroke-width="1"/>
  <text x="${PL - 6}" y="${Y(v) + 4}" text-anchor="end" fill="#8b949e" font-size="11">${v}°</text>`).join('')
const xlab = Array.from({ length: NJ }, (_, i) => `<text x="${X(i)}" y="${H - PB + 16}" text-anchor="middle" fill="#8b949e" font-size="11">j${i + 1}</text>`).join('')

// target band 20-21 degrees
const band = `<rect x="${PL}" y="${Y(21)}" width="${W - PL - PR}" height="${Y(20) - Y(21)}" fill="#3fb95022"/>`

const chart = `<svg width="${W}" height="${H}" style="background:#0d1117;border:1px solid #30363d;display:block">
  ${grid}${band}
  <polyline points="${capPts}" fill="none" stroke="#f85149" stroke-width="2" stroke-dasharray="5 3"/>
  ${series}${xlab}
  <text x="${W - PR}" y="${Y(rows[0].caps[NJ - 1]) - 6}" text-anchor="end" fill="#f85149" font-size="11">authored cap</text>
</svg>`

const verdict = (r) => {
  const ok = r.clippers.length === 0
  return `<span style="color:${ok ? '#3fb950' : '#f85149'}">${ok ? 'PASS' : 'FAIL — clips ' + r.clippers.map((s) => 'j' + s).join(',')}</span>`
}

const cards = rows.map((r) => `
  <div style="border:1px solid #30363d;border-radius:6px;padding:10px 12px;margin-bottom:9px;background:#0d1117">
    <div style="font-size:17px;font-weight:700;color:${r.colour}">${r.name}<span style="color:#8b949e;font-weight:400;font-size:13px"> — ${r.note}</span></div>
    <div style="font-size:15px;margin-top:5px">${verdict(r)}</div>
    <div style="font-size:14px;color:#c9d1d9;margin-top:5px;line-height:1.5">
      bend spread <b>${r.spread.toFixed(1)}°</b> &nbsp; max/min <b>${r.ratio.toFixed(2)}</b><br>
      girdle hind/front <b>${r.girdle.toFixed(2)}</b> &nbsp; speed <b>${r.speed.toFixed(2)} u/s</b><br>
      roll ${r.rollPerSec.toFixed(1)}/s at peak ${r.peakRoll.toFixed(2)}°
    </div>
  </div>`).join('')

const html = `<html><body style="margin:0;background:#161b22;color:#c9d1d9;font-family:-apple-system,Segoe UI,sans-serif;padding:14px;width:420px">
  <div style="font-size:22px;font-weight:800;margin-bottom:2px">D-T2 · 5.1b — cutting drive is exhausted</div>
  <div style="font-size:14px;color:#8b949e;margin-bottom:12px;line-height:1.45">
    One lever per run, everything else the approved MuJoCo base swim + head isolation, legs 0.1 kg.
    Gate: every joint under its own cap, bend spread down, girdle ratio toward 1.00.
  </div>

  <div style="font-size:15px;font-weight:700;margin:4px 0 6px">Peak bend per spine joint (degrees)</div>
  ${chart}
  <div style="font-size:13px;color:#8b949e;margin:6px 0 16px;line-height:1.45">
    Red dashed = the printed model's real range of motion (frozen, not a lever). Green band = the
    20–21° uniform target. <b>No variant gets every joint under its cap.</b> Cutting the tail only
    lowers j8–j9 and leaves j7 (cap 22°) on the limit; cutting the hip pushes j6 up onto its cap
    instead and doubles the roll buzz. The front stays flat at 10–15° throughout.
  </div>

  <div style="font-size:15px;font-weight:700;margin:0 0 8px">Per variant</div>
  ${cards}

  <div style="font-size:14px;color:#c9d1d9;border-top:1px solid #30363d;padding-top:10px;line-height:1.55">
    <b>What this says.</b> The front (j1–j4, 10–15°) never rises no matter how much tail is removed,
    so no downward-only profile reaches a uniform 20–21°. The next lever has to <i>lift the front</i>
    (nose/shoulder above 1.0), not cut further.
  </div>
</body></html>`

const p = process.argv[2]
writeFileSync(p.replace(/\.pdf$/, '.html'), html)
function findChromium() {
  try { const p = chromium.executablePath(); if (p && existsSync(p)) return p } catch {}
  const root = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
  for (const d of readdirSync(root).filter((x) => x.startsWith('chromium')).sort().reverse())
    for (const exe of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-win', 'chrome.exe')])
      if (existsSync(exe)) return exe
  throw new Error('no chromium')
}
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const page = await browser.newPage({ viewport: { width: 420, height: 1400 } })
await page.setContent(html)
await page.waitForTimeout(300)
await page.pdf({ path: p, width: '440px', height: '1500px', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
await browser.close()
console.log('wrote', p)
for (const r of rows) console.log(r.name, '->', r.link)
