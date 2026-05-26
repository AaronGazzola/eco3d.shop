export interface PlanarSegment {
  groupId: string
  length: number
  mass: number
  inertiaAboutComY: number
  restNodeX: number
  restNodeZ: number
  restComX: number
  restComZ: number
}

export interface PlanarJoint {
  segmentIndex: number
  coordIndex: number
  yawForwardLimit: number
  yawBackwardLimit: number
}

export interface BodySpec {
  segments: PlanarSegment[]
  joints: PlanarJoint[]
  density: number
  restRootX: number
  restRootZ: number
}

export interface SolverState {
  rootX: number
  rootZ: number
  rootHeadingY: number
  jointAngles: number[]
  rootVelX: number
  rootVelZ: number
  rootHeadingRateY: number
  jointRates: number[]
}

export interface SolverDiagnostics {
  kineticEnergy: number
  comDriftFromStart: number
  maxJointAngleFractionOfCap: number
}
