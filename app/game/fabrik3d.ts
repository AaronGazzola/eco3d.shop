import * as THREE from 'three'

function constrainToDistance(pos: THREE.Vector3, anchor: THREE.Vector3, dist: number): void {
  const dir = pos.clone().sub(anchor)
  const len = dir.length()
  if (len < 0.0001) return
  pos.copy(anchor).addScaledVector(dir, dist / len)
}

export function fabrikResolve(
  joints: THREE.Vector3[],
  target: THREE.Vector3,
  anchor: THREE.Vector3,
  segLen: number
): void {
  joints[0].copy(target)
  for (let i = 1; i < joints.length; i++) {
    constrainToDistance(joints[i], joints[i - 1], segLen)
  }

  joints[joints.length - 1].copy(anchor)
  for (let i = joints.length - 2; i >= 0; i--) {
    constrainToDistance(joints[i], joints[i + 1], segLen)
  }
}
