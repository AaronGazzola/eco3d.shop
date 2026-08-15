import { connectPlatform, PLATFORM_NS } from '../app/game/platform/channel'

// The protocol client runs in a browser, so a browser is stood up around it here:
// a fake window with a parent that is not itself, and hand-delivered messages.
// This is the second implementation of the platform's protocol, and the point of
// checking it is that a third party writing one would have the same experience.

let failed = false

function check(label: string, pass: boolean, detail: string) {
  if (!pass) failed = true
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label} — ${detail}`)
}

interface FakeWindow {
  parent: { postMessage: (data: unknown, target: string) => void }
  addEventListener: (name: string, handler: (event: unknown) => void) => void
  removeEventListener: (name: string, handler: (event: unknown) => void) => void
}

const posted: { data: unknown; target: string }[] = []
let handler: ((event: unknown) => void) | null = null

const parent = {
  postMessage: (data: unknown, target: string) => posted.push({ data, target }),
}
const fake: FakeWindow = {
  parent,
  addEventListener: (name, fn) => {
    if (name === 'message') handler = fn
  },
  removeEventListener: (name) => {
    if (name === 'message') handler = null
  },
}

;(globalThis as unknown as { window: FakeWindow }).window = fake

function deliver(data: unknown, source: unknown = parent) {
  handler?.({ data, source })
}

const message = (type: string, body: Record<string, unknown> = {}) => ({
  ns: PLATFORM_NS,
  v: 1,
  type,
  ...body,
})

const BOX = { width: 480, height: 320, scale: 1 }
const FEED = {
  id: 'e1',
  keyword: 'feed',
  args: null,
  at: '2026-08-15T00:00:00.000Z',
  actor: 'opaque-actor',
  actorName: 'Bob',
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The race this pins: a host attaches its listener when its own state is ready,
// which can be after the frame announced. Announcing once means the frame is
// heard by nobody and never repeats, and the only symptom on a live stream is
// that chat appears to do nothing.
async function checkTheAnnouncementRepeats() {
  posted.length = 0
  const disconnect = connectPlatform({})
  const first = posted.length
  await wait(1_200)
  const unanswered = posted.length
  check(
    'it keeps announcing while nobody answers',
    first === 1 && unanswered > 1,
    `${first} at once, ${unanswered} after 1.2s`,
  )

  deliver(message('hello', { channel: 'channel-1', settings: {}, box: BOX }))
  const atAnswer = posted.length
  await wait(1_200)
  check(
    'it stops announcing once answered',
    posted.length === atAnswer,
    `${posted.length - atAnswer} further announcements`,
  )
  disconnect()
}

async function main() {
  const seen = {
    hello: [] as unknown[],
    settings: [] as unknown[],
    box: [] as unknown[],
    events: [] as unknown[],
  }

  const disconnect = connectPlatform({
    onHello: (state) => seen.hello.push(state),
    onSettings: (settings) => seen.settings.push(settings),
    onBox: (box) => seen.box.push(box),
    onEvent: (event) => seen.events.push(event),
  })

  check(
    'it announces itself to the parent',
    posted.length === 1 && (posted[0].data as { type: string }).type === 'ready',
    `${posted.length} message posted`,
  )
  check(
    'it announces to a wildcard, not knowing the host origin',
    posted[0]?.target === '*',
    `target ${posted[0]?.target}`,
  )

  deliver(message('hello', { channel: 'channel-1', settings: { creatureName: 'Ember' }, box: BOX }))
  check(
    'hello brings the channel, the settings and the box',
    (seen.hello[0] as { channel: string }).channel === 'channel-1' &&
      seen.settings.length === 1 &&
      seen.box.length === 1,
    'all three delivered from one message',
  )

  deliver(message('settings', { settings: { creatureName: 'Ash' } }))
  check(
    'a later settings change is delivered',
    (seen.settings[1] as { creatureName: string }).creatureName === 'Ash',
    'the new name arrived',
  )

  deliver(message('event', { event: FEED }))
  check(
    'an event is delivered',
    (seen.events[0] as { keyword: string }).keyword === 'feed',
    'the command arrived',
  )

  const before = JSON.stringify(seen)
  deliver({ ns: 'someone-else', v: 1, type: 'settings', settings: { creatureName: 'No' } })
  deliver(message('settings', { settings: { creatureName: 'No' } }), { notTheParent: true })
  deliver({ ns: PLATFORM_NS, v: 2, type: 'settings', settings: { creatureName: 'No' } })
  deliver('not an object')
  deliver(message('shutdown'))
  check(
    'a stranger, a wrong version, a foreign namespace and rubbish are all ignored',
    JSON.stringify(seen) === before,
    'nothing was delivered',
  )

  disconnect()
  deliver(message('settings', { settings: { creatureName: 'After' } }))
  check('disconnecting stops delivery', JSON.stringify(seen) === before, 'nothing more arrived')

  await checkTheAnnouncementRepeats()

  if (failed) process.exit(1)
}

main()
