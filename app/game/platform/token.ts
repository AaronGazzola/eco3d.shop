import { createHmac, timingSafeEqual } from 'node:crypto'

export const PLATFORM_ISSUER = 'vids.tube'

export interface ChannelTokenClaims {
  iss: string
  aud: string
  sub: string
  viewerKind: 'source' | 'viewer'
  channel: string
  install: string
  iat: number
  exp: number
  jti: string
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Written from the platform's specification rather than from its SDK, which is the
// claim the platform makes about itself: the protocol is the contract and no
// privileged path exists. A third party would write this same forty lines.
//
// Returns null rather than throwing, because every caller's answer to a token it
// cannot trust is the same: carry on unattached.
export function verifyChannelToken(
  token: string,
  secret: string,
  nowS: number = Math.floor(Date.now() / 1000),
): ChannelTokenClaims | null {
  if (!token || !secret) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts

  // The algorithm is ours, not the token's. A token declaring "none" must be
  // refused before its absent signature is ever considered.
  let alg: unknown
  try {
    alg = (JSON.parse(fromB64url(header).toString('utf8')) as { alg?: unknown }).alg
  } catch {
    return null
  }
  if (alg !== 'HS256') return null

  const expected = Buffer.from(sign(`${header}.${payload}`, secret))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  let claims: ChannelTokenClaims
  try {
    claims = JSON.parse(fromB64url(payload).toString('utf8'))
  } catch {
    return null
  }
  if (claims?.iss !== PLATFORM_ISSUER) return null
  if (typeof claims.exp !== 'number' || claims.exp <= nowS) return null
  if (typeof claims.channel !== 'string' || !claims.channel) return null
  if (typeof claims.install !== 'string' || !claims.install) return null
  return claims
}
