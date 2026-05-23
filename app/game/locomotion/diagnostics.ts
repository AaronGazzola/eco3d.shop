import { FootPhase } from './foot'

export interface AxialOscSnapshot {
  id: string
  name: string
  phase: number
  amplitude: number
  intrinsicFrequency: number
  outputYaw: number
}

export interface LimbOscSnapshot {
  id: string
  hipId: string
  side: 'left' | 'right'
  isFront: boolean
  phase: number
  amplitude: number
  stanceOrSwing: FootPhase
  plantedX: number
  plantedY: number
  plantedZ: number
  worldX: number
  worldY: number
  worldZ: number
}

export interface PivotSnapshot {
  id: string
  name: string
  type: string
  requestedYaw: number
  appliedQuat: [number, number, number, number]
  appliedEulerY: number
  worldPos: [number, number, number]
}

export interface FrameSnapshot {
  t: number
  attractor: { x: number; y: number; z: number } | null
  modelRotation: [number, number, number]
  drive: number
  steer: number
  chain: { id: string; name: string; type: string }[]
  axialOscillators: AxialOscSnapshot[]
  limbOscillators: LimbOscSnapshot[]
  pivots: PivotSnapshot[]
}

interface RecorderState {
  recording: boolean
  startedAt: number
  lastRecordedAt: number
  frames: FrameSnapshot[]
  last: FrameSnapshot | null
}

const RECORD_INTERVAL_MS = 100

const state: RecorderState = {
  recording: false,
  startedAt: 0,
  lastRecordedAt: 0,
  frames: [],
  last: null,
}

const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

export function subscribeDiagnostics(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function startRecording(): void {
  state.frames = []
  state.startedAt = performance.now()
  state.lastRecordedAt = 0
  state.recording = true
  notify()
}

export function stopRecording(): void {
  state.recording = false
  notify()
}

export function clearRecording(): void {
  state.frames = []
  notify()
}

export function isRecording(): boolean {
  return state.recording
}

export function getFrameCount(): number {
  return state.frames.length
}

export function getLastSnapshot(): FrameSnapshot | null {
  return state.last
}

export function getRecording(): FrameSnapshot[] {
  return state.frames
}

export function recordFrame(snap: FrameSnapshot): void {
  state.last = snap
  if (!state.recording) return
  if (snap.t - state.lastRecordedAt < RECORD_INTERVAL_MS && state.frames.length > 0) return
  state.lastRecordedAt = snap.t
  state.frames.push(snap)
  if (state.frames.length % 10 === 0) notify()
}
