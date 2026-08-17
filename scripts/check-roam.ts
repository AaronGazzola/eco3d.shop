import assert from 'node:assert/strict'
import { roamBias, sideClearance, wrapAngle, RoamBounds } from '../app/game/locomotion/roam'

const TANK: RoamBounds = { minX: -30, maxX: 30, minY: 0, maxY: 30, minZ: -20, maxZ: 20 }
const MARGIN = 15
const GAIN = 0.6

const at = (x: number, z: number, hx: number, hz: number, margin = MARGIN, gain = GAIN) =>
  roamBias({ com: { x, z }, heading: { x: hx, z: hz }, bounds: TANK, margin, gain })

assert.equal(sideClearance({ x: 0, z: 0 }, TANK), 20)
assert.equal(sideClearance({ x: 28, z: 0 }, TANK), 2)
assert.equal(wrapAngle(Math.PI * 3).toFixed(6), Math.PI.toFixed(6))

assert.equal(at(0, 0, 1, 0), 0, 'mid-tank the creature is left alone')
assert.equal(at(28, 0, 1, 0, 0), 0, 'a margin of zero disables steering entirely')
assert.equal(at(28, 0, 1, 0, MARGIN, 0), 0, 'a gain of zero disables steering entirely')
assert.equal(at(28, 0, 0, 0), 0, 'a creature that is not moving has no heading to correct')

const headOn = at(28, 0, 1, 0)
assert.ok(Math.abs(headOn) > 0.7 * GAIN, `pointing straight at the near wall must turn hard, got ${headOn}`)

const leaving = at(28, 0, -1, 0)
assert.equal(leaving, 0, 'already pointing back at the centre needs no correction')

const shallow = at(20, 0, 1, 0)
const deep = at(29, 0, 1, 0)
assert.ok(Math.abs(deep) > Math.abs(shallow), 'the deeper into the margin, the harder the turn')

const mirroredX = at(-28, 0, -1, 0)
assert.ok(Math.abs(mirroredX) > 0.7 * GAIN, 'the opposite wall steers just as hard')

const drifting = at(28, 0, 1, 0.05)
assert.ok(Math.abs(drifting) > 0.7 * GAIN, 'a small drift off head-on still turns hard')

const zWall = at(0, 18, 0, 1)
assert.ok(Math.abs(zWall) > 0.7 * GAIN, `the depth walls steer too, got ${zWall}`)

const corner = at(28, 18, 1, 1)
assert.ok(Math.abs(corner) > 0.7 * GAIN, 'a corner steers away from both walls at once')

for (const [x, z, hx, hz] of [[28, 0, 1, 0], [-28, 0, -1, 0], [0, 18, 0, 1], [0, -18, 0, -1], [29, 19, 1, 1]]) {
  const b = at(x, z, hx, hz)
  assert.ok(b >= -1 && b <= 1, `bias stays in range, got ${b}`)
}

const gentle = at(28, 0, 1, 0, MARGIN, 0.3)
const firm = at(28, 0, 1, 0, MARGIN, 1.2)
assert.ok(Math.abs(firm) > Math.abs(gentle), 'gain scales the turn')

const left = at(28, 5, 1, 0)
const right = at(28, -5, 1, 0)
assert.ok(left * right < 0, 'the turn reverses depending on which side of centre the creature is')

// Taken well away from the clamp, where the steer and the brake are both visible; at full gain against a
// near wall both cases saturate at 1 and the comparison proves nothing.
const REF = (7 * Math.PI) / 180
const damped = (rate: number, damping: number) =>
  roamBias({ com: { x: 20, z: 0 }, heading: { x: 1, z: 0 }, bounds: TANK, margin: MARGIN, gain: 1, damping, turnRate: rate })

const undamped = damped(0, 0.2)
const braked = damped(REF, 0.2)
const wrongWay = damped(-REF, 0.2)
assert.ok(braked < undamped, `already turning away must ask for less turn, got ${braked} vs ${undamped}`)
assert.ok(wrongWay > undamped, `turning the wrong way must ask for more turn, got ${wrongWay} vs ${undamped}`)
// Compared as signed values, not magnitudes: enough damping does not merely shrink the turn, it reverses
// it into a counter-turn, which is the whole point and would read as "less braking" on a magnitude test.
assert.ok(damped(REF, 0.6) < damped(REF, 0.2), 'more damping brakes harder')
assert.equal(damped(REF * 5, 0), damped(0, 0), 'damping of zero ignores the turn rate')

const noDamping = roamBias({ com: { x: 28, z: 0 }, heading: { x: 1, z: 0 }, bounds: TANK, margin: MARGIN, gain: GAIN, damping: 0, turnRate: REF * 5 })
assert.equal(noDamping, headOn, 'damping of zero reproduces the original controller exactly')

console.log('roam controller: all checks passed')
console.log(`  gain 2, not yet turning        bias ${undamped.toFixed(3)}`)
console.log(`  gain 2, already turning away   bias ${braked.toFixed(3)}`)
console.log(`  head-on at 2 u from the wall   bias ${headOn.toFixed(3)}`)
console.log(`  head-on at 10 u from the wall  bias ${shallow.toFixed(3)}`)
console.log(`  pointing back at the centre    bias ${leaving.toFixed(3)}`)
console.log(`  corner, heading into it        bias ${corner.toFixed(3)}`)
