import assert from 'node:assert/strict'
import { wallProximity, roaming, turnRate } from './observe-metrics.mjs'

const BOUNDS = { minX: -30, maxX: 30, minY: 0, maxY: 30, minZ: -20, maxZ: 20 }

function dumpOf(points, hz = 4) {
  return {
    spec: { tankBounds: BOUNDS },
    samples: points.map((p, i) => ({ t: i / hz, nodes: [{ x: p.x, y: 1, z: p.z }] })),
  }
}

function straightRun() {
  const pts = []
  for (let i = 0; i < 360; i++) pts.push({ x: -25 + i * 0.1, z: 0 })
  return dumpOf(pts)
}

function undulatingStraightRun() {
  const pts = []
  for (let i = 0; i < 360; i++) pts.push({ x: -25 + i * 0.14, z: Math.sin(i * 1.57) * 0.4 })
  return dumpOf(pts)
}

function parkedInCorner() {
  const pts = []
  for (let i = 0; i < 120; i++) pts.push({ x: -25 + i * 0.45, z: -15 - i * 0.03 })
  for (let i = 0; i < 240; i++) pts.push({ x: 29.2 + Math.sin(i / 8) * 0.2, z: -19.1 })
  return dumpOf(pts)
}

function circling() {
  const pts = []
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * 4 * Math.PI
    pts.push({ x: Math.cos(a) * 12, z: Math.sin(a) * 12 })
  }
  return dumpOf(pts)
}

const straight = straightRun()
const wpStraight = wallProximity(straight)
assert.ok(Math.abs(wpStraight.min - 5) < 0.6, `straight run hugs no wall, got min ${wpStraight.min}`)
assert.equal(wpStraight.fractionWithin.find((r) => r.margin === 1).fraction, 0)
const trStraight = turnRate(straight)
assert.ok(trStraight.meanAbsDegPerSec < 1, `a straight path must not read as turning, got ${trStraight.meanAbsDegPerSec}`)

const undulating = undulatingStraightRun()
const trUndulating = turnRate(undulating)
assert.ok(
  trUndulating.meanAbsDegPerSec < 5,
  `side-to-side undulation must not read as steering, got ${trUndulating.meanAbsDegPerSec}`,
)

const parked = parkedInCorner()
const wpParked = wallProximity(parked)
assert.ok(wpParked.min < 1, `a body in the corner is inside 1 u, got ${wpParked.min}`)
assert.ok(
  wpParked.fractionWithin.find((r) => r.margin === 2).fraction > 0.6,
  'a body parked for two thirds of the run must read as mostly near a wall',
)
const rmParked = roaming(parked)
assert.ok(rmParked.worstWindow.span < 3, `parking must be caught, got ${rmParked.worstWindow.span}`)
assert.ok(rmParked.worstWindow.from > 25, 'the parked window is the late one, not the approach')

const rmStraight = roaming(straight)
assert.ok(rmStraight.worstWindow.span > 3, `a crossing run must not read as parked, got ${rmStraight.worstWindow.span}`)
assert.ok(rmStraight.coverageX > 0.5, `a crossing run covers the long axis, got ${rmStraight.coverageX}`)
assert.ok(rmStraight.coverageZ < 0.1, 'a straight run down the axis covers no depth')

const rmCrossing = roaming(dumpOf((() => {
  const pts = []
  for (let i = 0; i < 360; i++) {
    const leg = Math.floor(i / 90)
    const f = (i % 90) / 90
    if (leg === 0) pts.push({ x: -25 + f * 50, z: -15 })
    else if (leg === 1) pts.push({ x: 25, z: -15 + f * 30 })
    else if (leg === 2) pts.push({ x: 25 - f * 50, z: 15 })
    else pts.push({ x: -25, z: 15 - f * 30 })
  }
  return pts
})()))
const rmTightCircle = roaming(dumpOf((() => {
  const pts = []
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * 6 * Math.PI
    pts.push({ x: Math.cos(a) * 6, z: Math.sin(a) * 6 })
  }
  return pts
})()))
assert.ok(
  rmCrossing.occupancy > rmTightCircle.occupancy * 1.5,
  `a creature working the whole tank must out-score one circling the middle, got ${rmCrossing.occupancy} vs ${rmTightCircle.occupancy}`,
)
assert.ok(rmTightCircle.worstWindow.span > 3, 'a tight circle is still not parking, only poor space use')

const circles = circling()
const trCircles = turnRate(circles)
assert.ok(trCircles.meanAbsDegPerSec > 5, `circling must read as turning, got ${trCircles.meanAbsDegPerSec}`)
assert.ok(Math.abs(trCircles.netDeg) > 300, `two laps is a large net heading change, got ${trCircles.netDeg}`)
assert.ok(roaming(circles).worstWindow.span > 3, 'circling is not parking')

assert.equal(wallProximity({ spec: {}, samples: [] }), null)
assert.equal(turnRate({ samples: [] }), null)

console.log('steering metrics: all checks passed')
console.log(`  straight  min clearance ${wpStraight.min.toFixed(2)} u  turn ${trStraight.meanAbsDegPerSec.toFixed(2)}°/s  worst window ${rmStraight.worstWindow.span.toFixed(2)} u`)
console.log(`  parked    min clearance ${wpParked.min.toFixed(2)} u  worst window ${rmParked.worstWindow.span.toFixed(2)} u`)
console.log(`  undulate  turn ${trUndulating.meanAbsDegPerSec.toFixed(2)}°/s (side-to-side swing rejected)`)
console.log(`  space use  perimeter circuit ${(rmCrossing.occupancy * 100).toFixed(0)}%  vs tight circle ${(rmTightCircle.occupancy * 100).toFixed(0)}%`)
console.log(`  circling  turn ${trCircles.meanAbsDegPerSec.toFixed(2)}°/s  net ${trCircles.netDeg.toFixed(0)}°`)
