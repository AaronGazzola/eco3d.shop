export interface JointOffset {
  yawRad: number
  pitchRad: number
}

export interface RootOffset {
  x: number
  z: number
  yawRad: number
}

export interface Pose {
  root: RootOffset
  joints: Record<string, JointOffset>
}

export interface Cycle {
  keyframes: Pose[]
  speed: number
  amplitude: number
}

export type Animations = Record<string, Cycle>

export const WALK_CYCLE = 'walk'
