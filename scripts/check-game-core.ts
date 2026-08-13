import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createWorld } from '../app/game/core/world'
import { GameHost } from '../app/game/core/host'
import { Actor, GameEvent, GameSettings, SaveRef } from '../app/game/core/types'

let failures = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

const PLAYER: Actor = { id: 'player', displayName: 'Player', kind: 'player' }
const VIEWER: Actor = { id: 'V_7f3a', displayName: 'bob123', kind: 'viewer' }

function stubHost(queued: GameEvent[] = []): GameHost {
  const save: SaveRef = { id: 'save-1', rigId: 'rig-1', legWeight: 0.1 }
  const settings: GameSettings = { creatureName: 'Ember' }
  return {
    getSave: () => save,
    getSettings: () => settings,
    getActor: () => PLAYER,
    drainEvents: () => queued.splice(0, queued.length),
  }
}

console.log('world advances deterministically')
{
  const a = createWorld(stubHost())
  const b = createWorld(stubHost())
  for (let i = 0; i < 100; i++) {
    a.tick(0.5)
    b.tick(0.5)
  }
  check('two runs of the same ticks agree', JSON.stringify(a.state()) === JSON.stringify(b.state()))
  check('elapsed accumulated', a.state().elapsed === 50)
  check('hunger rose', a.state().creature.hunger > 0.2)
  check('energy fell', a.state().creature.energy < 0.9)
}

console.log('state drives the requested motion')
{
  const world = createWorld(stubHost())
  check('starts cruising', world.state().creature.motion === 'cruise')
  for (let i = 0; i < 300; i++) world.tick(1)
  check('hungry but rested creature asks to pursue', world.state().creature.motion === 'pursue')
  for (let i = 0; i < 300; i++) world.tick(1)
  check('tired creature asks to rest even while hungry', world.state().creature.motion === 'rest')
  check('and it is genuinely hungry too', world.state().creature.hunger >= 0.6)
}

console.log('an action is attributed to the actor the host reported')
{
  const queued: GameEvent[] = []
  const world = createWorld(stubHost(queued))
  for (let i = 0; i < 500; i++) world.tick(1)
  const before = world.state().creature.hunger
  queued.push({ action: { kind: 'feed' }, actor: VIEWER })
  world.tick(1)
  check('feeding relieved hunger', world.state().creature.hunger < before)
  check('the actor came from the host', world.state().creature.lastFedBy === 'bob123')
  check('the feed was counted once', world.state().creature.feedCount === 1)
}

console.log('a bad tick is an error, not a silent no-op')
{
  const world = createWorld(stubHost())
  let threw = false
  try {
    world.tick(Number.NaN)
  } catch {
    threw = true
  }
  check('a non-finite delta throws', threw)
}

console.log('the core import graph is clean')
{
  const coreDir = join(process.cwd(), 'app', 'game', 'core')
  const files = readdirSync(coreDir).filter((f) => f.endsWith('.ts'))
  check('the core has files to check', files.length > 0)
  const banned = /from\s+['"](react|zustand|three|@\/app\/admin|.*admin\/animate|@react-three)/
  for (const file of files) {
    const source = readFileSync(join(coreDir, file), 'utf8')
    const offending = source
      .split('\n')
      .filter((line) => banned.test(line))
      .map((line) => line.trim())
    check(`${file} imports nothing banned`, offending.length === 0, offending.join(' | '))
    const external = source
      .split('\n')
      .filter((line) => /^\s*import\s/.test(line))
      .filter((line) => !/from\s+['"]\.\//.test(line))
      .map((line) => line.trim())
    check(`${file} imports only from within the core`, external.length === 0, external.join(' | '))
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
