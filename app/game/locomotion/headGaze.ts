import * as THREE from 'three'
import { BodyGroup } from '@/app/studio/page.types'

export const DEFAULT_HEAD_CAP = Math.PI / 3

export function computeDesiredHeadYaw(
  head: BodyGroup,
  attractor: { x: number; y: number; z: number },
  modelRotation: [number, number, number]
): number | null {
  if (!head.nodeFront || !head.nodeBack) return null

  const modelQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...modelRotation))
  const modelQInv = modelQ.clone().invert()

  const attLocal = new THREE.Vector3(attractor.x, attractor.y, attractor.z).applyQuaternion(modelQInv)

  const back = new THREE.Vector3(head.nodeBack.x, head.nodeBack.y ?? 0, head.nodeBack.z)
  const front = new THREE.Vector3(head.nodeFront.x, head.nodeFront.y ?? 0, head.nodeFront.z)

  const restFwd = new THREE.Vector3().subVectors(front, back)
  restFwd.y = 0
  if (restFwd.lengthSq() < 1e-8) {
    throw new Error('Head nodeFront and nodeBack are coincident in the horizontal plane')
  }

  const desired = new THREE.Vector3().subVectors(attLocal, back)
  desired.y = 0
  if (desired.lengthSq() < 1e-8) return 0

  const restYaw = Math.atan2(restFwd.x, restFwd.z)
  const desYaw = Math.atan2(desired.x, desired.z)
  let yawDelta = desYaw - restYaw
  while (yawDelta > Math.PI) yawDelta -= 2 * Math.PI
  while (yawDelta < -Math.PI) yawDelta += 2 * Math.PI
  return yawDelta
}
