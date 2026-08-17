import { BodyGroup } from '@/app/admin/_lib/types'
import { buildMjcf } from '@/app/game/locomotion/mjcf'
import { STD_SEGMENT_WIDTH } from '@/app/game/locomotion/weights'

// The tank was built for flight, where the bottom is glass like the rest, and it REPLACED the world's
// floor plane. That silently took the ground away from a body with weight: the tank's panes are on their
// own contact pair, touched by the trunk's hull spheres and by nothing else, while the feet touch only
// the walking floor. A creature in a tank under gravity therefore had nothing to stand on and sank onto
// the glass with its legs through it.
//
// This reads the generated model rather than watching a run, because the failure is invisible in a
// picture from above — a creature resting on a pane that should not be there looks exactly like a
// creature standing on the ground.

let failures = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

const SEG_LEN = [3.352, 1.268, 1.728, 1.185, 1.395, 1.255, 1.515, 1.802, 1.975, 1.946, 3.966]
const SPINE_Y = 2.4
const FOOT_Y = 0.35

// A synthetic rig rather than one from the database: this checks the world the builder emits, which does
// not depend on which creature is in it, and a check that needs a network call is a check that gets
// skipped.
function rig(): BodyGroup[] {
  const groups: BodyGroup[] = []
  const pts: { x: number; y: number; z: number }[] = [{ x: 0, y: SPINE_Y, z: 0 }]
  let x = 0
  for (const len of SEG_LEN) {
    x += len
    pts.push({ x, y: SPINE_Y, z: 0 })
  }
  for (let i = 0; i < SEG_LEN.length; i++) {
    const type = i === 0 ? 'head' : i === SEG_LEN.length - 1 ? 'tail' : 'spine'
    const g: BodyGroup = {
      id: `g${i}`,
      name: `g${i}`,
      segmentIds: [],
      color: '#fff',
      type,
      nodeBack: pts[i + 1],
      angleCaps: { yaw: 0.5, pitchUp: 1, pitchDown: 1 },
    }
    if (i === 0) g.nodeFront = pts[0]
    groups.push(g)
  }
  // Two girdles, four legs. The feet are what set the ground height, so the check has a non-zero number
  // to compare the tank's floor against rather than an accidental zero.
  for (const [girdle, index] of [
    ['g2', 2],
    ['g7', 7],
  ] as const) {
    const parent = groups[index]
    parent.nodeHipLeft = { x: pts[index + 1].x, y: SPINE_Y, z: 0.9 }
    parent.nodeHipRight = { x: pts[index + 1].x, y: SPINE_Y, z: -0.9 }
    for (const side of ['leg-left', 'leg-right'] as const) {
      groups.push({
        id: `${girdle}-${side}`,
        name: `${girdle}-${side}`,
        segmentIds: [],
        color: '#fff',
        type: side,
        attachedToSpineId: parent.id,
        nodeFoot: { x: pts[index + 1].x, y: FOOT_Y, z: side === 'leg-left' ? 1.7 : -1.7 },
      })
    }
  }
  return groups
}

const TANK = { width: 60, height: 30, depth: 40 }
const GROUPS = rig()

const geomNames = (xml: string): string[] =>
  [...xml.matchAll(/<geom name="([^"]+)"[^>]*type="plane"/g)].map((m) => m[1])

const world = (opts: { gravityY?: number; tank?: typeof TANK }) => {
  const { xml, meta } = buildMjcf(GROUPS, opts)
  const worldSection = xml.slice(xml.indexOf('<worldbody>'), xml.indexOf('<light'))
  return { xml, meta, planes: geomNames(worldSection) }
}

console.log('a body with weight keeps its ground inside a tank')
{
  const w = world({ gravityY: -9.81, tank: TANK })
  check('the walking floor is present', w.planes.includes('floor'))
  check('no glass bottom is present', !w.planes.includes('tank_floor'))
  for (const wall of ['tank_ceiling', 'tank_xmin', 'tank_xmax', 'tank_zmin', 'tank_zmax']) {
    check(`${wall} is present`, w.planes.includes(wall))
  }
  check('the floor keeps the feet’s contact pair', /name="floor"[^>]*contype="1" conaffinity="2"/.test(w.xml))
  check(
    'the tank’s floor and the ground are the same plane',
    !!w.meta.tankBounds && Math.abs(w.meta.tankBounds.minY - w.meta.groundTop) < 1e-9,
    `${w.meta.tankBounds?.minY} vs ${w.meta.groundTop}`
  )
  check(
    'the tank rises the full height above the ground',
    !!w.meta.tankBounds && Math.abs(w.meta.tankBounds.maxY - (w.meta.groundTop + TANK.height)) < 1e-9
  )
}

