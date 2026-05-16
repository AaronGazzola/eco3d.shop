export type AnimalType = 'lizard'

export interface LimbNode {
  index: number
  side: 1 | -1
  bodyHalfWidth?: number
  limbSegmentLength?: number
  limbReach?: number
  hipOffset?: { x: number; y: number; z: number }
  parentRestAngle?: number
  footRestY?: number
  restFootOffset?: { x: number; y: number; z: number }
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
  stepThreshold: number
  wanderRadius: number
  wanderSpeed: number
  maxSpeed: number
  arrivalRadius: number
  intentDamping: number
  idleDriftAmplitude: number
  idleDriftFrequency: number
  swingDuration: number
  liftHeight: number
  predictionGain: number
  bodyHeight: number
  groundY: number
  hipJointFrontIndex?: number
  hipJointBackIndex?: number
  chainOrigin?: { x: number; y?: number; z: number }
  initialJoints?: { x: number; y?: number; z: number }[]
}

export type GamePhase =
  | 'choosing'
  | 'confirming'
  | 'shaking'
  | 'cracking'
  | 'emerging'
  | 'live'

export interface EggPair {
  id: string
  topKey: string
  bottomKey: string
}

export interface EggSlot {
  id: string
  topKey: string
  bottomKey: string
  x: number
  z: number
}
