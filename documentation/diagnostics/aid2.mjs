import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const D = 'documentation/diagnostics/observe'
const A = JSON.parse(readFileSync(join(D, 'sweep-2026-08-08T13-56-02.json'), 'utf8')).results
const B = JSON.parse(readFileSync(join(D, 'sweep-2026-08-08T14-08-12.json'), 'utf8')).results
const R = [...A, ...B]

const find = (label) => R.find((r) => r.label === label)
const CANDS = [
  { key: 'A', label: 'd0.39 a14 [1/1/0.7/0.5/0.3]', name: 'evenest spine', colour: '#58c4ff', note: 'sections all at or below 1' },
  { key: 'B', label: 'd0.39 a16 [1/1.3/0.5/0.35/0.35]', name: 'evenest, shoulder pushed past 1', colour: '#d2a8ff', note: 'the last-resort option, for comparison' },
  { key: 'C', label: 'd0.39 a14 [1/0.8/0.7/0.7/0.3]', name: 'most headroom', colour: '#7ee787', note: 'furthest from every cap' },
  { key: 'D', label: 'd0.5 a14 [0.8/1/1/0.5/0.5]', name: 'most equal hips', colour: '#ffa657', note: 'hips within 11%' },
  { key: 'E', label: 'anchor: 5.1b baseline', name: 'where we were', colour: '#8b949e', note: 'clips 3 joints — reference only' },
].map((c) => ({ ...c, run: find(c.label) })).filter((c) => c.run)

// ---- scatter: evenness against hip equality, speed as dot size ----
const SW = 380, SH = 260, SL = 42, SB = 34, ST = 12, SR = 10
const xs = R.map((r) => r.score.bendSpread), ys = R.map((r) => Math.abs(r.score.girdleRatio - 1))
const xMax = 38, yMax = 1.0
const px = (v) => SL + (Math.min(v, xMax) / xMax) * (SW - SL - SR)
const py = (v) => SH - SB - (Math.min(v, yMax) / yMax) * (SH - SB - ST)
const dots = R.map((r) => {
  const s = r.score
  const cand = CANDS.find((c) => c.label === r.label)
  const rad = 2 + Math.min(6, s.speed * 4)
  const fill = cand ? cand.colour : s.clips ? '#f8514933' : '#c9d1d955'
  return `<circle cx="${px(s.bendSpread).toFixed(1)}" cy="${py(Math.abs(s.girdleRatio - 1)).toFixed(1)}" r="${rad.toFixed(1)}" fill="${fill}"${cand ? ' stroke="#fff" stroke-width="1.2"' : ''}/>`
}).join('')
const sgrid = [0, 10, 20, 30].map((v) => `<line x1="${px(v)}" y1="${ST}" x2="${px(v)}" y2="${SH - SB}" stroke="#30363d"/><text x="${px(v)}" y="${SH - SB + 15}" text-anchor="middle" fill="#8b949e" font-size="10">${v}°</text>`).join('')
  + [0, 0.25, 0.5, 0.75, 1.0].map((v) => `<line x1="${SL}" y1="${py(v)}" x2="${SW - SR}" y2="${py(v)}" stroke="#30363d"/><text x="${SL - 5}" y="${py(v) + 3}" text-anchor="end" fill="#8b949e" font-size="10">${(v * 100).toFixed(0)}%</text>`).join('')
const scatter = `<svg width="${SW}" height="${SH}" style="background:#0d1117;border:1px solid #30363d;display:block">
  ${sgrid}${dots}
  <text x="${SW / 2}" y="${SH - 4}" text-anchor="middle" fill="#8b949e" font-size="11">spine unevenness (bend spread) →</text>
  <text x="10" y="${ST + 8}" fill="#8b949e" font-size="11">↑ hips unequal by</text>
</svg>`

// ---- per-joint bend profile for the candidates ----
const caps = R[0].score.caps, segs = R[0].score.bendSeg
const NJ = caps.length
const CW = 380, CH = 250, CL = 34, CB = 26, CT = 12, CR = 8
const yM = 34
const cx = (i) => CL + (i / (NJ - 1)) * (CW - CL - CR)
const cy = (v) => CH - CB - (Math.min(v, yM) / yM) * (CH - CB - CT)
const cgrid = [0, 10, 20, 30].map((v) => `<line x1="${CL}" y1="${cy(v)}" x2="${CW - CR}" y2="${cy(v)}" stroke="#30363d"/><text x="${CL - 5}" y="${cy(v) + 4}" text-anchor="end" fill="#8b949e" font-size="10">${v}°</text>`).join('')
const capLine = `<polyline points="${caps.map((c, i) => `${cx(i)},${cy(c)}`).join(' ')}" fill="none" stroke="#f85149" stroke-width="2" stroke-dasharray="5 3"/>`
const band = `<rect x="${CL}" y="${cy(21)}" width="${CW - CL - CR}" height="${cy(20) - cy(21)}" fill="#3fb95033"/>`
const profiles = CANDS.map((c) => `<polyline points="${c.run.score.bendDeg.map((d, i) => `${cx(i)},${cy(d)}`).join(' ')}" fill="none" stroke="${c.colour}" stroke-width="${c.key === 'E' ? 1.5 : 2}"${c.key === 'E' ? ' stroke-dasharray="3 2"' : ''}/>`).join('')
const glab = segs.map((s, i) => `<text x="${cx(i)}" y="${CH - CB + 15}" text-anchor="middle" fill="#8b949e" font-size="9">${s}</text>`).join('')
const girdleMark = [1, 5].map((i) => `<line x1="${cx(i)}" y1="${CT}" x2="${cx(i)}" y2="${CH - CB}" stroke="#ffffff22" stroke-width="6"/>`).join('')
const chart = `<svg width="${CW}" height="${CH}" style="background:#0d1117;border:1px solid #30363d;display:block">
  ${cgrid}${band}${girdleMark}${capLine}${profiles}${glab}
</svg>`

