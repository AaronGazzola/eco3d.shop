import { fitTankCamera, TankVolume } from '@/app/game/tankFit'
import type { TankView } from '@/app/game/motion/resolve'

// "The whole tank is in frame" is a claim a screenshot cannot settle: a corner outside the frame looks
// exactly like a corner that is not there. So the fit is a pure function and the corners are projected
// through it here, at aspect ratios a browser source actually gets dragged to.

let failures = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

type Vec = [number, number, number]

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: Vec): Vec => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}

// The same basis three's lookAt builds, and the same perspective divide the GPU does. Written out rather
// than imported so this runs in node with no renderer.
function project(point: Vec, fit: ReturnType<typeof fitTankCamera>, aspect: number, fovDeg: number) {
  const zAxis = norm(sub(fit.position, fit.target))
  const xAxis = norm(cross(fit.up as Vec, zAxis))
  const yAxis = cross(zAxis, xAxis)
  const v = sub(point, fit.position as Vec)
  const cam: Vec = [dot(v, xAxis), dot(v, yAxis), dot(v, zAxis)]
  const depth = -cam[2]
  const vHalf = (fovDeg * Math.PI) / 360
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)
  return { x: cam[0] / depth / Math.tan(hHalf), y: cam[1] / depth / Math.tan(vHalf), depth }
}

// What has to be in frame is the region the creature can occupy, and that differs by face. Side-on
// watches a flying creature, which can be anywhere in the volume, so all eight corners must be framed.
// Overhead watches a creature on the floor, so the floor's four corners must be — the glass above it is
// headroom nothing enters, and framing it would shrink the creature for nothing.
const mustBeInFrame = (b: TankVolume, view: TankView): Vec[] => {
  const out: Vec[] = []
  const ys = view === 'overhead' ? [b.minY] : [b.minY, b.maxY]
  for (const x of [b.minX, b.maxX]) for (const y of ys) for (const z of [b.minZ, b.maxZ]) out.push([x, y, z])
  return out
}

const FOV = 50
const ASPECTS = [0.5, 1.0, 1.78, 3.0]
const SHAPES: Record<string, TankVolume> = {
  'the overlay tank': { minX: -30, maxX: 30, minY: 0.29, maxY: 30.29, minZ: -20, maxZ: 20 },
  'a tall narrow tank': { minX: -4, maxX: 4, minY: 0, maxY: 40, minZ: -3, maxZ: 3 },
  'a wide shallow tank': { minX: -80, maxX: 80, minY: -1, maxY: 5, minZ: -60, maxZ: 60 },
}

console.log('the region the creature can occupy is inside the frustum, whatever the window')
for (const view of ['side', 'overhead'] as TankView[]) {
  for (const [label, bounds] of Object.entries(SHAPES)) {
    for (const aspect of ASPECTS) {
      const fit = fitTankCamera({ bounds, view, aspect, fovDeg: FOV })
      const projected = mustBeInFrame(bounds, view).map((c) => project(c, fit, aspect, FOV))
      const outside = projected.filter((p) => p.depth <= 0 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1)
      check(
        `${view}, ${label}, aspect ${aspect}`,
        outside.length === 0,
        outside.map((p) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(' ')
      )
    }
  }
}

console.log('the fit leaves room rather than sitting flush against the frame edge')
{
  const bounds = SHAPES['the overlay tank']
  for (const view of ['side', 'overhead'] as TankView[]) {
    const fit = fitTankCamera({ bounds, view, aspect: 1.78, fovDeg: FOV })
    const worst = Math.max(
      ...mustBeInFrame(bounds, view).map((c) => {
        const p = project(c, fit, 1.78, FOV)
        return Math.max(Math.abs(p.x), Math.abs(p.y))
      })
    )
    check(`${view} fills the frame without touching its edge`, worst < 1 && worst > 0.9, worst.toFixed(3))
  }
}

// The whole point of the correction. Fitting the ceiling put the creature roughly 30 units beyond the
// plane being framed and it came out tiny; fitting the floor makes the tank's height irrelevant to how
// large it appears, which is right, because a grounded creature never uses that headroom.
console.log('overhead framing does not depend on how much glass is above the creature')
{
  const shallow: TankVolume = { minX: -30, maxX: 30, minY: 0, maxY: 6, minZ: -20, maxZ: 20 }
  const tall: TankVolume = { ...shallow, maxY: 120 }
  const spans = (b: TankVolume) => {
    const fit = fitTankCamera({ bounds: b, view: 'overhead', aspect: 1.78, fovDeg: FOV })
    const p = (x: number, z: number) => project([x, b.minY, z], fit, 1.78, FOV)
    return {
      across: p(b.maxX, 0).x - p(b.minX, 0).x,
      down: Math.abs(p(0, b.maxZ).y - p(0, b.minZ).y),
    }
  }
  const a = spans(shallow)
  const b = spans(tall)
  check(
    'a tall tank frames its floor exactly as a shallow one does',
    Math.abs(a.across - b.across) < 1e-9 && Math.abs(a.down - b.down) < 1e-9
  )
  // The axis that binds reaches the padding limit; the other is free to be smaller, because a tank whose
  // proportions differ from the window's cannot fill both.
  check(
    'the binding axis of the floor reaches the edge of the padding',
    Math.abs(Math.max(a.across, a.down) - 2 / 1.05) < 1e-6,
    `across ${a.across.toFixed(3)}, down ${a.down.toFixed(3)}`
  )
}

// Looking straight down with the default up of +Y is degenerate: the two are parallel, the frame's roll
// is undefined and lookAt yields a basis with a zero axis.
console.log('overhead has a defined roll')
{
  const bounds = SHAPES['the overlay tank']
  const fit = fitTankCamera({ bounds, view: 'overhead', aspect: 1.78, fovDeg: FOV })
  const forward = norm(sub(fit.target as Vec, fit.position as Vec))
  check('the camera looks straight down', Math.abs(forward[1] + 1) < 1e-9, forward.join(','))
  check(
    'up is not parallel to the view direction',
    Math.hypot(...cross(fit.up as Vec, forward)) > 0.5,
    fit.up.join(',')
  )
}

// The tank's long axis is the one the creature travels along. It has to lie ACROSS the window, or a wide
// overlay would frame a creature swimming up and down a narrow strip.
console.log('the creature travels across the frame, not up it')
{
  const bounds = SHAPES['the overlay tank']
  const cy = (bounds.minY + bounds.maxY) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const fit = fitTankCamera({ bounds, view: 'overhead', aspect: 1.78, fovDeg: FOV })
  const ahead = project([bounds.maxX, cy, cz], fit, 1.78, FOV)
  check('the far end of the long axis is to the right of centre', ahead.x > 0.5, ahead.x.toFixed(3))
  check('it is level with the centre of the frame', Math.abs(ahead.y) < 1e-6, ahead.y.toFixed(6))
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
