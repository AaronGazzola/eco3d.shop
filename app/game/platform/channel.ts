export const PLATFORM_NS = 'vidstube-overlay'
export const PLATFORM_VERSION = 1

export interface PlatformBox {
  width: number
  height: number
  scale: number
}

export interface PlatformEvent {
  id: string
  keyword: string
  args: string | null
  at: string
  actor: string
  actorName: string | null
}

export type PlatformSettings = Record<string, number | boolean | string>

export interface PlatformListeners {
  onHello?: (state: { channel: string; settings: PlatformSettings; box: PlatformBox | null }) => void
  onSettings?: (settings: PlatformSettings) => void
  onBox?: (box: PlatformBox) => void
  onEvent?: (event: PlatformEvent) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Written from the platform's specification, not by loading its SDK. That is the
// claim the platform makes about itself — the protocol is the contract, the SDK
// is a convenience — and a second implementation is the only way to test it.
//
// It also keeps the creature renderable when the host is unreachable, and avoids
// a cross-origin script in a page that will eventually be proxied through
// somebody else's domain.
export function connectPlatform(listeners: PlatformListeners): () => void {
  // No parent means no host. Standing alone, the page waits for nothing.
  if (typeof window === 'undefined' || window.parent === window) {
    return () => {}
  }

  let answered = false

  const onMessage = (event: MessageEvent) => {
    // Only the window that framed us. The origin is deliberately not checked: an
    // overlay may be framed by any host that speaks this protocol, and the parent
    // is the only window that can be one.
    if (event.source !== window.parent) return

    const data = event.data
    if (!isRecord(data)) return
    if (data.ns !== PLATFORM_NS) return
    if (data.v !== PLATFORM_VERSION) return

    if (data.type === 'hello') {
      answered = true
      listeners.onHello?.({
        channel: typeof data.channel === 'string' ? data.channel : '',
        settings: isRecord(data.settings) ? (data.settings as PlatformSettings) : {},
        box: isRecord(data.box) ? (data.box as unknown as PlatformBox) : null,
      })
      if (isRecord(data.settings)) listeners.onSettings?.(data.settings as PlatformSettings)
      if (isRecord(data.box)) listeners.onBox?.(data.box as unknown as PlatformBox)
      return
    }
    if (data.type === 'settings') {
      if (isRecord(data.settings)) listeners.onSettings?.(data.settings as PlatformSettings)
      return
    }
    if (data.type === 'box') {
      if (isRecord(data.box)) listeners.onBox?.(data.box as unknown as PlatformBox)
      return
    }
    if (data.type === 'event') {
      if (isRecord(data.event)) listeners.onEvent?.(data.event as unknown as PlatformEvent)
    }
  }

  window.addEventListener('message', onMessage)

  // A wildcard target, and it has to be: an overlay does not know its host's
  // origin, and once overlays are proxied it will be told even less about it.
  // This message says only "I exist".
  //
  // Announced repeatedly until answered, because announcing once is a race the
  // overlay always loses: the host attaches its listener when its own state is
  // ready, and an announcement that lands a moment earlier is heard by nobody
  // and never repeated. The frame is then silent for the rest of the stream, and
  // the only symptom is that chat does nothing.
  const announce = () => {
    window.parent.postMessage({ ns: PLATFORM_NS, v: PLATFORM_VERSION, type: 'ready' }, '*')
  }
  announce()
  const retry = setInterval(() => {
    if (answered) {
      clearInterval(retry)
      return
    }
    announce()
  }, 500)

  return () => {
    clearInterval(retry)
    window.removeEventListener('message', onMessage)
  }
}
