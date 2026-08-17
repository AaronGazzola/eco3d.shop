// Roadmap §6 metrics, in ONE place so the single-run harness (observe.mjs) and the batch sweep
// (observe-sweep.mjs) can never report different numbers for the same capture. This project has already
// paid twice for two paths that were assumed to agree and did not.
//
// Everything here takes the `dump` returned by window.__studio.nodeCaptureStop() (plus the samples).

// Peak bend per spine joint in DEGREES — the §6 metric-2 gate.
//
// Taken as (peak fraction of cap) × (authored cap), NOT from the node geometry. The engine reports the
// joint's own angle against its own cap every frame, so this is exact by construction and cannot disagree
// with the clipping guard it is printed beside. The geometric alternative — the turn angle between
// adjacent node positions — reads the FRONT GIRDLE at 11.2° where the engine reads 20.5°, because a node
// does not sit on its joint frame. Kept as `geometric` for cross-check only.
export function bendDegrees(dump) {
  const frac = dump.spineFracPeak
  const capF = dump.spineCapF
  if (!frac || !frac.length || !capF || capF.length !== frac.length) return null
  return frac.map((f, i) => f * ((capF[i] * 180) / Math.PI))
}

// The geometric cross-check: turn angle between adjacent node segments, peak-held.
export function bendDegreesGeometric(dump) {
  const { samples, spec } = dump
  if (!samples || !samples.length) return null
  const segLen = spec?.segLength ?? []
  const nAx = segLen.length ? segLen.filter((L) => L > 1e-9).length : samples[0].nodes.length
  if (nAx < 3) return null
  const peak = new Array(nAx - 2).fill(0)
  for (const s of samples) {
    for (let i = 1; i <= nAx - 2; i++) {
      const a = s.nodes[i - 1], b = s.nodes[i], c = s.nodes[i + 1]
      const ux = b.x - a.x, uz = b.z - a.z, vx = c.x - b.x, vz = c.z - b.z
      const th = Math.abs(Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz)) * 180 / Math.PI
      if (th > peak[i - 1]) peak[i - 1] = th
    }
  }
  return peak
}

// Which spine joints are the two leg-bearing ones, ordered along the body: front girdle first, hind last.
export function girdleIndices(dump) {
  const frac = dump.spineFracPeak ?? []
  const gd = dump.spineGirdleDist ?? frac.map(() => -1)
  const seg = dump.spineSeg ?? frac.map((_, i) => i)
  return frac.map((_, i) => i).filter((i) => gd[i] === 0).sort((a, b) => seg[a] - seg[b])
}

// The head joint — the spine joint nearest the nose. Excluded from the evenness gate, because head
// isolation deliberately holds it near zero and it would otherwise dominate the spread.
export function headIndex(dump) {
  const seg = dump.spineSeg ?? []
  let h = 0
  for (let i = 1; i < seg.length; i++) if (seg[i] < seg[h]) h = i
  return h
}

// Each node's sideways swing against a FITTED CURVED CENTRELINE rather than a straight axis. A straight
// axis mixes the body's own curvature into the swing and stops meaning anything once the body turns. The
// fit is a per-frame least-squares QUADRATIC of lateral offset against arc position: high enough to absorb
// the gross arc a turn produces, low enough to leave the ~1.3-wave undulation as the residual, which is
// what actually reads as pronounced on screen.
export function centrelineSwing(dump) {
  const { samples, spec } = dump
  if (!samples || !samples.length) return null
  const segLen = spec?.segLength ?? []
  const nAx = segLen.length ? segLen.filter((L) => L > 1e-9).length : samples[0].nodes.length
  if (nAx < 4) return null
  const lo = new Array(nAx).fill(Infinity)
  const hi = new Array(nAx).fill(-Infinity)
  for (const s of samples) {
    const P = s.nodes.slice(0, nAx)
    const arc = [0]
    for (let i = 1; i < nAx; i++) arc.push(arc[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z))
    const total = arc[nAx - 1] || 1
    const chord = Math.hypot(P[nAx - 1].x - P[0].x, P[nAx - 1].z - P[0].z) || 1
    const ax = (P[nAx - 1].x - P[0].x) / chord
    const az = (P[nAx - 1].z - P[0].z) / chord
    const u = arc.map((a) => a / total)
    const v = P.map((p) => (p.x - P[0].x) * -az + (p.z - P[0].z) * ax)
    const S = [0, 0, 0, 0, 0], T = [0, 0, 0]
    for (let i = 0; i < nAx; i++) {
      const p = [1, u[i], u[i] * u[i], u[i] ** 3, u[i] ** 4]
      for (let k = 0; k < 5; k++) S[k] += p[k]
      for (let k = 0; k < 3; k++) T[k] += v[i] * p[k]
    }
    const c = solve3([[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]], T)
    for (let i = 0; i < nAx; i++) {
      const r = v[i] - (c ? c[0] + c[1] * u[i] + c[2] * u[i] * u[i] : 0)
      if (r < lo[i]) lo[i] = r
      if (r > hi[i]) hi[i] = r
    }
  }
  return lo.map((l, i) => hi[i] - l)
}

