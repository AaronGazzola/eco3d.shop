import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import type { ColumnShape, Sphere, ConnectionLimits } from "../page.stores";

export type JointAngles = {
  yaw: number;
  pitch: number;
  roll: number;
  yawAxis: THREE.Vector3;
  pitchAxis: THREE.Vector3;
  rollAxis: THREE.Vector3;
};

export function buildAlignmentFrame(
  parentQuat: THREE.Quaternion,
  backCol: ColumnShape,
  frontConn: Sphere,
): {
  colWorldQuat: THREE.Quaternion;
  normalWorld: THREE.Vector3;
  tangentWorld: THREE.Vector3;
  binormalWorld: THREE.Vector3;
  qAlign: THREE.Quaternion;
} {
  const colLocalQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(backCol.rotationX, backCol.rotationY, backCol.rotationZ)
  );
  const colWorldQuat = parentQuat.clone().multiply(colLocalQuat);

  const normalWorld = new THREE.Vector3(-backCol.height, 0, 0).normalize().applyQuaternion(colWorldQuat);
  const tangentWorld = new THREE.Vector3(0, backCol.height, 0).normalize().applyQuaternion(colWorldQuat);
  const binormalWorld = tangentWorld.clone().cross(normalWorld).normalize();

  const frontDir = new THREE.Vector3(...frontConn.position).normalize();
  const localUpRef = new THREE.Vector3(0, 1, 0);
  let localUp = localUpRef.clone().sub(frontDir.clone().multiplyScalar(localUpRef.dot(frontDir)));
  if (localUp.lengthSq() < 0.001) {
    const alt = new THREE.Vector3(0, 0, 1);
    localUp = alt.clone().sub(frontDir.clone().multiplyScalar(alt.dot(frontDir)));
  }
  localUp.normalize();
  const localRight = new THREE.Vector3().crossVectors(frontDir, localUp).normalize();
  const mLocal = new THREE.Matrix4().makeBasis(localRight, localUp, frontDir.clone().negate());
  const mWorld = new THREE.Matrix4().makeBasis(binormalWorld, tangentWorld, normalWorld.clone());
  const qAlign = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().multiplyMatrices(mWorld, mLocal.clone().transpose())
  );

  return { colWorldQuat, normalWorld, tangentWorld, binormalWorld, qAlign };
}

export function computeChildTransform(
  parentPos: THREE.Vector3,
  parentQuat: THREE.Quaternion,
  backCol: ColumnShape,
  frontConn: Sphere,
  position: number,
  pitch: number,
  yaw: number,
  roll: number,
): { pos: THREE.Vector3; quat: THREE.Quaternion } {
  const t = position - 0.5;
  const { colWorldQuat, normalWorld, tangentWorld, binormalWorld, qAlign } =
    buildAlignmentFrame(parentQuat, backCol, frontConn);

  const centerWorld = new THREE.Vector3(...backCol.center).applyQuaternion(parentQuat).add(parentPos);
  const attachPt = new THREE.Vector3(0, t * backCol.height, 0).applyQuaternion(colWorldQuat).add(centerWorld);

  const qPitch = new THREE.Quaternion().setFromAxisAngle(binormalWorld, pitch);
  const qYaw   = new THREE.Quaternion().setFromAxisAngle(tangentWorld, yaw);
  const qRoll  = new THREE.Quaternion().setFromAxisAngle(normalWorld, roll);
  const childQuat = qRoll.clone().multiply(qYaw).multiply(qPitch).multiply(qAlign);
  const childPos = attachPt.clone().sub(new THREE.Vector3(...frontConn.position).applyQuaternion(childQuat));

  return { pos: childPos, quat: childQuat };
}

export function computeBackAnchor(col: ColumnShape, position: number): [number, number, number] {
  const t = position - 0.5;
  const offset = new THREE.Vector3(0, t * col.height, 0);
  offset.applyEuler(new THREE.Euler(col.rotationX, col.rotationY, col.rotationZ));
  return new THREE.Vector3(...col.center).add(offset).toArray() as [number, number, number];
}

export function computeJointAngles(
  parentQuat: THREE.Quaternion,
  childQuat: THREE.Quaternion,
  backCol: ColumnShape,
  frontConn: Sphere,
  yawOffset: number = 0,
): JointAngles {
  const { normalWorld, tangentWorld, binormalWorld, qAlign } = buildAlignmentFrame(parentQuat, backCol, frontConn);
  const qRef = yawOffset !== 0
    ? new THREE.Quaternion().setFromAxisAngle(tangentWorld, yawOffset).multiply(qAlign)
    : qAlign;
  const devQuat = qRef.clone().conjugate().multiply(childQuat);
  const qRefConj = qRef.clone().conjugate();
  const tangentLocal  = tangentWorld.clone().applyQuaternion(qRefConj);
  const binormalLocal = binormalWorld.clone().applyQuaternion(qRefConj);
  const normalLocal   = normalWorld.clone().applyQuaternion(qRefConj);
  const basisMat = new THREE.Matrix4().makeBasis(binormalLocal, tangentLocal, normalLocal);
  const qBasis = new THREE.Quaternion().setFromRotationMatrix(basisMat);
  const devLocal = qBasis.clone().conjugate().multiply(devQuat).multiply(qBasis);
  const euler = new THREE.Euler().setFromQuaternion(devLocal, "ZYX");
  return {
    yaw:   yawOffset + euler.y,
    pitch: euler.x,
    roll:  euler.z,
    yawAxis:   tangentWorld,
    pitchAxis: binormalWorld,
    rollAxis:  normalWorld,
  };
}

export function enforceAngleLimits(
  angles: JointAngles,
  limits: ConnectionLimits,
  child: RapierRigidBody,
) {
  const vel = child.angvel();
  let vx = vel.x, vy = vel.y, vz = vel.z;
  let changed = false;
  const clamp = (actual: number, min: number, max: number, axis: THREE.Vector3) => {
    const dir = actual < min ? -1 : actual > max ? 1 : 0;
    if (dir === 0) return;
    const velOnAxis = vx * axis.x + vy * axis.y + vz * axis.z;
    if (dir * velOnAxis > 0) {
      vx -= velOnAxis * axis.x;
      vy -= velOnAxis * axis.y;
      vz -= velOnAxis * axis.z;
      changed = true;
    }
  };
  clamp(angles.yaw,   limits.yawMin,   limits.yawMax,   angles.yawAxis);
  clamp(angles.pitch, limits.pitchMin, limits.pitchMax, angles.pitchAxis);
  clamp(angles.roll,  limits.rollMin,  limits.rollMax,  angles.rollAxis);
  if (changed) child.setAngvel({ x: vx, y: vy, z: vz }, true);
}
