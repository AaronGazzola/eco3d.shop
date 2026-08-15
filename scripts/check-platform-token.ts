import { createHmac } from 'node:crypto'
import { verifyChannelToken } from '../app/game/platform/token'

const SECRET = 'the-overlays-own-secret'
const OTHER = 'somebody-elses-secret'
const NOW = 1_800_000_000

let failed = false

function check(label: string, pass: boolean, detail: string) {
  if (!pass) failed = true
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label} — ${detail}`)
}

function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function mintWith(secret: string, overrides: Record<string, unknown> = {}, alg = 'HS256'): string {
  const header = b64url({ alg, typ: 'JWT' })
  const payload = b64url({
    iss: 'vids.tube',
    aud: 'overlay-1',
    sub: 'opaque-subject',
    viewerKind: 'source',
    channel: 'channel-1',
    install: 'install-1',
    iat: NOW,
    exp: NOW + 43200,
    jti: 'abc',
    ...overrides,
  })
  const data = `${header}.${payload}`
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${data}.${signature}`
}

function main() {
  const good = verifyChannelToken(mintWith(SECRET), SECRET, NOW + 1)
  check('a token signed with our secret verifies', good?.channel === 'channel-1', `channel ${good?.channel}`)
  check('the installation comes through', good?.install === 'install-1', `install ${good?.install}`)

  check(
    'a token signed with another secret is refused',
    verifyChannelToken(mintWith(OTHER), SECRET, NOW + 1) === null,
    'no claims returned',
  )

  const token = mintWith(SECRET)
  const [header, , signature] = token.split('.')
  const tampered = `${header}.${b64url({ iss: 'vids.tube', channel: 'somebody-elses-channel', exp: NOW + 43200 })}.${signature}`
  check('a payload edited after signing is refused', verifyChannelToken(tampered, SECRET, NOW + 1) === null, 'no claims returned')

  check(
    'an algorithm of none is refused',
    verifyChannelToken(mintWith(SECRET, {}, 'none'), SECRET, NOW + 1) === null,
    'refused before the signature is considered',
  )

  check(
    'an expired token is refused',
    verifyChannelToken(mintWith(SECRET), SECRET, NOW + 43201) === null,
    'no claims returned',
  )

  check(
    'a token from another issuer is refused',
    verifyChannelToken(mintWith(SECRET, { iss: 'somewhere-else' }), SECRET, NOW + 1) === null,
    'no claims returned',
  )

  check(
    'a token naming no channel is refused',
    verifyChannelToken(mintWith(SECRET, { channel: '' }), SECRET, NOW + 1) === null,
    'no claims returned',
  )

  const rubbish = ['', 'not-a-token', 'a.b', 'only-one-part', 'a.b.c.d']
  check(
    'rubbish returns null rather than throwing',
    rubbish.every((value) => verifyChannelToken(value, SECRET, NOW) === null),
    `${rubbish.length} shapes refused`,
  )

  check('no secret means no claims', verifyChannelToken(mintWith(SECRET), '', NOW + 1) === null, 'refused')

  if (failed) process.exit(1)
}

main()
