// The creature's world, given the window it is watched through.
//
// The overhead camera maps the tank's WIDTH across the window and its DEPTH up the window, and it fits the
// tank's floor. So the shape of the window and the shape of the tank floor are the same quantity seen
// twice, and letting them disagree puts the creature somewhere nobody chose.
//
// Pure on purpose: no React, no three, no store. The claim this file makes — that an overlay which is
// never resized behaves exactly as it did — is only worth making if it can be CHECKED, and it is checked
// by scripts/check-tank-for-box.ts.

export interface TankDims {
  tankWidth: number
  tankHeight: number
  tankDepth: number
}

// The box the game has always run at, and the room figure that means "as it was". A 480 by 320 window at
// room 1 resolves to the 60 by 40 tank the `ground tank` preset was measured on, so this change begins as
// a no-op and every captured run stays comparable.
const BASE_BOX = { width: 480, height: 320 }
const BASE_TANK_WIDTH = 60

// Height is not derived. Overhead framing was made independent of it deliberately — the camera fits the
// floor, not the near face — and a grounded creature never uses the headroom.
const TANK_HEIGHT = 30

// A creature is about 17.8 units nose to tail, so a tank below about 20 is narrower than its occupant, and
// one above 240 is a room it would take minutes to cross. Both ends are refused rather than rendered.
const MIN_EXTENT = 20
const MAX_EXTENT = 240

const clamp = (n: number) => Math.max(MIN_EXTENT, Math.min(MAX_EXTENT, n))

// A malformed box must not produce a malformed world: the overlay is a live stream, and a tank of NaN is a
// creature that vanishes. Anything not a positive finite number falls back to the value that reproduces
// today's tank.
const positive = (n: unknown, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : fallback

export function tankForBox(opts: {
  width?: number
  height?: number
  roominess?: number
}): TankDims {
  const width = positive(opts.width, BASE_BOX.width)
  const height = positive(opts.height, BASE_BOX.height)
  const roominess = positive(opts.roominess, 1)

  // Width follows the room figure alone, so the room figure is the ONLY thing that decides how large the
  // creature reads across the window. Reshaping the window then changes how much world there is up the
  // window without touching that — if reshaping also resized the creature, the two controls would fight.
  const tankWidth = clamp(BASE_TANK_WIDTH * roominess)
  const tankDepth = clamp(tankWidth / (width / height))

  return { tankWidth, tankHeight: TANK_HEIGHT, tankDepth }
}
