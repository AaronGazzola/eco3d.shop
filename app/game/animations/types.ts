import { MutableRefObject } from 'react'
import * as THREE from 'three'
import { CreatureConfig } from '../../page.types'

export type BehaviorId = string

export interface DragonDrive {
  headTarget: { x: number; y: number; z: number }
  headPitch: number
  rootYOffset: number
  bodyRoll: { amp: number; freq: number; phase: number }
  legCadence: number
  legLiftAmplitude: number
  bankAngle: number
  breath: number
  weight: number
}

export interface BehaviorContext {
  targetRef: MutableRefObject<THREE.Vector3>
  config: CreatureConfig
  time: number
}

export interface JointOverrides {
  joints?: THREE.Vector3[]
  limbAnchors?: THREE.Vector3[]
  limbTargets?: THREE.Vector3[]
}

export interface Behavior {
  id: BehaviorId
  update(ctx: BehaviorContext, dt: number): DragonDrive
  isComplete?(ctx: BehaviorContext): boolean
  overrideJoints?(ctx: BehaviorContext, drive: DragonDrive): JointOverrides
}

export function zeroDrive(): DragonDrive {
  return {
    headTarget: { x: 0, y: 0, z: 0 },
    headPitch: 0,
    rootYOffset: 0,
    bodyRoll: { amp: 0, freq: 0, phase: 0 },
    legCadence: 0,
    legLiftAmplitude: 0,
    bankAngle: 0,
    breath: 0,
    weight: 1,
  }
}
