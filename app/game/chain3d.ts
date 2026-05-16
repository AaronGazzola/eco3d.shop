import * as THREE from 'three'

export function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a <= -Math.PI) a += 2 * Math.PI
  return a
}

export function constrainAngle(angle: number, anchor: number, constraint: number): number {
  const diff = normalizeAngle(angle - anchor)
  if (Math.abs(diff) <= constraint) return angle
  return anchor + Math.sign(diff) * constraint
}

export class Chain3D {
  joints: THREE.Vector3[]
  angles: number[]
  segmentLengths: number[]
  angleConstraint: number

  constructor(
    origin: THREE.Vector3,
    count: number,
    segmentLengths: number[],
    constraint: number
  ) {
    this.segmentLengths = segmentLengths
    this.angleConstraint = constraint
    this.joints = []
    this.angles = []
    let z = origin.z
    for (let i = 0; i < count; i++) {
      this.joints.push(new THREE.Vector3(origin.x, origin.y, z))
      this.angles.push(0)
      if (i < segmentLengths.length) z += segmentLengths[i]
    }
  }

  resolve(target: THREE.Vector3, heading: number): void {
    this.joints[0].copy(target)
    this.angles[0] = heading
    for (let i = 1; i < this.joints.length; i++) {
      const segLen = this.segmentLengths[i - 1] ?? this.segmentLengths[this.segmentLengths.length - 1]
      const prev = this.joints[i - 1]
      const curr = this.joints[i]
      const rawAngle = Math.atan2(prev.z - curr.z, prev.x - curr.x)
      const constrained = constrainAngle(rawAngle, this.angles[i - 1], this.angleConstraint)
      this.angles[i] = constrained
      curr.x = prev.x - Math.cos(constrained) * segLen
      curr.y = prev.y
      curr.z = prev.z - Math.sin(constrained) * segLen
    }
  }

  resolveDualAnchor(startIdx: number, endIdx: number, iterations: number = 3): void {
    if (endIdx <= startIdx + 1) return
    const startY = this.joints[startIdx].y
    const endY = this.joints[endIdx].y
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = startIdx + 1; i < endIdx; i++) {
        const segLen = this.segmentLengths[i - 1] ?? this.segmentLengths[this.segmentLengths.length - 1]
        const prev = this.joints[i - 1]
        const curr = this.joints[i]
        const dx = curr.x - prev.x
        const dz = curr.z - prev.z
        const dist = Math.hypot(dx, dz)
        if (dist > 0.0001) {
          const ratio = segLen / dist
          curr.x = prev.x + dx * ratio
          curr.z = prev.z + dz * ratio
        } else {
          curr.x = prev.x + segLen
          curr.z = prev.z
        }
      }
      for (let i = endIdx - 1; i > startIdx; i--) {
        const segLen = this.segmentLengths[i] ?? this.segmentLengths[this.segmentLengths.length - 1]
        const next = this.joints[i + 1]
        const curr = this.joints[i]
        const dx = curr.x - next.x
        const dz = curr.z - next.z
        const dist = Math.hypot(dx, dz)
        if (dist > 0.0001) {
          const ratio = segLen / dist
          curr.x = next.x + dx * ratio
          curr.z = next.z + dz * ratio
        } else {
          curr.x = next.x - segLen
          curr.z = next.z
        }
      }
    }
    const span = endIdx - startIdx
    for (let i = startIdx + 1; i < endIdx; i++) {
      const t = (i - startIdx) / span
      this.joints[i].y = startY * (1 - t) + endY * t
    }
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const prev = this.joints[i - 1]
      const curr = this.joints[i]
      this.angles[i] = Math.atan2(prev.z - curr.z, prev.x - curr.x)
    }
  }

  resolveHeadSection(anchorIdx: number, attractor?: THREE.Vector3): void {
    if (anchorIdx <= 0) return
    const anchorY = this.joints[anchorIdx].y
    for (let i = anchorIdx - 1; i >= 0; i--) {
      const segLen = this.segmentLengths[i] ?? this.segmentLengths[this.segmentLengths.length - 1]
      const next = this.joints[i + 1]
      const curr = this.joints[i]

      let parentAngle: number
      if (i + 2 < this.joints.length) {
        const beyond = this.joints[i + 2]
        parentAngle = Math.atan2(next.z - beyond.z, next.x - beyond.x)
      } else {
        parentAngle = this.angles[i + 1] ?? 0
      }

      let rawAngle: number
      if (i === 0 && attractor) {
        rawAngle = Math.atan2(attractor.z - next.z, attractor.x - next.x)
      } else {
        rawAngle = Math.atan2(curr.z - next.z, curr.x - next.x)
      }

      const constrained = constrainAngle(rawAngle, parentAngle, this.angleConstraint)
      this.angles[i] = constrained
      curr.x = next.x + Math.cos(constrained) * segLen
      curr.y = anchorY
      curr.z = next.z + Math.sin(constrained) * segLen
    }
  }

  resolveTailSection(anchorIdx: number): void {
    if (anchorIdx >= this.joints.length - 1) return
    const anchorY = this.joints[anchorIdx].y
    for (let i = anchorIdx + 1; i < this.joints.length; i++) {
      const segLen = this.segmentLengths[i - 1] ?? this.segmentLengths[this.segmentLengths.length - 1]
      const prev = this.joints[i - 1]
      const curr = this.joints[i]

      let parentAngle: number
      if (i - 2 >= 0) {
        const before = this.joints[i - 2]
        parentAngle = Math.atan2(before.z - prev.z, before.x - prev.x)
      } else {
        parentAngle = this.angles[i - 1] ?? 0
      }

      const rawAngle = Math.atan2(prev.z - curr.z, prev.x - curr.x)
      const constrained = constrainAngle(rawAngle, parentAngle, this.angleConstraint)
      this.angles[i] = constrained
      curr.x = prev.x - Math.cos(constrained) * segLen
      curr.y = anchorY
      curr.z = prev.z - Math.sin(constrained) * segLen
    }
  }

  reinit(origin: THREE.Vector3): void {
    let z = origin.z
    for (let i = 0; i < this.joints.length; i++) {
      this.joints[i].set(origin.x, origin.y, z)
      this.angles[i] = 0
      if (i < this.segmentLengths.length) z += this.segmentLengths[i]
    }
  }
}
