export type AnimalType = 'lizard'

export interface LimbNode {
  index: number
  side: 1 | -1
  bodyHalfWidth?: number
  limbSegmentLength?: number
  limbReach?: number
  hipOffset?: { x: number; z: number }
  parentRestAngle?: number
}

export interface CreatureConfig {
  animalType: AnimalType
  segmentCount: number
  segmentLength: number
  segmentLengths?: number[]
  angleConstraint: number
  limbNodes: LimbNode[]
  limbSegmentLength: number
  limbReach: number
  bodyHalfWidth: number
  limbAngleOffset: number
  stepThreshold: number
  stepSmoothing: number
  wanderRadius: number
  wanderSpeed: number
  maxSpeed: number
  followDistance: number
  chainOrigin?: { x: number; z: number }
  initialJoints?: { x: number; z: number }[]
}
