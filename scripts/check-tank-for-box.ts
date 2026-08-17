// The window's shape and the creature's world are the same quantity seen twice. This checks they cannot
// disagree, and that an overlay nobody resizes behaves exactly as it did.
//
//   npx tsx scripts/check-tank-for-box.ts

import { tankForBox } from '@/app/game/tankForBox'

let failures = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('the tank in use today is reproduced exactly')
{
  const t = tankForBox({ width: 480, height: 320, roominess: 1 })
  check('a 480 by 320 window at room 1 is a 60 by 40 tank', t.tankWidth === 60 && t.tankDepth === 40, `${t.tankWidth} x ${t.tankDepth}`)
}

console.log("the window's shape becomes the tank's shape")
{
  const t = tankForBox({ width: 600, height: 300, roominess: 1 })
  check('a window twice as wide as tall gives a width twice its depth', Math.abs(t.tankWidth / t.tankDepth - 2) < 1e-9, `${t.tankWidth} x ${t.tankDepth}`)
  const square = tankForBox({ width: 400, height: 400, roominess: 1 })
  check('a square window gives a square floor', Math.abs(square.tankWidth - square.tankDepth) < 1e-9, `${square.tankWidth} x ${square.tankDepth}`)
}

console.log('a taller window is a deeper world, at the same width')
{
  const short = tankForBox({ width: 480, height: 240, roominess: 1 })
  const tall = tankForBox({ width: 480, height: 480, roominess: 1 })
  check('both windows give the same tank width', short.tankWidth === tall.tankWidth, `${short.tankWidth} vs ${tall.tankWidth}`)
  check('the taller window gives the deeper tank', tall.tankDepth > short.tankDepth, `${tall.tankDepth} vs ${short.tankDepth}`)
}

console.log('the height is left alone')
{
  const a = tankForBox({ width: 480, height: 320, roominess: 1 })
  const b = tankForBox({ width: 200, height: 900, roominess: 3 })
  check('every window carries the same tank height', a.tankHeight === b.tankHeight, `${a.tankHeight} vs ${b.tankHeight}`)
}

console.log('less room makes a larger creature')
{
  const roomy = tankForBox({ width: 480, height: 320, roominess: 2 })
  const tight = tankForBox({ width: 480, height: 320, roominess: 0.5 })
  check('a smaller room figure gives a smaller tank', tight.tankWidth < roomy.tankWidth, `${tight.tankWidth} vs ${roomy.tankWidth}`)
  check('the aspect ratio is untouched by the room figure', Math.abs(roomy.tankWidth / roomy.tankDepth - tight.tankWidth / tight.tankDepth) < 1e-9)
}

console.log('an extreme window cannot produce an extreme world')
{
  const sliver = tankForBox({ width: 20, height: 1900, roominess: 1 })
  const strip = tankForBox({ width: 1900, height: 20, roominess: 1 })
  const within = (n: number) => n >= 20 && n <= 240
  check('a tall sliver stays inside the clamp', within(sliver.tankWidth) && within(sliver.tankDepth), `${sliver.tankWidth} x ${sliver.tankDepth}`)
  check('a wide strip stays inside the clamp', within(strip.tankWidth) && within(strip.tankDepth), `${strip.tankWidth} x ${strip.tankDepth}`)
}

console.log('a nonsense input falls back rather than producing a nonsense world')
{
  const base = tankForBox({ width: 480, height: 320, roominess: 1 })
  for (const [label, bad] of [
    ['no room figure', undefined],
    ['zero', 0],
    ['negative', -2],
    ['not a number', 'big' as unknown as number],
    ['NaN', Number.NaN],
  ] as const) {
    const t = tankForBox({ width: 480, height: 320, roominess: bad as number | undefined })
    check(`${label} resolves to room 1`, t.tankWidth === base.tankWidth && t.tankDepth === base.tankDepth, `${t.tankWidth} x ${t.tankDepth}`)
  }
  const noBox = tankForBox({})
  check('an absent box resolves to the tank in use today', noBox.tankWidth === 60 && noBox.tankDepth === 40, `${noBox.tankWidth} x ${noBox.tankDepth}`)
  const zeroBox = tankForBox({ width: 0, height: 0, roominess: 1 })
  check('a zero-sized box resolves to the tank in use today', zeroBox.tankWidth === 60 && zeroBox.tankDepth === 40, `${zeroBox.tankWidth} x ${zeroBox.tankDepth}`)
  const everyDim = tankForBox({ width: 800, height: 600, roominess: 1 })
  check('every returned dimension is a finite number', [everyDim.tankWidth, everyDim.tankHeight, everyDim.tankDepth].every(Number.isFinite))
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