function solve3(M, b) {
  const A = M.map((r, i) => [...r, b[i]])
  for (let i = 0; i < 3; i++) {
    let p = i
    for (let r = i + 1; r < 3; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r
    if (Math.abs(A[p][i]) < 1e-12) return null
    ;[A[i], A[p]] = [A[p], A[i]]
    for (let r = 0; r < 3; r++) {
      if (r === i) continue
      const f = A[r][i] / A[i][i]
      for (let k = i; k < 4; k++) A[r][k] -= f * A[i][k]
    }
  }
  return [A[0][3] / A[0][0], A[1][3] / A[1][1], A[2][3] / A[2][2]]
}

// Travel over the capture: forward speed, straightness, duration. COM of the node cloud, so it needs no
// heading — travel direction is a measured output, never an assumption.
export function travel(dump) {
  const S = dump.samples
  if (!S || S.length < 2) return null
  const com = (s) => {
    let x = 0, z = 0
    for (const n of s.nodes) { x += n.x; z += n.z }
    return { x: x / s.nodes.length, z: z / s.nodes.length }
  }
  const a = com(S[0]), b = com(S[S.length - 1])
  const T = S[S.length - 1].t - S[0].t || 1
  const dist = Math.hypot(b.x - a.x, b.z - a.z)

  // Straightness has TWO parts and conflating them reads a straight swim as a failure. A body that sets
  // off 8° off the X axis and holds that line is straight; one that arcs is not. `lateral` (|Δz| against
  // distance) cannot tell them apart — it reports the heading as if it were drift. So the path is also fitted
  // with a straight line and the worst perpendicular deviation reported: THAT is curvature, and it is what
  // "straight presets stay straight" in §6 metric 3 actually means.
  const P = S.map(com)
  const n = P.length
  const mx = P.reduce((s, p) => s + p.x, 0) / n, mz = P.reduce((s, p) => s + p.z, 0) / n
  let sxx = 0, sxz = 0
  for (const p of P) { sxx += (p.x - mx) ** 2; sxz += (p.x - mx) * (p.z - mz) }
  const slope = sxx > 1e-9 ? sxz / sxx : 0
  let curve = 0
  for (const p of P) {
    const r = Math.abs((p.z - mz) - slope * (p.x - mx)) / Math.sqrt(1 + slope * slope)
    if (r > curve) curve = r
  }
  return {
    seconds: T, dist, speed: dist / T, lateral: Math.abs(b.z - a.z),
    headingDeg: (Math.atan(slope) * 180) / Math.PI,
    curve, curvePct: dist > 1e-6 ? curve / dist : null,
  }
}

// Every §6 number for one capture, in one object. THE scoring function — anything that ranks or reports a
// run goes through here, so a sweep row and a single-run report describe the same thing.
// How close the body came to each of the six tank walls, and whether it ever left the tank. Reported
// against the bounds the simulation was actually built with, published with the capture, because the
// tank is centred on the creature's own start position rather than on the origin.
// A negative clearance means a node was outside that wall. The body is a chain of capsules and the
// samples are node origins rather than surfaces, so a small negative reading is the capsule radius
// showing through, not an escape: `escaped` is therefore reported against a tolerance, and the raw
// worst clearance is reported beside it so the judgement can be re-made.
export function tankClearance(dump, tolerance = 1.0) {
  const b = dump.spec?.tankBounds
  if (!b) return null
  const samples = dump.samples ?? []
  if (samples.length === 0) return null
  const worst = { minX: Infinity, maxX: Infinity, minY: Infinity, maxY: Infinity, minZ: Infinity, maxZ: Infinity }
  for (const s of samples) {
    for (const n of s.nodes ?? []) {
      if (n.x - b.minX < worst.minX) worst.minX = n.x - b.minX
      if (b.maxX - n.x < worst.maxX) worst.maxX = b.maxX - n.x
      if (n.y - b.minY < worst.minY) worst.minY = n.y - b.minY
      if (b.maxY - n.y < worst.maxY) worst.maxY = b.maxY - n.y
      if (n.z - b.minZ < worst.minZ) worst.minZ = n.z - b.minZ
      if (b.maxZ - n.z < worst.maxZ) worst.maxZ = b.maxZ - n.z
    }
  }
  const values = Object.values(worst)
  return { bounds: b, worst, worstAny: Math.min(...values), escaped: Math.min(...values) < -tolerance }
}

// How much of the run was spent close to the glass, which is the number steering has to move. Distinct
// from tankClearance: that reports the single worst instant, and a body that touches a wall once is not
// the same failure as one that lives against it. Side walls only (X and Z) — the floor is what a
// grounded creature stands on and would otherwise read as a permanent zero.
export function wallProximity(dump, margins = [1, 2, 4]) {
  const b = dump.spec?.tankBounds
  const S = dump.samples ?? []
  if (!b || S.length === 0) return null
  const series = S.map((s) => {
    let frame = Infinity
    for (const n of s.nodes ?? []) {
      const d = Math.min(n.x - b.minX, b.maxX - n.x, n.z - b.minZ, b.maxZ - n.z)
      if (d < frame) frame = d
    }
    return { t: s.t, clearance: frame }
  })
  return {
    series,
    min: Math.min(...series.map((s) => s.clearance)),
    fractionWithin: margins.map((m) => ({
      margin: m,
      fraction: series.filter((s) => s.clearance < m).length / series.length,
    })),
  }
}

// Whether the creature is still going somewhere, and how much of the tank it uses. The failure this
// exists to catch is parking: `ground tank` reaches a wall at about 16 s and then drifts under 1 u for
// the remaining 45, which every whole-run average reports as healthy travel because the first 16 s
// carry it. Judged on the WORST window rather than the mean for exactly that reason.
// Grid cell used to judge how much of the floor gets visited. Ten units is a bit over half the creature's
// own 18 unit footprint: fine enough that circling one part of the tank scores low, coarse enough that a
// creature is not asked to swim down every lane to score well.
const ROAM_CELL_UNITS = 10

export function roaming(dump, windowSeconds = 15) {
  const S = dump.samples ?? []
  if (S.length < 2) return null
  const path = S.map((s) => {
    let x = 0, z = 0
    for (const n of s.nodes) { x += n.x; z += n.z }
    return { t: s.t, x: x / s.nodes.length, z: z / s.nodes.length }
  })
  const windows = []
  for (let i = 0; i < path.length; i++) {
    let j = i
    while (j < path.length - 1 && path[j].t - path[i].t < windowSeconds) j++
    if (path[j].t - path[i].t < windowSeconds) break
    let span = 0
    for (let k = i; k <= j; k++) {
      const d = Math.hypot(path[k].x - path[i].x, path[k].z - path[i].z)
      if (d > span) span = d
    }
    windows.push({ from: path[i].t, to: path[j].t, span })
  }
  const b = dump.spec?.tankBounds
  const xs = path.map((p) => p.x), zs = path.map((p) => p.z)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanZ = Math.max(...zs) - Math.min(...zs)
  // How much of the floor the creature actually visits, counted on a grid rather than from the extent of
  // its path. The extent cannot tell a creature that crosses the whole tank from one that circles its
  // rim: both touch the same extremes. Cell size is one CELL_UNITS square, so a creature is credited with
  // a cell only by going there, not by going round it.
  let occupancy = null
  if (b) {
    const cols = Math.max(1, Math.round((b.maxX - b.minX) / ROAM_CELL_UNITS))
    const rows = Math.max(1, Math.round((b.maxZ - b.minZ) / ROAM_CELL_UNITS))
    const seen = new Set()
    for (const p of path) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(((p.x - b.minX) / (b.maxX - b.minX)) * cols)))
      const cz = Math.min(rows - 1, Math.max(0, Math.floor(((p.z - b.minZ) / (b.maxZ - b.minZ)) * rows)))
      seen.add(cz * cols + cx)
    }
    occupancy = seen.size / (cols * rows)
  }
  return {
    windows,
    worstWindow: windows.length ? windows.reduce((a, c) => (c.span < a.span ? c : a)) : null,
    coverageX: b ? spanX / (b.maxX - b.minX) : null,
    coverageZ: b ? spanZ / (b.maxZ - b.minZ) : null,
    occupancy,
  }
}

