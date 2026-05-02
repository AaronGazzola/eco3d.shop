import { DragonDrive } from './types'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function blendDrive(a: DragonDrive, b: DragonDrive, t: number): DragonDrive {
  return {
    headTarget: {
      x: lerp(a.headTarget.x, b.headTarget.x, t),
      y: lerp(a.headTarget.y, b.headTarget.y, t),
      z: lerp(a.headTarget.z, b.headTarget.z, t),
    },
    headPitch: lerp(a.headPitch, b.headPitch, t),
    rootYOffset: lerp(a.rootYOffset, b.rootYOffset, t),
    bodyRoll: {
      amp: lerp(a.bodyRoll.amp, b.bodyRoll.amp, t),
      freq: lerp(a.bodyRoll.freq, b.bodyRoll.freq, t),
      phase: lerp(a.bodyRoll.phase, b.bodyRoll.phase, t),
    },
    legCadence: lerp(a.legCadence, b.legCadence, t),
    legLiftAmplitude: lerp(a.legLiftAmplitude, b.legLiftAmplitude, t),
    bankAngle: lerp(a.bankAngle, b.bankAngle, t),
    breath: lerp(a.breath, b.breath, t),
    weight: lerp(a.weight, b.weight, t),
  }
}
