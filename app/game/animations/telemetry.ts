import type { Solver } from './solver'

let _solver: Solver | null = null

export function registerTelemetrySolver(s: Solver | null) {
  _solver = s
}

export function dumpTelemetry(): string | null {
  return _solver?.dumpTelemetry() ?? null
}

export function dumpSkeletonSnapshot(): string | null {
  return _solver?.dumpSkeletonSnapshot() ?? null
}