// Turn rate of the travel direction, in degrees per second. This is the open-loop response `turnBias`
// has to be calibrated against, and it is NOT the `headingDeg` that `travel` reports: that fits ONE
// straight line to the whole path, so a body turning steadily through 180° and one going straight can
// return the same heading. Samples closer together than `smoothSeconds` of travel are skipped, because
// a body that has barely moved has a direction dominated by its own side-to-side undulation.
// The smoothing window and the minimum step are the whole metric, not incidental defaults. At 1 s and
// 0.05 u the baseline `ground tank` run reads 82°/s while going essentially straight and then parking:
// the body undulates side to side, so the centre of mass oscillates laterally by a few tenths of a unit,
// and over a short window that lateral swing IS the measured direction. Three seconds of travel and at
// least half a unit of net step put the undulation below the signal, and drop the parked stretches
// entirely rather than reading their jitter as steering.
export function turnRate(dump, smoothSeconds = 3, minStep = 0.5) {
  const S = dump.samples ?? []
  if (S.length < 2) return null
  const path = S.map((s) => {
    let x = 0, z = 0
    for (const n of s.nodes) { x += n.x; z += n.z }
    return { t: s.t, x: x / s.nodes.length, z: z / s.nodes.length }
  })
  // Headings are taken a whole window APART, not at every sample. Overlapping windows differentiated
  // 0.25 s apart turn a few degrees of undulation noise into tens of degrees per second, which is how
  // the baseline came to read 82°/s while swimming essentially straight. Stepping i to j makes each
  // heading independent of the last, so the noise is divided by the window rather than by the sample
  // interval.
  const headings = []
  let i = 0
  while (i < path.length) {
    let j = i
    while (j < path.length - 1 && path[j].t - path[i].t < smoothSeconds) j++
    if (path[j].t - path[i].t < smoothSeconds) break
    const dx = path[j].x - path[i].x, dz = path[j].z - path[i].z
    if (Math.hypot(dx, dz) >= minStep) headings.push({ t: path[j].t, a: Math.atan2(dz, dx) })
    i = j
  }
  if (headings.length < 2) return null
  let net = 0, absRate = 0, n = 0
  for (let i = 1; i < headings.length; i++) {
    const dt = headings[i].t - headings[i - 1].t
    if (dt <= 0) continue
    let d = headings[i].a - headings[i - 1].a
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    net += d
    absRate += Math.abs(d / dt)
    n++
  }
  const deg = (r) => (r * 180) / Math.PI
  if (!n) return null
  return { netDeg: deg(net), meanAbsDegPerSec: deg(absRate / n), samples: n }
}

