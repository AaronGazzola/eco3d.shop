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
    legCadence: lerp(a.legCadence, b.legCadence, t),
  }
}
