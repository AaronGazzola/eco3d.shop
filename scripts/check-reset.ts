// Proves a reset is a rebuild request and nothing else: it must restart the creature without being
// mistaken for configuration. Three things have to hold at once, and the interesting one is the third —
// a nonce that leaked into the structural key would rebuild correctly and quietly break preset equality,
// which is the property that makes a captured run reproducible.
//
//   npx tsx scripts/check-reset.ts

import {
  mujocoStructuralKey,
  pickSimConfig,
  useAnimateStore,
} from '@/app/admin/animate/animateStore'

let failures = 0

function check(label: string, pass: boolean, detail?: string) {
  if (pass) {
    console.log(`  ok   ${label}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
}

const store = useAnimateStore

console.log('a reset asks for a rebuild')
const before = store.getState().resetNonce
store.getState().resetCreature()
const after = store.getState().resetNonce
check('one request moves the nonce by exactly one', after - before === 1, `moved by ${after - before}`)

store.getState().resetCreature()
store.getState().resetCreature()
check(
  'three requests move the nonce by exactly three',
  store.getState().resetNonce - before === 3,
  `moved by ${store.getState().resetNonce - before}`,
)

console.log('a reset is not configuration')
const configBefore = JSON.stringify(pickSimConfig(store.getState()))
store.getState().resetCreature()
const configAfter = JSON.stringify(pickSimConfig(store.getState()))
check('no configuration value changes across a reset', configBefore === configAfter)
check(
  'the reset counter is absent from the persisted configuration',
  !Object.prototype.hasOwnProperty.call(pickSimConfig(store.getState()), 'resetNonce'),
)

console.log('a preset stays reproducible across a reset')
const keyBefore = mujocoStructuralKey(pickSimConfig(store.getState()))
store.getState().resetCreature()
const keyAfter = mujocoStructuralKey(pickSimConfig(store.getState()))
check(
  'two states differing only by reset count produce the same structural key',
  keyBefore === keyAfter,
  `${keyBefore} vs ${keyAfter}`,
)

console.log('a structural change still produces a different key')
const keyTankOn = mujocoStructuralKey(pickSimConfig(store.getState()))
store.setState({ tankWidth: store.getState().tankWidth + 1 })
const keyTankWider = mujocoStructuralKey(pickSimConfig(store.getState()))
check('widening the tank changes the structural key', keyTankOn !== keyTankWider)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
