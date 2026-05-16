import { AnimalType, CreatureConfig } from './page.types'

export const DRAGON_SCALE_INITIAL = 0.06
export const DRAGON_SCALE_FINAL = 0.18
export const EMERGE_DURATION_MS = 8000

export const CREATURE_DEFAULTS: Record<AnimalType, CreatureConfig> = {
  lizard: {
    animalType: 'lizard',
    segmentCount: 18,
    segmentLength: 0.4,
    angleConstraint: Math.PI / 8,
    limbNodes: [
      { index: 3, side: -1 },
      { index: 3, side: 1 },
      { index: 12, side: -1 },
      { index: 12, side: 1 },
    ],
    limbSegmentLength: 0.5,
    limbReach: 1.4,
    bodyHalfWidth: 0.3,
    stepThreshold: 1.5,
    wanderRadius: 6,
    wanderSpeed: 1.0,
    maxSpeed: 3.0,
    arrivalRadius: 3.0,
    intentDamping: 0.85,
    idleDriftAmplitude: 0,
    idleDriftFrequency: 0.4,
    swingDuration: 0.25,
    liftHeight: 0.35,
    predictionGain: 0.15,
    bodyHeight: 0.6,
    groundY: 0,
    hipJointFrontIndex: 3,
    hipJointBackIndex: 12,
  },
}