console.log('a body with no weight is enclosed on all six sides')
{
  const w = world({ gravityY: 0, tank: TANK })
  check('no walking floor is present', !w.planes.includes('floor'))
  for (const pane of ['tank_floor', 'tank_ceiling', 'tank_xmin', 'tank_xmax', 'tank_zmin', 'tank_zmax']) {
    check(`${pane} is present`, w.planes.includes(pane))
  }
  check(
    'the tank is centred on the body rather than on the ground',
    !!w.meta.tankBounds && w.meta.tankBounds.minY < w.meta.groundTop,
    `${w.meta.tankBounds?.minY} vs ${w.meta.groundTop}`
  )
}

console.log('a world with no tank is untouched')
{
  const withWeight = world({ gravityY: -9.81 })
  check('the walking floor is present', withWeight.planes.includes('floor'))
  check('it is the only plane', withWeight.planes.length === 1, withWeight.planes.join(', '))
  check('no tank bounds are published', withWeight.meta.tankBounds === null)
  // A zero-gravity run without a tank is not a configuration anything uses, but it existed before this
  // change and removing its floor would be a silent behaviour change rather than a decision.
  const weightless = world({ gravityY: 0 })
  check('a weightless world with no tank keeps its floor', weightless.planes.includes('floor'))
}

console.log('enclosing a body adds no contact between a trunk surface and the ground')
{
  const w = world({ gravityY: -9.81, tank: TANK })
  const masks = new Set(
    [...w.xml.matchAll(/contype="(\d+)" conaffinity="(\d+)"/g)].map((m) => `${m[1]}/${m[2]}`)
  )
  check('only the known contact pairs are used', [...masks].every((m) => ['0/0', '1/2', '2/1', '4/4'].includes(m)), [...masks].join(' '))
  const hulls = [...w.xml.matchAll(/name="(?:hull\d+|\w+_hull)"[^>]*contype="(\d+)" conaffinity="(\d+)"/g)]
  check('every hull sphere is on the walls’ own pair', hulls.length > 0 && hulls.every((m) => m[1] === '4' && m[2] === '4'))
}

// The trunk alone was not enough. A 90 s grounded run held the spine exactly at the glass and pushed the
// feet 2.2 units through it, which on a camera framing the floor is a foot outside the window.
console.log('the feet are contained too, and only where there is something to contain them')
{
  const enclosed = world({ gravityY: -9.81, tank: TANK })
  const open = world({ gravityY: -9.81 })
  const footHulls = (xml: string) => [...xml.matchAll(/name="\w+_hull"/g)].length
  check('every foot carries a wall contact inside a tank', footHulls(enclosed.xml) === 4, String(footHulls(enclosed.xml)))
  check('no foot carries one without a tank', footHulls(open.xml) === 0, String(footHulls(open.xml)))
  check(
    'the foot’s floor contact is untouched',
    (enclosed.xml.match(/_ball" type="sphere" condim="1"[^>]*contype="2" conaffinity="1"/g) ?? []).length === 4
  )
}

// Reported rather than asserted, because the number this is compared against is a property of the
// CAMERA and not of the world. scripts/measure-frame-headroom.ts reports the height above the floor at
// which the overhead camera's window becomes narrower than the tank; anything higher than that, against
// a wall, is outside the window while still inside the tank. These are the heights the model is built
// with, so they are what that figure has to be compared against.
console.log('how high off the floor the body sits, as built')
{
  const w = world({ gravityY: -9.81, tank: TANK })
  const groundTop = w.meta.groundTop
  const hullRadius = STD_SEGMENT_WIDTH / 2
  const spineAboveFloor = SPINE_Y - groundTop
  const topOfTrunk = spineAboveFloor + hullRadius
  const f = (n: number) => n.toFixed(2)
  console.log(`  the floor stands at            ${f(groundTop)}`)
  console.log(`  the spine's centre sits        ${f(spineAboveFloor)} above the floor`)
  console.log(`  the top of the trunk reaches   ${f(topOfTrunk)} above the floor`)
  console.log(`  compare against the headroom from scripts/measure-frame-headroom.ts`)
  console.log(`  these are rest heights from the built model, not the peak of a run`)
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
