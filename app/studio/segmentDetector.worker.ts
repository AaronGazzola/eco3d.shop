import { detectSegments } from './segmentDetector'

self.onmessage = (e: MessageEvent<{ positions: ArrayBuffer }>) => {
  const positions = new Float32Array(e.data.positions)
  const arrays = detectSegments(positions)
  const transferable = arrays.map((a) => a.buffer)
  ;(self as unknown as Worker).postMessage({ arrays }, transferable)
}