const f = (x, d = 2) => Number(x).toFixed(d)
const cards = CANDS.map((c) => {
  const s = c.run.score
  const ok = !s.clips
  return `<div style="border:1px solid ${ok ? '#30363d' : '#f8514966'};border-radius:6px;padding:10px 12px;margin-bottom:9px;background:#0d1117">
    <div style="font-size:17px;font-weight:700;color:${c.colour}">${c.key} · ${c.name}</div>
    <div style="font-size:12px;color:#8b949e;margin-top:2px">${c.note}</div>
    <div style="font-size:13px;color:#8b949e;margin-top:4px;font-family:monospace">push ${c.run.vars.cpgDrive} · muscle ${c.run.vars.muscleAlpha} · sections ${c.run.vars.waveNose}/${c.run.vars.waveShoulder}/${c.run.vars.waveHip}/${c.run.vars.waveTailMid}/${c.run.vars.waveTailTip}</div>
    <div style="font-size:15px;margin-top:6px;color:${ok ? '#3fb950' : '#f85149'}">${ok ? 'nothing at its cap' : 'CLIPS ' + s.clippers.map((x) => 'seg' + x).join(', ')}</div>
    <div style="font-size:14px;color:#c9d1d9;margin-top:5px;line-height:1.55">
      bend <b>${f(s.bendMin, 1)}–${f(s.bendMax, 1)}°</b>, spread <b>${f(s.bendSpread, 1)}°</b>, mean ${f(s.bendMean, 1)}°<br>
      hips <b>${f(s.girdleFrontDeg, 1)}° → ${f(s.girdleHindDeg, 1)}°</b> (ratio ${f(s.girdleRatio)})<br>
      speed <b>${f(s.speed)} u/s</b> &nbsp; swing ${f(s.swingPeak)} &nbsp; drift ${f((s.lateralPct ?? 0) * 100, 1)}%<br>
      roll ${f(s.rollPerSec, 1)}/s at peak ${f(s.peakRollDeg)}°
    </div>
  </div>`
}).join('')

const html = `<html><body style="margin:0;background:#161b22;color:#c9d1d9;font-family:-apple-system,Segoe UI,sans-serif;padding:14px;width:420px">
  <div style="font-size:22px;font-weight:800;margin-bottom:2px">D-T2 · 5.1c — 80 samples, and all three goals pull apart</div>
  <div style="font-size:14px;color:#8b949e;margin-bottom:14px;line-height:1.45">
    48 across the range, then 32 refined into the one basin that kept every joint legal.
    Fixed everywhere: MuJoCo, drag on, head excluded, legs 0.1 kg, no thrust yet.
  </div>

  <div style="font-size:15px;font-weight:700;margin:0 0 6px">Every sample: even spine vs equal hips</div>
  ${scatter}
  <div style="font-size:13px;color:#8b949e;margin:6px 0 16px;line-height:1.45">
    Each dot is one 12-second run; bigger dot = faster. Faint red = a joint hit its limit (56 of 80).
    <b>Bottom-left is the goal and it is empty.</b> Getting the spine even (moving left) makes the hips
    less equal (moving up) and slows the body down (dots shrink).
  </div>

  <div style="font-size:15px;font-weight:700;margin:0 0 6px">How much each joint bends, nose → tail</div>
  ${chart}
  <div style="font-size:13px;color:#8b949e;margin:6px 0 16px;line-height:1.45">
    Red dashed = what the printed model physically allows. Green band = the 20–21° target.
    Pale bars mark the two hip joints. Grey dashed = where we were.
    Note segment 7's 22° limit sitting between neighbours allowed 28° and 30° — that dip is why
    56 of 80 runs clipped there.
  </div>

  <div style="font-size:15px;font-weight:700;margin:0 0 8px">The four worth looking at</div>
  ${cards}

  <div style="font-size:14px;color:#c9d1d9;border-top:1px solid #30363d;padding-top:10px;line-height:1.55">
    <b>Pushing a section above 1 bought almost nothing.</b> B does it and lands within a degree of A,
    which keeps every section at or below 1 — same speed, slightly worse hips. The preference costs nothing.
    <br><br>
    <b>Speed is the price.</b> Nothing legal beats the old 0.89 u/s; the even shapes run 0.32–0.65.
    That was expected — thrust is the next stage's job, not the wave's.
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
for (const c of CANDS) console.log(`\n${c.key} ${c.name}\n${c.run.link}`)
