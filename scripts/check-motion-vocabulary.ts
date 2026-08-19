import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findSimPreset } from '../app/admin/animate/simPresets'
import { CRUISE, publishedMotionNames, resolveMotion } from '../app/game/motion/resolve'

let failures = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('a published name resolves to its own configuration')
{
  check('cruise is published', publishedMotionNames().includes(CRUISE))
  const cruise = resolveMotion(CRUISE)
  check('cruise did not fall back', cruise.fellBack === false)
  check('cruise resolves to the bounded preset', cruise.preset.name === 'bounded')
  // The overlay is the one surface a viewer watches for minutes at a time, so a creature that parks
  // against the glass reads as broken. Steering being ON is therefore part of what cruise MEANS, not a
  // tuning detail, and is asserted rather than left to whichever preset cruise happens to point at.
  check('cruise steers away from the walls', Number((cruise.preset.config as Record<string, unknown>).roamMargin) > 0)
  check('the grounded baseline is a mujoco preset', cruise.preset.engine === 'mujoco')
  check('the resolved preset carries a configuration', Object.keys(cruise.preset.config).length > 0)
}

// Cruising is grounded, and grounded means both things at once: weight, so the creature is on the floor
// rather than flying, and a container, so it cannot leave the window. Checked on the resolved
// configuration rather than on the preset's name, because the name is not what the physics reads.
console.log('cruising is grounded and contained')
{
  const config = resolveMotion(CRUISE).preset.config
  check('cruise carries a tank', config.tankEnabled === true)
  check('the tank has all three dimensions', !!config.tankWidth && !!config.tankHeight && !!config.tankDepth)
  check('cruise does not zero gravity', config.gravityY === undefined || config.gravityY !== 0)
}

// The pair is a controlled comparison: the grounded baseline and the flight baseline differ by gravity
// and by nothing else. If a later tuning touches one and not the other, this is what says so.
console.log('the grounded and flying baselines differ by one lever')
{
  const ground = findSimPreset('ground tank', 'mujoco')
  const flight = findSimPreset('flight base', 'mujoco')
  check('both presets exist', !!ground && !!flight)
  if (ground && flight) {
    const keys = new Set([...Object.keys(ground.config), ...Object.keys(flight.config)])
    const differing = [...keys].filter((k) => {
      const a = JSON.stringify((ground.config as Record<string, unknown>)[k])
      const b = JSON.stringify((flight.config as Record<string, unknown>)[k])
      return a !== b
    })
    check('gravity is the only difference', differing.length === 1 && differing[0] === 'gravityY', differing.join(', '))
    check('the legs weigh the same', ground.legWeight === flight.legWeight)
  }
}

console.log('an unpublished name falls back to cruise rather than failing')
{
  const cruise = resolveMotion(CRUISE)
  for (const name of ['pursue', 'flee', 'rest', 'hold', 'turn', 'not-a-motion-at-all']) {
    const resolved = resolveMotion(name)
    check(`${name} resolved without throwing`, resolved.resolved === CRUISE)
    check(`${name} recorded the fallback`, resolved.fellBack === true)
    check(`${name} kept the request for reporting`, resolved.requested === name)
    check(`${name} produced the cruise configuration`, resolved.preset.name === cruise.preset.name)
    check(`${name} inherited cruise's face`, resolved.view === cruise.view)
  }
}

// The face travels with the motion so that the camera cannot disagree with what is running. A motion
// without one would leave the overlay pointing wherever it last did.
console.log('every published motion declares the face it is watched through')
{
  for (const name of publishedMotionNames()) {
    const resolved = resolveMotion(name)
    check(`${name} names a face`, resolved.view === 'side' || resolved.view === 'overhead', String(resolved.view))
  }
  check('cruise is watched from overhead', resolveMotion(CRUISE).view === 'overhead')
}

console.log('no configuration type reaches the game core')
{
  const coreDir = join(process.cwd(), 'app', 'game', 'core')
  const files = readdirSync(coreDir).filter((f) => f.endsWith('.ts'))
  for (const file of files) {
    const source = readFileSync(join(coreDir, file), 'utf8')
    check(`${file} names no SimConfig`, !source.includes('SimConfig'))
    check(`${file} names no preset`, !/SimPreset|simPresets/.test(source))
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
