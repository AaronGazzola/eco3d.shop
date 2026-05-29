export interface SolverState {
  rootX: number
  rootZ: number
  rootHeadingY: number
  rootVelX: number
  rootVelZ: number
  rootHeadingRateY: number
  jointAngles: number[]
  jointRates: number[]
}

export interface SolverDiagnostics {
  kineticEnergy: number
  comX: number
  comZ: number
  comDriftFromStart: number
}
