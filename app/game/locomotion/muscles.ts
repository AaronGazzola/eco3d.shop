export const ALPHA = 0.4
export const BETA = 1.2
export const GAMMA = 0.2
export const DELTA = 0.1
export const DELAY_MS = 10

const TWO_PI = Math.PI * 2

export interface MuscleActivation {
  mL: number
  mR: number
}

// α (active gain) and β (stiffness) default to the paper's Table 5 values but are tunable at
// runtime (the paper itself scales them — ×10 for struggling, a tail taper) to re-calibrate the
// muscle to our body's mass scale.
export function ekebergTorque(
  mL: number,
  mR: number,
  phi: number,
  phiDot: number,
  alpha: number = ALPHA,
  beta: number = BETA
): number {
  return alpha * (mL - mR) - beta * (mL + mR + GAMMA) * phi - DELTA * phiDot
}

export interface MuscleDelayBuffer {
  capacity: number
  buf: Float64Array
  head: number
  filled: number
}

export function createDelayBuffer(substepSeconds: number): MuscleDelayBuffer {
  const samples = Math.max(1, Math.round((DELAY_MS / 1000) / substepSeconds))
  return {
    capacity: samples,
    buf: new Float64Array(samples * 2),
    head: 0,
    filled: 0,
  }
}

export function pushAndReadDelayed(
  buffer: MuscleDelayBuffer,
  mL: number,
  mR: number
): MuscleActivation {
  const i = buffer.head * 2
  const out: MuscleActivation =
    buffer.filled < buffer.capacity
      ? { mL: 0, mR: 0 }
      : { mL: buffer.buf[i], mR: buffer.buf[i + 1] }
  buffer.buf[i] = mL
  buffer.buf[i + 1] = mR
  buffer.head = (buffer.head + 1) % buffer.capacity
  if (buffer.filled < buffer.capacity) buffer.filled++
  return out
}

export function testActivation(
  t: number,
  segmentIndex: number,
  freqHz: number,
  amplitude: number,
  phasePerSeg: number
): MuscleActivation {
  const omega = TWO_PI * freqHz
  const phase = omega * t - segmentIndex * phasePerSeg
  return {
    mL: amplitude * (1 + Math.cos(phase)),
    mR: amplitude * (1 + Math.cos(phase + Math.PI)),
  }
}
