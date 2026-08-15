'use server'

import { verifyChannelToken } from './token'

export interface ChannelIdentity {
  channel: string
  install: string
  subject: string
}

// Server only, and deliberately so. The signing secret verifies tokens for this
// overlay on EVERY channel, so a browser holding it could mint one naming any
// channel it liked. The page receives what the claims said and never the means to
// have made them.
export async function verifyChannelTokenAction(
  token: string,
): Promise<ChannelIdentity | null> {
  const secret = process.env.VIDSTUBE_OVERLAY_SECRET
  if (!secret) {
    console.error('overlay: no platform signing secret configured, so no channel can be verified')
    return null
  }
  const claims = verifyChannelToken(token, secret)
  if (!claims) return null
  return { channel: claims.channel, install: claims.install, subject: claims.sub }
}
