export const DEFAULT_SPINE_CAP = Math.PI / 6

export const DEFAULT_PROJECTION_TOLERANCE = 0.05
export const DEFAULT_PROJECTION_ITERATIONS = 4

export function computeCascadeRotations(caps: number[], desiredYaw: number): number[] {
  const out = new Array(caps.length).fill(0)
  let remaining = desiredYaw
  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i]
    let contrib = remaining
    if (contrib > cap) contrib = cap
    else if (contrib < -cap) contrib = -cap
    out[i] = contrib
    remaining -= contrib
  }
  return out
}

export interface CascadeSegment {
  nodeBackX: number
  nodeBackZ: number
}

export interface LegConstraint {
  cascadeIndex: number
  hipLocalX: number
  hipLocalZ: number
  legLength: number
  plantedX: number
  plantedZ: number
}

export interface ProjectLegConstraintsParams {
  caps: number[]
  candidateYaws: number[]
  segments: CascadeSegment[]
  feet: LegConstraint[]
  feetCount?: number
  rootX: number
  rootZ: number
  rootYaw: number
  tolerance?: number
  maxIterations?: number
  out: number[]
}

const scratchNodeBackWorldX: number[] = []
const scratchNodeBackWorldZ: number[] = []
const scratchCumYaw: number[] = []

function ensureScratchCapacity(n: number) {
  while (scratchNodeBackWorldX.length < n) {
    scratchNodeBackWorldX.push(0)
    scratchNodeBackWorldZ.push(0)
    scratchCumYaw.push(0)
  }
}

function forwardChainPositions(
  yaws: number[],
  segments: CascadeSegment[],
  rootX: number,
  rootZ: number,
  rootYaw: number
): void {
  const n = segments.length
  scratchNodeBackWorldX[n - 1] = rootX
  scratchNodeBackWorldZ[n - 1] = rootZ
  scratchCumYaw[n - 1] = rootYaw + yaws[n - 1]

  for (let i = n - 2; i >= 0; i--) {
    const parentYaw = scratchCumYaw[i + 1]
    const offX = segments[i].nodeBackX - segments[i + 1].nodeBackX
    const offZ = segments[i].nodeBackZ - segments[i + 1].nodeBackZ
    const c = Math.cos(parentYaw)
    const s = Math.sin(parentYaw)
    scratchNodeBackWorldX[i] = scratchNodeBackWorldX[i + 1] + (offX * c + offZ * s)
    scratchNodeBackWorldZ[i] = scratchNodeBackWorldZ[i + 1] + (-offX * s + offZ * c)
    scratchCumYaw[i] = scratchCumYaw[i + 1] + yaws[i]
  }
}

export function projectLegConstraints(params: ProjectLegConstraintsParams): number[] {
  const {
    caps,
    candidateYaws,
    segments,
    feet,
    rootX,
    rootZ,
    rootYaw,
    tolerance = DEFAULT_PROJECTION_TOLERANCE,
    maxIterations = DEFAULT_PROJECTION_ITERATIONS,
    out,
  } = params

  const n = candidateYaws.length
  while (out.length < n) out.push(0)
  out.length = n
  for (let i = 0; i < n; i++) out[i] = candidateYaws[i]

  const fc = params.feetCount ?? feet.length
  if (fc === 0 || segments.length === 0) return out

  ensureScratchCapacity(segments.length)

  for (let iter = 0; iter < maxIterations; iter++) {
    forwardChainPositions(out, segments, rootX, rootZ, rootYaw)

    let maxViolation = 0
    for (let fi = 0; fi < fc; fi++) {
      const f = feet[fi]
      const segIdx = f.cascadeIndex
      const offX = f.hipLocalX - segments[segIdx].nodeBackX
      const offZ = f.hipLocalZ - segments[segIdx].nodeBackZ
      const c = Math.cos(scratchCumYaw[segIdx])
      const s = Math.sin(scratchCumYaw[segIdx])
      const hx = scratchNodeBackWorldX[segIdx] + offX * c + offZ * s
      const hz = scratchNodeBackWorldZ[segIdx] + (-offX * s + offZ * c)
      const dx = hx - f.plantedX
      const dz = hz - f.plantedZ
      const d = Math.sqrt(dx * dx + dz * dz)
      const err = Math.abs(d - f.legLength)
      if (err > maxViolation) maxViolation = err
    }
    if (maxViolation < tolerance) break

    for (let fi = 0; fi < fc; fi++) {
      const f = feet[fi]
      forwardChainPositions(out, segments, rootX, rootZ, rootYaw)
      const segIdx = f.cascadeIndex
      const offX = f.hipLocalX - segments[segIdx].nodeBackX
      const offZ = f.hipLocalZ - segments[segIdx].nodeBackZ
      const c = Math.cos(scratchCumYaw[segIdx])
      const s = Math.sin(scratchCumYaw[segIdx])
      const hx = scratchNodeBackWorldX[segIdx] + offX * c + offZ * s
      const hz = scratchNodeBackWorldZ[segIdx] + (-offX * s + offZ * c)
      const dx = hx - f.plantedX
      const dz = hz - f.plantedZ
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < 1e-9) continue
      const err = d - f.legLength
      if (Math.abs(err) < tolerance) continue

      const ux = dx / d
      const uz = dz / d
      const targetX = f.plantedX + ux * f.legLength
      const targetZ = f.plantedZ + uz * f.legLength
      const deltaX = targetX - hx
      const deltaZ = targetZ - hz

      for (let j = segIdx; j < n; j++) {
        const pivotX = scratchNodeBackWorldX[j]
        const pivotZ = scratchNodeBackWorldZ[j]
        const jx = hz - pivotZ
        const jz = -(hx - pivotX)
        const jacMagSq = jx * jx + jz * jz
        if (jacMagSq < 1e-9) continue
        const grad = (deltaX * jx + deltaZ * jz) / jacMagSq
        const damped = grad * 0.5
        const cap = caps[j]
        let next = out[j] + damped
        if (next > cap) next = cap
        else if (next < -cap) next = -cap
        out[j] = next
      }
    }
  }

  return out
}