export function scoreRun(dump) {
  const frac = dump.spineFracPeak ?? []
  const deg = bendDegrees(dump)
  const seg = dump.spineSeg ?? frac.map((_, i) => i)
  const head = headIndex(dump)
  const gi = girdleIndices(dump)
  // The evenness gate excludes the head joint: isolation holds it near zero by design, so including it
  // would report the isolation as unevenness.
  const idx = frac.map((_, i) => i).filter((i) => i !== head)
  const dsub = idx.map((i) => deg[i])
  const lo = Math.min(...dsub), hi = Math.max(...dsub)
  const clippers = idx.filter((i) => frac[i] >= 0.995).map((i) => seg[i])
  const sw = centrelineSwing(dump) ?? []
  const tv = travel(dump) ?? { speed: 0, lateral: 0, seconds: 1 }
  return {
    bendDeg: deg,
    bendSeg: seg,
    bendGeometric: bendDegreesGeometric(dump),
    capFrac: frac,
    caps: (dump.spineCapF ?? []).map((r) => (r * 180) / Math.PI),
    headJointDeg: deg ? deg[head] : null,
    bendMin: lo,
    bendMax: hi,
    bendSpread: hi - lo,
    bendRatio: hi / Math.max(1e-6, lo),
    bendMean: dsub.reduce((a, b) => a + b, 0) / dsub.length,
    girdleFrontDeg: gi.length ? deg[gi[0]] : null,
    girdleHindDeg: gi.length > 1 ? deg[gi[gi.length - 1]] : null,
    girdleRatio: gi.length > 1 ? deg[gi[gi.length - 1]] / Math.max(1e-6, deg[gi[0]]) : null,
    clippers,
    clips: clippers.length > 0,
    maxCapFrac: dump.maxCapFrac ?? null,
    swing: sw,
    swingPeak: sw.length ? Math.max(...sw) : null,
    speed: tv.speed,
    lateral: tv.lateral,
    lateralPct: tv.dist > 1e-6 ? tv.lateral / tv.dist : null,
    headingDeg: tv.headingDeg ?? null,
    curvePct: tv.curvePct ?? null,
    rollPerSec: dump.rollFlips != null ? dump.rollFlips / tv.seconds : null,
    peakRollDeg: dump.maxRollDeg ?? null,
    tank: tankClearance(dump),
    proximity: wallProximity(dump),
    roaming: roaming(dump),
    turn: turnRate(dump),
  }
}
