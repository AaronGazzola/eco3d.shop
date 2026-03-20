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
