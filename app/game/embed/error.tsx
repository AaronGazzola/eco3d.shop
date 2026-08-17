'use client'

import { useEffect } from 'react'
import { reportPlatformError } from '@/app/game/platform/channel'

// A broken overlay must look like no overlay. Next's own error page is opaque, and on a stream that is
// a grey rectangle sitting over the video until someone notices it — a worse failure than a creature
// that stopped moving.
//
// Framed, this renders nothing and says what went wrong over the message channel, where the host can
// log it and hide the frame. Standing alone in a tab the same failure is being looked at on purpose, so
// it is printed: that is the diagnosis path that costs nothing to keep.
export default function GameEmbedError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('overlay: the embed failed to render', error)
    reportPlatformError(error, 'render')
  }, [error])

  if (typeof window === 'undefined' || window.self !== window.top) return null

  return (
    <pre className="fixed inset-0 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-red-500">
      {error.stack ?? `${error.name}: ${error.message}`}
      {error.digest ? `\n\ndigest: ${error.digest}` : ''}
    </pre>
  )
}
