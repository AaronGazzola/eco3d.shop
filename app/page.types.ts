export type AnimalType = 'lizard'

export interface LimbNode {
  index: number
  side: 1 | -1
}

export interface CreatureConfig {
  animalType: AnimalType
  segmentCount: number
  segmentLength: number
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
}
