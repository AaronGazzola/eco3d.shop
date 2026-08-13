import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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
  check('cruise resolved to the flight baseline', cruise.preset.name === 'flight base')
  check('the flight baseline is a mujoco preset', cruise.preset.engine === 'mujoco')
  check('the resolved preset carries a configuration', Object.keys(cruise.preset.config).length > 0)
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
  }
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
