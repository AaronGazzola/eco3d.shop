import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const D = 'documentation/diagnostics/observe'
const R = JSON.parse(readFileSync(join(D, 'sweep-2026-08-08T15-32-29.json'), 'utf8')).results
const GAIN = JSON.parse(readFileSync(join(D, 'sweep-2026-08-08T15-11-03.json'), 'utf8')).results

const COLOUR = { 'EVEN g4  (evenest spine)': '#58c4ff', 'EVEN g2  (same shape, slower)': '#7ee787', 'HIPS g4  (girdle-targeted)': '#ffa657', 'AMP  g4  (amplitude-targeted)': '#d2a8ff', 'BASE g0  (5.1b baseline, no thrust)': '#8b949e' }
const rows = R.map((r) => ({ ...r, colour: COLOUR[r.label] ?? '#fff' }))

// ---- per-joint bend profile ----
const caps = rows[0].score.caps, segs = rows[0].score.bendSeg, NJ = caps.length
const CW = 380, CH = 250, CL = 34, CB = 26, CT = 12, CR = 8, yM = 34
const cx = (i) => CL + (i / (NJ - 1)) * (CW - CL - CR)
const cy = (v) => CH - CB - (Math.min(v, yM) / yM) * (CH - CB - CT)
const cgrid = [0, 10, 20, 30].map((v) => `<line x1="${CL}" y1="${cy(v)}" x2="${CW - CR}" y2="${cy(v)}" stroke="#30363d"/><text x="${CL - 5}" y="${cy(v) + 4}" text-anchor="end" fill="#8b949e" font-size="10">${v}°</text>`).join('')
const chart = `<svg width="${CW}" height="${CH}" style="background:#0d1117;border:1px solid #30363d;display:block">
  ${cgrid}
  <rect x="${CL}" y="${cy(22)}" width="${CW - CL - CR}" height="${cy(20) - cy(22)}" fill="#3fb95033"/>
  ${[1, 5].map((i) => `<line x1="${cx(i)}" y1="${CT}" x2="${cx(i)}" y2="${CH - CB}" stroke="#ffffff22" stroke-width="6"/>`).join('')}
  <polyline points="${caps.map((c, i) => `${cx(i)},${cy(c)}`).join(' ')}" fill="none" stroke="#f85149" stroke-width="2" stroke-dasharray="5 3"/>
  ${rows.map((r) => `<polyline points="${r.score.bendDeg.map((d, i) => `${cx(i)},${cy(d)}`).join(' ')}" fill="none" stroke="${r.colour}" stroke-width="${r.label.startsWith('BASE') ? 1.5 : 2}"${r.label.startsWith('BASE') ? ' stroke-dasharray="3 2"' : ''}/>`).join('')}
  ${segs.map((s, i) => `<text x="${cx(i)}" y="${CH - CB + 15}" text-anchor="middle" fill="#8b949e" font-size="9">${s}</text>`).join('')}
</svg>`

// ---- the gain ladder on one shape ----
const GW = 380, GH = 200, GL = 40, GB = 30, GT = 12, GR = 34
const gains = GAIN.map((r) => r.vars.footThrustGain)
const gx = (g) => GL + (g / 6) * (GW - GL - GR)
const gy = (v, max) => GH - GB - (v / max) * (GH - GB - GT)
const speedMax = 4.5, spreadMax = 12
const line = (fn, max, colour) => `<polyline points="${GAIN.map((r) => `${gx(r.vars.footThrustGain)},${gy(fn(r.score), max)}`).join(' ')}" fill="none" stroke="${colour}" stroke-width="2"/>`
const ladder = `<svg width="${GW}" height="${GH}" style="background:#0d1117;border:1px solid #30363d;display:block">
  ${[0, 1, 2, 3, 4].map((v) => `<line x1="${GL}" y1="${gy(v, speedMax)}" x2="${GW - GR}" y2="${gy(v, speedMax)}" stroke="#30363d"/><text x="${GL - 5}" y="${gy(v, speedMax) + 4}" text-anchor="end" fill="#3fb950" font-size="10">${v}</text>`).join('')}
  ${line((s) => s.speed, speedMax, '#3fb950')}
  ${line((s) => s.bendSpread, spreadMax, '#58c4ff')}
  ${line((s) => Math.abs(s.girdleRatio - 1) * 10, spreadMax, '#ffa657')}
  ${gains.map((g) => `<text x="${gx(g)}" y="${GH - GB + 15}" text-anchor="middle" fill="#8b949e" font-size="10">${g}</text>`).join('')}
  <text x="${GW / 2}" y="${GH - 3}" text-anchor="middle" fill="#8b949e" font-size="10">thrust gain (N per foot) →</text>
  <text x="${GW - GR + 4}" y="${gy(2.85, speedMax)}" fill="#3fb950" font-size="10">speed</text>
  <text x="${GW - GR + 4}" y="${gy(5.9, spreadMax)}" fill="#58c4ff" font-size="10">spread</text>
  <text x="${GW - GR + 4}" y="${gy(1.0, spreadMax)}" fill="#ffa657" font-size="10">hips</text>
</svg>`

