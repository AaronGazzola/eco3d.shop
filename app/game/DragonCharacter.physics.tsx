"use client";

import { useRef, useEffect, useMemo } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { usePageStore } from "../page.stores";
import type { DragonPiece } from "./StlModel";
import {
  MAX_PARTICLES, MAX_SEGMENTS, FLOOR_Y, PARTICLE_R,
  DRAGON_COLOR, INITIAL_PARTICLE_HEIGHT,
  HEAD_MOVE_SPEED, HEAD_YAW_SPEED, HEAD_PITCH_SPEED,
} from "./DragonCharacter.constants";
import type { Particle } from "./DragonCharacter.types";
import { _v, _v2, _v3, _v4, _q, pieceKey, buildSegDef } from "./DragonCharacter.utils";

export function DragonString({ pieces, orbitRef, ghost, gravity, damping, collisionPush, collisionSkip, constraintIters, dragStrength, pickThreshold, floorPush, yawLimitsOn, headMoveSpeed }: { pieces: DragonPiece[]; orbitRef?: RefObject<any>; ghost: boolean; gravity: number; damping: number; collisionPush: number; collisionSkip: number; constraintIters: number; dragStrength: number; pickThreshold: number; floorPush: number; yawLimitsOn: boolean; headMoveSpeed: number }) {
  const { bodyLinkCount, frontConnection, backConnection, frontPoints, backPoints, collisionSpheres, headBodyLimits, bodyBodyLimits, bodyTailLimits } = usePageStore();
  const segCount = Math.min(bodyLinkCount, 50) + 2;
  const particleCount = segCount + 1;

  const headFront = frontPoints["Dragon-2"]?.[0]?.position;
  const headBack = backConnection["Dragon-2"]?.center;
  const bodyFront = frontConnection["Dragon-1"]?.position;
  const bodyBack = backConnection["Dragon-1"]?.center;
  const tailFront = frontConnection["Dragon-0"]?.position;
  const tailBack = backPoints["Dragon-0"]?.[0]?.position;

  const particles = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      pos: new THREE.Vector3(),
      prev: new THREE.Vector3(),
    }))
  );
  const initialized = useRef(false);
  const prevSegCount = useRef(-1);

  const sphereRefs = useRef<(THREE.Mesh | null)[]>(Array(MAX_PARTICLES).fill(null));
  const segGroupRefs = useRef<(THREE.Group | null)[]>(Array(MAX_SEGMENTS).fill(null));
  const segPositions = useRef<THREE.Vector3[]>(Array.from({ length: MAX_SEGMENTS }, () => new THREE.Vector3()));
  const segQuats = useRef<THREE.Quaternion[]>(Array.from({ length: MAX_SEGMENTS }, () => new THREE.Quaternion()));

  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    return geo;
  }, []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#ffffff" }), []);
  const lineObj = useMemo(() => new THREE.Line(lineGeo, lineMat), [lineGeo, lineMat]);

  const dragParticle = useRef(-1);
  const dragPlane = useRef(new THREE.Plane());
  const mouseNDC = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());
  const keysRef = useRef(new Set<string>());

  const { gl, camera } = useThree();

  const defs = [];
  for (let i = 0; i < segCount; i++) {
    defs.push(buildSegDef(i, segCount, headFront, headBack, bodyFront, bodyBack, tailFront, tailBack));
  }
  const segDefs = useRef(defs);
  segDefs.current = defs;

  if (!initialized.current || segCount !== prevSegCount.current) {
    const pts = particles.current;
    let x = 0;
    pts[0].pos.set(0, INITIAL_PARTICLE_HEIGHT, 0);
    pts[0].prev.copy(pts[0].pos);
    for (let i = 0; i < segCount; i++) {
      x += defs[i].restLength;
      pts[i + 1].pos.set(x, INITIAL_PARTICLE_HEIGHT, 0);
      pts[i + 1].prev.copy(pts[i + 1].pos);
    }
    dragParticle.current = -1;
    initialized.current = true;
    prevSegCount.current = segCount;
  }

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);

      let bestDist = Infinity;
      let bestIdx = -1;
      const pts = particles.current;
      for (let i = 0; i < particleCount; i++) {
        const d = raycaster.current.ray.distanceToPoint(pts[i].pos);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }

      if (bestIdx >= 0 && bestDist < pickThreshold) {
        dragParticle.current = bestIdx;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dragPlane.current.setFromNormalAndCoplanarPoint(dir.negate(), pts[bestIdx].pos);
        if (orbitRef?.current) orbitRef.current.enabled = false;
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      mouseNDC.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onUp = () => {
      dragParticle.current = -1;
      if (orbitRef?.current) orbitRef.current.enabled = true;
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, camera, orbitRef, particleCount]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => keysRef.current.add(e.key);
    const onUp   = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup",   onUp);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pts = particles.current;
    const sd = segDefs.current;
    const keys = keysRef.current;

    if (keys.size > 0 && particleCount >= 3) {
      const bodyDir = _v.copy(pts[2].pos).sub(pts[1].pos);
      const bodyLen = bodyDir.length();
      if (bodyLen > 0.0001) {
        bodyDir.divideScalar(bodyLen);
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), bodyDir);
        const rightLen = right.length();
        if (rightLen > 0.0001) {
          right.divideScalar(rightLen);
          const bodyUp = new THREE.Vector3().crossVectors(bodyDir, right);

          const headDiff = new THREE.Vector3().copy(pts[0].pos).sub(pts[1].pos);
          const headLen = headDiff.length();
          if (headLen > 0.0001) {
            const headDir = headDiff.clone().divideScalar(headLen);
            const pitch = Math.atan2(headDir.dot(bodyUp), headDir.dot(bodyDir));
            const yawAxis = bodyUp.clone().applyAxisAngle(right, pitch);

            if (keys.has("a") || keys.has("A")) {
              _q.setFromAxisAngle(yawAxis, HEAD_YAW_SPEED * dt);
              pts[0].pos.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
              pts[0].prev.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
            }
            if (keys.has("d") || keys.has("D")) {
              _q.setFromAxisAngle(yawAxis, -HEAD_YAW_SPEED * dt);
              pts[0].pos.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
              pts[0].prev.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
            }
            if (keys.has("ArrowUp")) {
              _q.setFromAxisAngle(right, -HEAD_PITCH_SPEED * dt);
              pts[0].pos.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
              pts[0].prev.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
            }
            if (keys.has("ArrowDown")) {
              _q.setFromAxisAngle(right, HEAD_PITCH_SPEED * dt);
              pts[0].pos.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
              pts[0].prev.sub(pts[1].pos).applyQuaternion(_q).add(pts[1].pos);
            }

            const headDirNow = new THREE.Vector3().copy(pts[0].pos).sub(pts[1].pos).normalize();
            if (keys.has("w") || keys.has("W")) {
              pts[0].prev.addScaledVector(headDirNow, -headMoveSpeed * dt);
              pts[1].prev.addScaledVector(headDirNow, -headMoveSpeed * dt);
            }
            if (keys.has("s") || keys.has("S")) {
              pts[0].prev.addScaledVector(headDirNow, headMoveSpeed * dt);
              pts[1].prev.addScaledVector(headDirNow, headMoveSpeed * dt);
            }
          }
        }
      }
    }

    for (let i = 0; i < particleCount; i++) {
      const p = pts[i];
      const vx = (p.pos.x - p.prev.x) * damping;
      const vy = (p.pos.y - p.prev.y) * damping;
      const vz = (p.pos.z - p.prev.z) * damping;
      p.prev.copy(p.pos);
      p.pos.x += vx;
      p.pos.y += vy - gravity * dt * dt;
      p.pos.z += vz;
    }

    if (dragParticle.current >= 0 && dragParticle.current < particleCount) {
      raycaster.current.setFromCamera(mouseNDC.current, camera);
      if (raycaster.current.ray.intersectPlane(dragPlane.current, _v)) {
        pts[dragParticle.current].pos.lerp(_v, dragStrength);
      }
    }

    for (let iter = 0; iter < constraintIters; iter++) {
      for (let i = 0; i < segCount; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const dz = b.pos.z - a.pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.0001) continue;
        const diff = (dist - sd[i].restLength) / dist * 0.5;
        a.pos.x += dx * diff; a.pos.y += dy * diff; a.pos.z += dz * diff;
        b.pos.x -= dx * diff; b.pos.y -= dy * diff; b.pos.z -= dz * diff;

        if (!yawLimitsOn || i === 0) continue;

        const isBodyTail = i === segCount - 1;
        const limits = (i === 1) ? headBodyLimits
          : isBodyTail ? bodyTailLimits
          : bodyBodyLimits;
        const yawOffset = isBodyTail ? Math.PI : 0;

        _v2.copy(pts[i].pos).sub(pts[i - 1].pos);
        const d0Len = _v2.length();
        if (d0Len < 0.0001) continue;
        _v2.divideScalar(d0Len);

        if (i >= 2) {
          _v.copy(pts[i - 1].pos).sub(pts[i - 2].pos).normalize();
          const proj = _v2.dot(_v);
          _v.addScaledVector(_v2, -proj);
          const upLen = _v.length();
          if (upLen < 0.001) continue;
          _v.divideScalar(upLen);
          _v4.crossVectors(_v2, _v).normalize();
        } else {
          _v4.set(0, 1, 0);
          if (Math.abs(_v2.dot(_v4)) > 0.99) continue;
          _v4.crossVectors(_v2, _v4).normalize();
        }

        _v3.copy(pts[i + 1].pos).sub(pts[i].pos);
        const childDist = _v3.length();
        if (childDist < 0.0001) continue;

        const fwdC = _v3.dot(_v2);
        const latC = _v3.dot(_v4);
        const yaw = Math.atan2(latC, fwdC);
        const cYaw = Math.max(limits.yawMin - yawOffset, Math.min(limits.yawMax - yawOffset, yaw));
        if (Math.abs(cYaw - yaw) < 0.0001) continue;

        const horizMag = Math.sqrt(fwdC * fwdC + latC * latC);
        _v3.addScaledVector(_v2, horizMag * Math.cos(cYaw) - fwdC);
        _v3.addScaledVector(_v4, horizMag * Math.sin(cYaw) - latC);

        const ox = pts[i + 1].pos.x, oy = pts[i + 1].pos.y, oz = pts[i + 1].pos.z;
        pts[i + 1].pos.copy(pts[i].pos).add(_v3);
        pts[i + 1].prev.x += pts[i + 1].pos.x - ox;
        pts[i + 1].prev.y += pts[i + 1].pos.y - oy;
        pts[i + 1].prev.z += pts[i + 1].pos.z - oz;
        const vx2 = pts[i + 1].pos.x - pts[i + 1].prev.x;
        const vy2 = pts[i + 1].pos.y - pts[i + 1].prev.y;
        const vz2 = pts[i + 1].pos.z - pts[i + 1].prev.z;
        const vLat = vx2 * _v4.x + vy2 * _v4.y + vz2 * _v4.z;
        pts[i + 1].prev.x += vLat * _v4.x;
        pts[i + 1].prev.y += vLat * _v4.y;
        pts[i + 1].prev.z += vLat * _v4.z;
      }

      for (let i = 0; i < particleCount; i++) {
        if (pts[i].pos.y < FLOOR_Y + PARTICLE_R) {
          pts[i].pos.y = FLOOR_Y + PARTICLE_R;
          pts[i].prev.y = pts[i].pos.y;
        }
      }
    }

    for (let i = 0; i < segCount; i++) {
      _v2.copy(pts[i + 1].pos).sub(pts[i].pos);
      const len = _v2.length();
      if (len < 0.0001) continue;
      _v2.divideScalar(len);

      _q.setFromUnitVectors(sd[i].localAxis, _v2);
      _v3.set(0, 1, 0).applyQuaternion(_q);

      const fDotUp = _v2.y;
      _v4.set(-_v2.x * fDotUp, 1 - fDotUp * fDotUp, -_v2.z * fDotUp);
      const upLen = _v4.length();

      if (upLen > 0.001) {
        _v4.divideScalar(upLen);
        const cosA = Math.min(1, Math.max(-1, _v3.dot(_v4)));
        const cx = _v3.y * _v4.z - _v3.z * _v4.y;
        const cy = _v3.z * _v4.x - _v3.x * _v4.z;
        const cz = _v3.x * _v4.y - _v3.y * _v4.x;
        const sinA = cx * _v2.x + cy * _v2.y + cz * _v2.z;
        segQuats.current[i].setFromAxisAngle(_v2, Math.atan2(sinA, cosA)).multiply(_q);
      } else {
        segQuats.current[i].copy(_q);
      }

      segPositions.current[i].copy(sd[i].frontLocal).applyQuaternion(segQuats.current[i]).negate().add(pts[i].pos);
    }

    for (let i = 0; i < segCount; i++) {
      const sp = segPositions.current[i];
      const sq = segQuats.current[i];
      const key = pieceKey(i, segCount);
      const spheres = collisionSpheres[key] ?? [];
      let maxPush = 0;

      for (const s of spheres) {
        _v3.set(s.position[0], s.position[1], s.position[2]).applyQuaternion(sq);
        const wy = _v3.y + sp.y;
        const pen = s.radius - (wy - FLOOR_Y);
        if (pen > maxPush) maxPush = pen;
      }

      if (maxPush > 0) {
        const fp = maxPush * floorPush;
        pts[i].pos.y += fp;
        pts[i + 1].pos.y += fp;
        pts[i].prev.y += fp;
        pts[i + 1].prev.y += fp;
      }
    }

    for (let i = 0; i < segCount; i++) {
      const spI = segPositions.current[i];
      const sqI = segQuats.current[i];
      const keyI = pieceKey(i, segCount);
      const spheresI = collisionSpheres[keyI] ?? [];

      for (let j = i + 1 + collisionSkip; j < segCount; j++) {
        const spJ = segPositions.current[j];
        const sqJ = segQuats.current[j];
        const keyJ = pieceKey(j, segCount);
        const spheresJ = collisionSpheres[keyJ] ?? [];

        for (const si of spheresI) {
          _v3.set(si.position[0], si.position[1], si.position[2]).applyQuaternion(sqI).add(spI);
          for (const sj of spheresJ) {
            _v4.set(sj.position[0], sj.position[1], sj.position[2]).applyQuaternion(sqJ).add(spJ);
            const dx = _v3.x - _v4.x, dy = _v3.y - _v4.y, dz = _v3.z - _v4.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const minDist = si.radius + sj.radius;
            if (dist < minDist && dist > 0.001) {
              const push = (minDist - dist) * collisionPush / dist;
              const px = dx * push, py = dy * push, pz = dz * push;
              pts[i].pos.x += px * 0.25; pts[i].pos.y += py * 0.25; pts[i].pos.z += pz * 0.25;
              pts[i].prev.x += px * 0.25; pts[i].prev.y += py * 0.25; pts[i].prev.z += pz * 0.25;
              pts[i + 1].pos.x += px * 0.25; pts[i + 1].pos.y += py * 0.25; pts[i + 1].pos.z += pz * 0.25;
              pts[i + 1].prev.x += px * 0.25; pts[i + 1].prev.y += py * 0.25; pts[i + 1].prev.z += pz * 0.25;
              pts[j].pos.x -= px * 0.25; pts[j].pos.y -= py * 0.25; pts[j].pos.z -= pz * 0.25;
              pts[j].prev.x -= px * 0.25; pts[j].prev.y -= py * 0.25; pts[j].prev.z -= pz * 0.25;
              pts[j + 1].pos.x -= px * 0.25; pts[j + 1].pos.y -= py * 0.25; pts[j + 1].pos.z -= pz * 0.25;
              pts[j + 1].prev.x -= px * 0.25; pts[j + 1].prev.y -= py * 0.25; pts[j + 1].prev.z -= pz * 0.25;
            }
          }
        }
      }
    }

    for (let i = 0; i < particleCount; i++) {
      const s = sphereRefs.current[i];
      if (s) s.position.copy(pts[i].pos);
    }

    const attr = lineGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < particleCount; i++) {
      attr.setXYZ(i, pts[i].pos.x, pts[i].pos.y, pts[i].pos.z);
    }
    attr.needsUpdate = true;
    lineGeo.setDrawRange(0, particleCount);

    for (let i = 0; i < segCount; i++) {
      const g = segGroupRefs.current[i];
      if (!g) continue;
      g.position.copy(segPositions.current[i]);
      g.quaternion.copy(segQuats.current[i]);
    }
  });

  const headPiece = pieces.find((p) => p.label === "Head")!;
  const bodyPiece = pieces.find((p) => p.label === "Body")!;
  const tailPiece = pieces.find((p) => p.label === "Tail")!;
  const effectiveLinkCount = segCount - 2;

  return (
    <>
      <primitive object={lineObj} />

      {Array.from({ length: particleCount }, (_, i) => (
        <mesh key={i} ref={(el) => { sphereRefs.current[i] = el; }}>
          <sphereGeometry args={[PARTICLE_R, 8, 8]} />
          <meshStandardMaterial
            color={i === 0 ? "#ff4444" : i === particleCount - 1 ? "#4444ff" : "#ffcc44"}
          />
        </mesh>
      ))}

      <group ref={(el) => { segGroupRefs.current[0] = el; }}>
        <mesh geometry={headPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={DRAGON_COLOR} metalness={0.3} roughness={0.6} transparent={ghost} opacity={ghost ? 0.35 : 1} />
        </mesh>
      </group>

      {Array.from({ length: effectiveLinkCount }, (_, i) => (
        <group key={i} ref={(el) => { segGroupRefs.current[i + 1] = el; }}>
          <mesh geometry={bodyPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={DRAGON_COLOR} metalness={0.3} roughness={0.6} transparent={ghost} opacity={ghost ? 0.35 : 1} />
          </mesh>
        </group>
      ))}

      <group ref={(el) => { segGroupRefs.current[effectiveLinkCount + 1] = el; }}>
        <mesh geometry={tailPiece.geometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={DRAGON_COLOR} metalness={0.3} roughness={0.6} transparent={ghost} opacity={ghost ? 0.35 : 1} />
        </mesh>
      </group>
    </>
  );
}
