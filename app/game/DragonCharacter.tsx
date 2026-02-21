"use client";

import { Suspense, useRef, useEffect } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, BallCollider, useSphericalJoint, interactionGroups } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { usePageStore } from "../page.stores";
import type { ColumnShape, Sphere, ConnectionLimits } from "../page.stores";
import { useSplitStl } from "./StlModel";
import type { DragonPiece } from "./StlModel";

const MAX_BODY_LINKS = 10;

function rigidBodyRef(): RefObject<RapierRigidBody> {
  return { current: null } as unknown as RefObject<RapierRigidBody>;
}

function buildAlignmentFrame(
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

  const normalWorld = new THREE.Vector3(-backCol.height, 0, 0)
    .normalize().applyQuaternion(colWorldQuat);
  const tangentWorld = new THREE.Vector3(0, backCol.height, 0)
    .normalize().applyQuaternion(colWorldQuat);
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

function computeChildTransform(
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

function computeBackAnchor(col: ColumnShape, position: number): [number, number, number] {
  const t = position - 0.5;
  const offset = new THREE.Vector3(0, t * col.height, 0);
  offset.applyEuler(new THREE.Euler(col.rotationX, col.rotationY, col.rotationZ));
  return new THREE.Vector3(...col.center).add(offset).toArray() as [number, number, number];
}

type JointAngles = {
  yaw: number;
  pitch: number;
  roll: number;
  yawAxis: THREE.Vector3;
  pitchAxis: THREE.Vector3;
  rollAxis: THREE.Vector3;
};

function computeJointAngles(
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

function enforceAngleLimits(
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

function SegmentJoint({
  parentRef,
  childRef,
  anchor1,
  anchor2,
}: {
  parentRef: RefObject<RapierRigidBody>;
  childRef: RefObject<RapierRigidBody>;
  anchor1: [number, number, number];
  anchor2: [number, number, number];
}) {
  const joint = useSphericalJoint(parentRef, childRef, [anchor1, anchor2]);
  useEffect(() => {
    if (joint.current) {
      joint.current.setContactsEnabled(false);
    }
  });
  return null;
}

function DragonChain({ pieces }: { pieces: DragonPiece[] }) {
  const {
    frontConnection,
    backConnection,
    bodyConnectionParams,
    bodyToBodyConnectionParams,
    bodyToTailConnectionParams,
    headBodyLimits,
    bodyBodyLimits,
    bodyTailLimits,
    bodyLinkCount,
    collisionSpheres,
    setLiveJointValues,
  } = usePageStore();

  const headRef = useRef<RapierRigidBody>(null);
  const tailRef = useRef<RapierRigidBody>(null);
  const bodyRefs = useRef<RefObject<RapierRigidBody>[]>(
    Array.from({ length: MAX_BODY_LINKS }, () => rigidBodyRef())
  );

  const cursorTarget = useRef<THREE.Vector3 | null>(null);
  const isPointerDown = useRef(false);
  const frameCount = useRef(0);
  const { gl } = useThree();

  useEffect(() => {
    const handleUp = () => { isPointerDown.current = false; };
    gl.domElement.addEventListener("pointerup", handleUp);
    return () => gl.domElement.removeEventListener("pointerup", handleUp);
  }, [gl]);

  useFrame((_state, delta) => {
    frameCount.current++;

    if (headRef.current && cursorTarget.current && isPointerDown.current) {
      const body = headRef.current;
      const pos = body.translation();
      const target = cursorTarget.current;
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.05) {
        const speed = Math.min(dist * 3, 4);
        const curVel = body.linvel();
        const t = Math.min(10 * delta, 1);
        body.setLinvel({
          x: curVel.x + ((dx / dist) * speed - curVel.x) * t,
          y: curVel.y,
          z: curVel.z + ((dz / dist) * speed - curVel.z) * t,
        }, true);

        const rot = body.rotation();
        const worldQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
        const headForward = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
        headForward.y = 0;
        headForward.normalize();
        const desired = new THREE.Vector3(dx / dist, 0, dz / dist);
        const cross = headForward.clone().cross(desired);
        const dot = headForward.dot(desired);
        const angle = Math.atan2(cross.y, dot);
        const angVel = Math.max(-8, Math.min(8, angle * 12));
        body.setAngvel({ x: 0, y: angVel, z: 0 }, true);
        body.wakeUp();
      }
    }

    const headBody = headRef.current;
    const body0 = bodyRefs.current[0].current;
    const tailBody = tailRef.current;
    if (!headBody || !body0 || !tailBody) return;

    const headBackCol = backConnection["Dragon-2"];
    const bodyFrontPt = frontConnection["Dragon-1"];
    const bodyBackCol = backConnection["Dragon-1"];
    const tailFrontPt = frontConnection["Dragon-0"];
    if (!headBackCol || !bodyFrontPt || !bodyBackCol || !tailFrontPt) return;

    const headRot = headBody.rotation();
    const headQuat = new THREE.Quaternion(headRot.x, headRot.y, headRot.z, headRot.w);
    const body0Rot = body0.rotation();
    const body0Quat = new THREE.Quaternion(body0Rot.x, body0Rot.y, body0Rot.z, body0Rot.w);

    const hbAngles = computeJointAngles(headQuat, body0Quat, headBackCol, bodyFrontPt);
    enforceAngleLimits(hbAngles, headBodyLimits, body0);

    let bbAngles: JointAngles | null = null;
    let prevQuat = body0Quat;

    for (let i = 1; i < bodyLinkCount; i++) {
      const nextBody = bodyRefs.current[i].current;
      if (!nextBody) break;
      const nextRot = nextBody.rotation();
      const nextQuat = new THREE.Quaternion(nextRot.x, nextRot.y, nextRot.z, nextRot.w);
      const angles = computeJointAngles(prevQuat, nextQuat, bodyBackCol, bodyFrontPt);
      enforceAngleLimits(angles, bodyBodyLimits, nextBody);
      if (!bbAngles) bbAngles = angles;
      prevQuat = nextQuat;
    }

    const tailRot = tailBody.rotation();
    const tailQuat = new THREE.Quaternion(tailRot.x, tailRot.y, tailRot.z, tailRot.w);
    const btAngles = computeJointAngles(prevQuat, tailQuat, bodyBackCol, tailFrontPt, Math.PI);
    enforceAngleLimits(btAngles, bodyTailLimits, tailBody);

    if (frameCount.current % 6 === 0) {
      setLiveJointValues({
        headBody: { position: bodyConnectionParams.position, yaw: hbAngles.yaw, pitch: hbAngles.pitch, roll: hbAngles.roll },
        bodyBody: bbAngles
          ? { position: bodyToBodyConnectionParams.position, yaw: bbAngles.yaw, pitch: bbAngles.pitch, roll: bbAngles.roll }
          : bodyToBodyConnectionParams,
        bodyTail: { position: bodyToTailConnectionParams.position, yaw: btAngles.yaw, pitch: btAngles.pitch, roll: btAngles.roll },
      });
    }
  });

  const headPiece = pieces.find((p) => p.label === "Head")!;
  const bodyPiece = pieces.find((p) => p.label === "Body")!;
  const tailPiece = pieces.find((p) => p.label === "Tail")!;

  const headBackCol = backConnection["Dragon-2"];
  const bodyFrontPt = frontConnection["Dragon-1"];
  const bodyBackCol = backConnection["Dragon-1"];
  const tailFrontPt = frontConnection["Dragon-0"];

  const headInitialPos = new THREE.Vector3(0, 3, 0);
  const headInitialQuat = new THREE.Quaternion();

  const bodyInitialTransforms: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
  let prevPos = headInitialPos;
  let prevQuat = headInitialQuat;
  for (let i = 0; i < bodyLinkCount; i++) {
    const isFirst = i === 0;
    const connParams = isFirst ? bodyConnectionParams : bodyToBodyConnectionParams;
    const backCol = isFirst ? headBackCol : bodyBackCol;
    if (!backCol || !bodyFrontPt) break;
    const t = computeChildTransform(
      prevPos, prevQuat, backCol, bodyFrontPt,
      connParams.position, connParams.pitch, connParams.yaw, connParams.roll,
    );
    bodyInitialTransforms.push(t);
    prevPos = t.pos;
    prevQuat = t.quat;
  }

  const tailInitialPos = (bodyBackCol && tailFrontPt)
    ? computeChildTransform(
        prevPos, prevQuat, bodyBackCol, tailFrontPt,
        bodyToTailConnectionParams.position, bodyToTailConnectionParams.pitch,
        bodyToTailConnectionParams.yaw, bodyToTailConnectionParams.roll,
      ).pos
    : headInitialPos.clone().add(new THREE.Vector3(1, 0, 0));

  const headSpheres = collisionSpheres["Dragon-2"] ?? [];
  const bodySpheres = collisionSpheres["Dragon-1"] ?? [];
  const tailSpheres = collisionSpheres["Dragon-0"] ?? [];

  const headAnchor: [number, number, number] = headBackCol
    ? computeBackAnchor(headBackCol, bodyConnectionParams.position)
    : [0, 0, 0];
  const bodyBodyAnchor: [number, number, number] = bodyBackCol
    ? computeBackAnchor(bodyBackCol, bodyToBodyConnectionParams.position)
    : [0, 0, 0];
  const bodyTailAnchor: [number, number, number] = bodyBackCol
    ? computeBackAnchor(bodyBackCol, bodyToTailConnectionParams.position)
    : [0, 0, 0];
  const bodyFrontAnchor: [number, number, number] = bodyFrontPt
    ? [...bodyFrontPt.position]
    : [0, 0, 0];
  const tailFrontAnchor: [number, number, number] = tailFrontPt
    ? [...tailFrontPt.position]
    : [0, 0, 0];

  const segmentGroups = interactionGroups(1, [0, 1]);

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerDown={(e) => {
          isPointerDown.current = true;
          cursorTarget.current = e.point.clone();
        }}
        onPointerMove={(e) => {
          cursorTarget.current = e.point.clone();
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <RigidBody
        ref={headRef}
        position={headInitialPos.toArray()}
        collisionGroups={segmentGroups}
        linearDamping={0.5}
        angularDamping={0.8}
      >
        <mesh geometry={headPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} />
        </mesh>
        {headSpheres.map((s) => (
          <BallCollider key={s.id} args={[s.radius]} position={s.position} />
        ))}
      </RigidBody>

      {Array.from({ length: bodyLinkCount }, (_, i) => {
        const t = bodyInitialTransforms[i];
        return (
          <RigidBody
            key={i}
            ref={bodyRefs.current[i]}
            position={t ? t.pos.toArray() : headInitialPos.toArray()}
            collisionGroups={segmentGroups}
            linearDamping={0.5}
            angularDamping={0.8}
          >
            <mesh geometry={bodyPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} />
            </mesh>
            {bodySpheres.map((s) => (
              <BallCollider key={s.id} args={[s.radius]} position={s.position} />
            ))}
          </RigidBody>
        );
      })}

      <RigidBody
        ref={tailRef}
        position={tailInitialPos.toArray()}
        collisionGroups={segmentGroups}
        linearDamping={0.5}
        angularDamping={0.8}
      >
        <mesh geometry={tailPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#c9b18c" metalness={0.3} roughness={0.6} />
        </mesh>
        {tailSpheres.map((s) => (
          <BallCollider key={s.id} args={[s.radius]} position={s.position} />
        ))}
      </RigidBody>

      <SegmentJoint
        parentRef={headRef as RefObject<RapierRigidBody>}
        childRef={bodyRefs.current[0]}
        anchor1={headAnchor}
        anchor2={bodyFrontAnchor}
      />

      {Array.from({ length: bodyLinkCount - 1 }, (_, i) => (
        <SegmentJoint
          key={i}
          parentRef={bodyRefs.current[i]}
          childRef={bodyRefs.current[i + 1]}
          anchor1={bodyBodyAnchor}
          anchor2={bodyFrontAnchor}
        />
      ))}

      <SegmentJoint
        key={`tail-${bodyLinkCount}`}
        parentRef={bodyRefs.current[bodyLinkCount - 1]}
        childRef={tailRef as RefObject<RapierRigidBody>}
        anchor1={bodyTailAnchor}
        anchor2={tailFrontAnchor}
      />
    </>
  );
}

export function DragonCharacter() {
  const pieces = useSplitStl("/models/Bone_Dragon-1.stl");
  if (pieces.length < 3) return null;
  return (
    <Suspense fallback={null}>
      <DragonChain pieces={pieces} />
    </Suspense>
  );
}