const f = (x, d = 2) => (x == null ? '—' : Number(x).toFixed(d))
const cards = rows.map((r) => {
  const s = r.score, v = r.vars, ok = !s.clips
  return `<div style="border:1px solid ${ok ? '#30363d' : '#f8514966'};border-radius:6px;padding:10px 12px;margin-bottom:9px;background:#0d1117">
    <div style="font-size:17px;font-weight:700;color:${r.colour}">${r.label}</div>
    <div style="font-size:13px;color:#8b949e;margin-top:3px;font-family:monospace">push ${v.cpgDrive} · muscle ${v.muscleAlpha} · ${v.waveNose}/${v.waveShoulder}/${v.waveHip}/${v.waveTailMid}/${v.waveTailTip} · thrust ${v.footThrustGain}</div>
    <div style="font-size:15px;margin-top:6px;color:${ok ? '#3fb950' : '#f85149'}">${ok ? 'nothing at its cap' : 'CLIPS ' + s.clippers.map((x) => 'seg' + x).join(', ')}</div>
    <div style="font-size:14px;color:#c9d1d9;margin-top:5px;line-height:1.55">
      bend <b>${f(s.bendMin, 1)}–${f(s.bendMax, 1)}°</b>, spread <b>${f(s.bendSpread, 1)}°</b>, mean ${f(s.bendMean, 1)}°<br>
      hips <b>${f(s.girdleFrontDeg, 1)}° → ${f(s.girdleHindDeg, 1)}°</b> (ratio ${f(s.girdleRatio)})<br>
      speed <b>${f(s.speed)} u/s</b> &nbsp; wave size ${f(s.swingPeak)}<br>
      curvature <b>${f((s.curvePct ?? 0) * 100)}%</b> (heading ${f(s.headingDeg, 1)}°)<br>
      roll ${f(s.rollPerSec, 1)}/s at peak ${f(s.peakRollDeg)}°
    </div>
  </div>`
}).join('')

const html = `<html><body style="margin:0;background:#161b22;color:#c9d1d9;font-family:-apple-system,Segoe UI,sans-serif;padding:14px;width:420px">
  <div style="font-size:22px;font-weight:800;margin-bottom:2px">Thrust back on — the trade-off was an artefact</div>
  <div style="font-size:14px;color:#8b949e;margin-bottom:14px;line-height:1.45">
    With joint 7 raised to 28° and foot thrust restored, evenness, hip equality and speed
    improve <i>together</i>. They only fought each other on a body that was barely moving.
  </div>

  <div style="font-size:15px;font-weight:700;margin:0 0 6px">One shape, thrust turned up</div>
  ${ladder}
  <div style="font-size:13px;color:#8b949e;margin:6px 0 16px;line-height:1.45">
    Same wave shape throughout — only the push changes. Speed climbs, bend spread <b>falls</b>,
    hip mismatch <b>falls</b>. Past 4 the front joint starts to clip, which sets the ceiling.
  </div>

  <div style="font-size:15px;font-weight:700;margin:0 0 6px">How much each joint bends, nose → tail</div>
  ${chart}
  <div style="font-size:13px;color:#8b949e;margin:6px 0 16px;line-height:1.45">
    Red dashed = what the model physically allows (joint 7 now 28°). Green band = the 20–22° target.
    Pale bars = the two hips. Grey dashed = the old baseline, which over-bends three joints.
    <b>The blue line sits inside the band across the whole spine.</b>
  </div>

  <div style="font-size:15px;font-weight:700;margin:0 0 8px">The finalists</div>
  ${cards}

  <div style="font-size:14px;color:#c9d1d9;border-top:1px solid #30363d;padding-top:10px;line-height:1.55">
    <b>Straightness is fine.</b> The 7–8% sideways figure was the body swimming straight but a few
    degrees off the reference axis. Measured as actual bend in the path, all four run
    0.35–0.53% against the baseline's 0.82% — straighter than what we had.
    <br><br>
    <b>The one thing that got worse</b> is roll: peak 1.40° against the baseline's 0.80°. Small, real,
    and worth watching rather than acting on yet.
  </div>
</body></html>`

const p = process.argv[2]
writeFileSync(p.replace(/\.pdf$/, '.html'), html)
function findChromium() {
  try { const q = chromium.executablePath(); if (q && existsSync(q)) return q } catch {}
  const root = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
  for (const d of readdirSync(root).filter((x) => x.startsWith('chromium')).sort().reverse())
    for (const exe of [join(root, d, 'chrome-win64', 'chrome.exe'), join(root, d, 'chrome-win', 'chrome.exe')])
      if (existsSync(exe)) return exe
  throw new Error('no chromium')
}
const browser = await chromium.launch({ executablePath: findChromium(), headless: true })
const page = await browser.newPage({ viewport: { width: 420, height: 1700 } })
await page.setContent(html)
await page.waitForTimeout(300)
await page.pdf({ path: p, width: '440px', height: '1900px', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
await page.screenshot({ path: p.replace(/\.pdf$/, '.png'), fullPage: true })
await browser.close()
console.log('wrote', p)
for (const r of rows) console.log(`\n${r.label}\n${r.link}`)
