// How much height the overhead camera can afford before the creature falls outside the window.
//
//   npx tsx scripts/measure-frame-headroom.ts
//
// The camera is placed a fixed distance above the floor and aimed straight down, and the distance is
// chosen so the FLOOR rectangle fills the window with a little room. The creature does not lie in that
// plane: its body rides above the floor, closer to the camera, where less of the world fits. So the
// rectangle actually visible shrinks with height, and at some height it is narrower than the tank —
// above which the strip along each wall is outside the window while still inside the tank.
//
// This reports that height. It asserts nothing: the number is the question, and it is compared against
// the creature's measured body height from scripts/check-tank-world.ts.

import { fitTankCamera, type TankVolume } from '@/app/game/tankFit'

// The overlay's tank and the overlay's window, as they are actually configured: the `ground tank` preset
// and the 480 x 320 the host frames.
const TANK = { width: 60, height: 30, depth: 40 }
const CANVAS = { width: 480, height: 320 }
const FOV_DEG = 50

const bounds: TankVolume = {
  minX: -TANK.width / 2,
  maxX: TANK.width / 2,
  minY: 0,
  maxY: TANK.height,
  minZ: -TANK.depth / 2,
  maxZ: TANK.depth / 2,
}

const aspect = CANVAS.width / CANVAS.height
const fit = fitTankCamera({ bounds, view: 'overhead', aspect, fovDeg: FOV_DEG })

// Straight down, so the camera's height above the floor IS its distance from the plane it frames.
const distance = fit.position[1] - bounds.minY

// Screen vertical is the field of view; screen horizontal follows from the aspect ratio. Overhead the
// camera's up is -Z, so screen horizontal is the tank's X and screen vertical is its Z.
const vHalf = (FOV_DEG * Math.PI) / 360
const hHalf = Math.atan(Math.tan(vHalf) * aspect)

const halfW = (bounds.maxX - bounds.minX) / 2
const halfD = (bounds.maxZ - bounds.minZ) / 2

const visibleHalfWidth = (h: number) => (distance - h) * Math.tan(hHalf)
const visibleHalfDepth = (h: number) => (distance - h) * Math.tan(vHalf)

// Where the visible half-extent equals the tank's own, the margin is exactly used up.
const headroomX = distance - halfW / Math.tan(hHalf)
const headroomZ = distance - halfD / Math.tan(vHalf)

const f = (n: number) => n.toFixed(2)

console.log(`tank ${TANK.width} x ${TANK.height} x ${TANK.depth}, window ${CANVAS.width} x ${CANVAS.height}, aspect ${f(aspect)}, fov ${FOV_DEG}`)
console.log(`camera sits ${f(distance)} above the floor, looking straight down\n`)

console.log('what fits, at a series of heights above the floor')
console.log('  height   half-width  (tank 30.00)   half-depth  (tank 20.00)')
for (const h of [0, 1, 2, 3, 4, 6, 8]) {
  const w = visibleHalfWidth(h)
  const d = visibleHalfDepth(h)
  const wMark = w < halfW ? 'CUT' : 'ok '
  const dMark = d < halfD ? 'CUT' : 'ok '
  console.log(`  ${h.toString().padStart(5)}    ${f(w).padStart(9)}  ${wMark}          ${f(d).padStart(9)}  ${dMark}`)
}

console.log('\nthe height at which the margin runs out')
console.log(`  across the window (the tank's long axis):  ${f(headroomX)}`)
console.log(`  up the window (the tank's short axis):     ${f(headroomZ)}`)
console.log(`  whichever comes first:                     ${f(Math.min(headroomX, headroomZ))}`)

// The outline is drawn on the FLOOR, and the creature rides above it, so a creature pressed against the
// glass appears OUTSIDE its own boundary even while the physics is holding it inside. That overhang has a
// ceiling, and the ceiling is what tells perspective apart from a creature genuinely leaving the tank.
console.log('\nhow far outside the drawn floor line a CONTAINED creature can appear')
const pxPerUnitAtFloor = CANVAS.width / 2 / visibleHalfWidth(0)
for (const h of [1, 2, 2.36, 3, 4]) {
  // A point at height h and horizontal x lands where a floor point at x * distance / (distance - h) would.
  const apparentAtWall = halfW * (distance / (distance - h))
  const overhangUnits = apparentAtWall - halfW
  console.log(
    `  a part ${h.toString().padEnd(5)} above the floor, at the wall, appears ${f(overhangUnits)} units past the line (about ${Math.round(overhangUnits * pxPerUnitAtFloor)} px)`,
  )
}
console.log(`  the top of the trunk sits 2.36 above the floor — see scripts/check-tank-world.ts`)

console.log('\nhow to read it')
console.log('  Any part of the creature higher than the figure above, when it is against a wall, is')
console.log('  outside the window while still inside the tank. Compare it against the body height')
console.log('  reported by scripts/check-tank-world.ts. A body height above it means the camera is why')
console.log('  the creature disappears; a body height below it means the camera is not.')
