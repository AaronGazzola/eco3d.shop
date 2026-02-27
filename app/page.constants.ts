import { AnimalType, CreatureConfig } from './page.types'

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
    limbAngleOffset: Math.PI / 3,
    stepThreshold: 1.5,
    stepSmoothing: 0.12,
    wanderRadius: 6,
    wanderSpeed: 1.0,
    maxSpeed: 3.0,
    followDistance: 3.0,
  },
}
