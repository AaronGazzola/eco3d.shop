import { MutableRefObject } from 'react'
import * as THREE from 'three'
import { CreatureConfig } from '../../page.types'

export type BehaviorId = string

export interface DragonDrive {
  headTarget: { x: number; y: number; z: number }
  legCadence: number
}

export interface BehaviorContext {
  targetRef: MutableRefObject<THREE.Vector3>
  config: CreatureConfig
  time: number
}

export interface Behavior {
  id: BehaviorId
  update(ctx: BehaviorContext, dt: number): DragonDrive
  isComplete?(ctx: BehaviorContext): boolean
}

export function zeroDrive(): DragonDrive {
  return {
    headTarget: { x: 0, y: 0, z: 0 },
    legCadence: 0,
  }
}
