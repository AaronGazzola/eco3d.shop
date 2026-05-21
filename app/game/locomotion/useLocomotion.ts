'use client'

import { RefObject, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BodyGroup } from '@/app/admin/_lib/types'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { computeDesiredHeadYaw } from './headGaze'
import { buildCascadeChain, buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'
import { computeCascadeRotations } from './cascade'
import { findFrontHip, findRearHip, findLegsForHip } from './legs'
import {
  FootState,
  STEP_DURATION,
  LIFT_HEIGHT,
  STRAIN_THRESHOLD,
  makeFootState,
  footTargetAt,
  computeStrain,
  easeInOut,
} from './foot'
import {
  recordFrame,
  isRecording,
  FootSnapshot,
  HipSnapshot,
  PivotSnapshot,
  FrameSnapshot,
} from './diagnostics'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

function yawCapFor(g: BodyGroup): number {
  return effectiveAngleCaps(g).yaw
}

interface Scratch {
  qYaw: THREE.Quaternion
  qPitch: THREE.Quaternion
  qLeg: THREE.Quaternion
  v1: THREE.Vector3
  v2: THREE.Vector3
  v3: THREE.Vector3
  v4: THREE.Vector3
  v5: THREE.Vector3
  v6: THREE.Vector3
  wp: THREE.Vector3
}

function footWorldX(foot: FootState): number {
  if (foot.phase === 'planted') return foot.plantedX
  const t = easeInOut(foot.swingT)
  return foot.swingStartX + (foot.swingTargetX - foot.swingStartX) * t
}

function footWorldZ(foot: FootState): number {
  if (foot.phase === 'planted') return foot.plantedZ
  const t = easeInOut(foot.swingT)
  return foot.swingStartZ + (foot.swingTargetZ - foot.swingStartZ) * t
}

function footWorldY(foot: FootState): number {
  if (foot.phase === 'planted') return foot.restY
  return foot.restY + Math.sin(foot.swingT * Math.PI) * LIFT_HEIGHT
}

function writeMarker(marker: THREE.Group | null, foot: FootState) {
  if (!marker) return
  marker.position.set(footWorldX(foot), footWorldY(foot), footWorldZ(foot))
}

function applyLegBone(
  scratch: Scratch,
  pivots: Map<string, THREE.Group>,
  hipPivot: THREE.Group,
  hipBackX: number,
  hipBackY: number,
  hipBackZ: number,
  leg: BodyGroup | null,
  hipNode: { x: number; y?: number; z: number } | undefined,
  foot: FootState
): void {
  if (!leg?.nodeFoot || !hipNode) return
  const mesh = pivots.get(leg.id)
  if (!mesh) return
  const hRest = scratch.v2.set(hipNode.x, hipNode.y ?? 0, hipNode.z)
  const fRest = scratch.v3.set(leg.nodeFoot.x, leg.nodeFoot.y ?? 0, leg.nodeFoot.z)
  const hNow = scratch.v4
    .set(hRest.x - hipBackX, hRest.y - hipBackY, hRest.z - hipBackZ)
    .applyQuaternion(hipPivot.quaternion)
  hNow.x += hipBackX
  hNow.y += hipBackY
  hNow.z += hipBackZ
  const fNow = scratch.v5.set(footWorldX(foot), footWorldY(foot), footWorldZ(foot))
  const dRest = scratch.v6.subVectors(fRest, hRest)
  if (dRest.lengthSq() < 1e-10) return
  dRest.normalize()
  const dNow = scratch.v1.subVectors(fNow, hNow)
  if (dNow.lengthSq() < 1e-10) return
  dNow.normalize()

  const legCaps = effectiveAngleCaps(leg)
  const yawForward = legCaps.yaw
  const yawBackward = legCaps.yawBack ?? legCaps.yaw
  const restYaw = Math.atan2(dRest.x, dRest.z)
  const nowYaw = Math.atan2(dNow.x, dNow.z)
  let yawDelta = nowYaw - restYaw
  while (yawDelta > Math.PI) yawDelta -= 2 * Math.PI
  while (yawDelta < -Math.PI) yawDelta += 2 * Math.PI
  if (yawDelta > yawForward) yawDelta = yawForward
  else if (yawDelta < -yawBackward) yawDelta = -yawBackward
  const clampedYaw = restYaw + yawDelta
  const xzMag = Math.sqrt(dNow.x * dNow.x + dNow.z * dNow.z)
  const dNowClamped = scratch.v1
  dNowClamped.set(xzMag * Math.sin(clampedYaw), dNow.y, xzMag * Math.cos(clampedYaw))
  if (dNowClamped.lengthSq() < 1e-10) return
  dNowClamped.normalize()

  scratch.qLeg.setFromUnitVectors(dRest, dNowClamped)
  mesh.quaternion.copy(scratch.qLeg)
  scratch.v3.copy(hRest).applyQuaternion(scratch.qLeg)
  mesh.position.copy(hNow).sub(scratch.v3)
}

interface HipState {
  plantedYaw: number
  targetYaw: number
}

interface FootPair {
  left: FootState | null
  right: FootState | null
}

interface HipRuntime {
  state: HipState
  feet: FootPair
  initId: string | null
}

interface HipStepResult {
  appliedYaw: number
  leftStrain: number
  rightStrain: number
}

export interface FootMarkerPairRefs {
  left: RefObject<THREE.Group | null>
  right: RefObject<THREE.Group | null>
}

export interface FootMarkerRefs {
  front: FootMarkerPairRefs | null
  rear: FootMarkerPairRefs | null
}

const SNAPSHOT_INTERVAL_MS = 500

function makeHipRuntime(): HipRuntime {
  return {
    state: { plantedYaw: 0, targetYaw: 0 },
    feet: { left: null, right: null },
    initId: null,
  }
}

function ensureHipInit(
  runtime: HipRuntime,
  hipGroup: BodyGroup,
  legs: { left: BodyGroup | null; right: BodyGroup | null }
): void {
  if (runtime.initId === hipGroup.id) return
  if (!hipGroup.nodeBack) return
  const leftLeg = legs.left
  const rightLeg = legs.right
  if (!leftLeg?.nodeFoot || !rightLeg?.nodeFoot) return
  const hipBackX = hipGroup.nodeBack.x
  const hipBackZ = hipGroup.nodeBack.z
  runtime.feet.left = makeFootState(
    leftLeg.nodeFoot.x,
    leftLeg.nodeFoot.y ?? 0,
    leftLeg.nodeFoot.z,
    hipBackX,
    hipBackZ
  )
  runtime.feet.right = makeFootState(
    rightLeg.nodeFoot.x,
    rightLeg.nodeFoot.y ?? 0,
    rightLeg.nodeFoot.z,
    hipBackX,
    hipBackZ
  )
  runtime.state.plantedYaw = 0
  runtime.state.targetYaw = 0
  runtime.initId = hipGroup.id
}

function runHipStep(
  runtime: HipRuntime,
  hipGroup: BodyGroup,
  wantedYaw: number,
  dt: number
): HipStepResult {
  const leftFoot = runtime.feet.left
  const rightFoot = runtime.feet.right
  if (!leftFoot || !rightFoot || !hipGroup.nodeBack) {
    return { appliedYaw: 0, leftStrain: 0, rightStrain: 0 }
  }
  const hipBackX = hipGroup.nodeBack.x
  const hipBackZ = hipGroup.nodeBack.z

  if (leftFoot.phase === 'stepping') {
    leftFoot.swingT = Math.min(1, leftFoot.swingT + dt / STEP_DURATION)
    if (leftFoot.swingT >= 1) {
      leftFoot.plantedX = leftFoot.swingTargetX
      leftFoot.plantedZ = leftFoot.swingTargetZ
      leftFoot.phase = 'planted'
      runtime.state.plantedYaw = runtime.state.targetYaw
    }
  }
  if (rightFoot.phase === 'stepping') {
    rightFoot.swingT = Math.min(1, rightFoot.swingT + dt / STEP_DURATION)
    if (rightFoot.swingT >= 1) {
      rightFoot.plantedX = rightFoot.swingTargetX
      rightFoot.plantedZ = rightFoot.swingTargetZ
      rightFoot.phase = 'planted'
      runtime.state.plantedYaw = runtime.state.targetYaw
    }
  }

  const stepping =
    leftFoot.phase === 'stepping'
      ? leftFoot
      : rightFoot.phase === 'stepping'
        ? rightFoot
        : null

  let appliedYaw: number
  let leftStrain = 0
  let rightStrain = 0

  if (stepping) {
    appliedYaw =
      runtime.state.plantedYaw +
      (runtime.state.targetYaw - runtime.state.plantedYaw) * easeInOut(stepping.swingT)
    leftStrain = computeStrain(leftFoot, hipBackX, hipBackZ, wantedYaw)
    rightStrain = computeStrain(rightFoot, hipBackX, hipBackZ, wantedYaw)
  } else {
    appliedYaw = runtime.state.plantedYaw
    leftStrain = computeStrain(leftFoot, hipBackX, hipBackZ, wantedYaw)
    rightStrain = computeStrain(rightFoot, hipBackX, hipBackZ, wantedYaw)

    const leftStrained = leftStrain > STRAIN_THRESHOLD
    const rightStrained = rightStrain > STRAIN_THRESHOLD
    const yawDelta = wantedYaw - runtime.state.plantedYaw

    let stepFoot: FootState | null = null
    if (leftStrained && rightStrained) {
      stepFoot = yawDelta > 0 ? leftFoot : rightFoot
    } else if (leftStrained) {
      stepFoot = leftFoot
    } else if (rightStrained) {
      stepFoot = rightFoot
    }

    if (stepFoot) {
      const target = footTargetAt(stepFoot, hipBackX, hipBackZ, wantedYaw)
      stepFoot.swingStartX = stepFoot.plantedX
      stepFoot.swingStartZ = stepFoot.plantedZ
      stepFoot.swingTargetX = target.x
      stepFoot.swingTargetZ = target.z
      stepFoot.swingT = 0
      stepFoot.phase = 'stepping'
      runtime.state.targetYaw = wantedYaw
    }
  }

  return { appliedYaw, leftStrain, rightStrain }
}

function applyHipLegs(
  scratch: Scratch,
  pivots: Map<string, THREE.Group>,
  hipGroup: BodyGroup,
  legs: { left: BodyGroup | null; right: BodyGroup | null },
  runtime: HipRuntime,
  markers: FootMarkerPairRefs | null
): void {
  if (!hipGroup.nodeBack) return
  const leftFoot = runtime.feet.left
  const rightFoot = runtime.feet.right
  if (!leftFoot || !rightFoot) return
  const hipPivot = pivots.get(hipGroup.id)
  if (!hipPivot) return
  const hbx = hipGroup.nodeBack.x
  const hby = hipGroup.nodeBack.y ?? 0
  const hbz = hipGroup.nodeBack.z
  applyLegBone(scratch, pivots, hipPivot, hbx, hby, hbz, legs.left, hipGroup.nodeHipLeft, leftFoot)
  applyLegBone(scratch, pivots, hipPivot, hbx, hby, hbz, legs.right, hipGroup.nodeHipRight, rightFoot)
  if (markers) {
    writeMarker(markers.left.current, leftFoot)
    writeMarker(markers.right.current, rightFoot)
  }
}

export function useLocomotion(
  pivotsRef: RefObject<Map<string, THREE.Group>>,
  groups: BodyGroup[],
  modelRotation: [number, number, number],
  footMarkers?: FootMarkerRefs
) {
  const targetQuat = useRef(new THREE.Quaternion())
  const frontRuntimeRef = useRef<HipRuntime>(makeHipRuntime())
  const rearRuntimeRef = useRef<HipRuntime>(makeHipRuntime())
  const lastSnapshotAtRef = useRef(0)

  const scratchRef = useRef({
    qYaw: new THREE.Quaternion(),
    qPitch: new THREE.Quaternion(),
    qLeg: new THREE.Quaternion(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    v3: new THREE.Vector3(),
    v4: new THREE.Vector3(),
    v5: new THREE.Vector3(),
    v6: new THREE.Vector3(),
    wp: new THREE.Vector3(),
  })

  const chain = useMemo(() => buildCascadeChain(groups), [groups])
  const skeletonGroups = useMemo(() => flattenSkeleton(buildSkeletonTree(groups)), [groups])
  const cascadeIds = useMemo(() => new Set(chain.map((g) => g.id)), [chain])
  const cascadeIdxFor = useMemo(() => {
    const m = new Map<string, number>()
    chain.forEach((g, i) => m.set(g.id, i))
    return m
  }, [chain])
  const allLegs = useMemo(
    () => groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right'),
    [groups]
  )
  const frontHip = useMemo(() => findFrontHip(groups), [groups])
  const rearHip = useMemo(() => findRearHip(groups), [groups])
  const frontLegs = useMemo(
    () => (frontHip ? findLegsForHip(groups, frontHip.id) : { left: null, right: null }),
    [groups, frontHip]
  )
  const rearLegs = useMemo(
    () => (rearHip ? findLegsForHip(groups, rearHip.id) : { left: null, right: null }),
    [groups, rearHip]
  )
  const caps = useMemo(() => chain.map(yawCapFor), [chain, groups])

  useFrame((_, dt) => {
    const pivots = pivotsRef.current
    if (!pivots) return

    if (chain.length === 0) return

    const storeState = useAnimateStore.getState()
    const calibrating = storeState.animateTab === 'calibrate'
    const calibratingGroupId = storeState.calibratingGroupId
    const calibratingYaw = storeState.calibratingYaw
    const calibratingPitch = storeState.calibratingPitch

    const head = chain[0]
    const attractor = calibrating ? null : storeState.attractor

    let desired = 0
    if (attractor) {
      const d = computeDesiredHeadYaw(head, attractor, modelRotation)
      if (d !== null) desired = d
    }

    const cascadeOut = computeCascadeRotations(caps, desired)

    const frontHipIdx = frontHip ? (cascadeIdxFor.get(frontHip.id) ?? -1) : -1
    const rearHipIdx = rearHip ? (cascadeIdxFor.get(rearHip.id) ?? -1) : -1
    const frontInChain = frontHipIdx !== -1
    const rearInChain = rearHipIdx !== -1

    let frontResult: HipStepResult | null = null
    let rearResult: HipStepResult | null = null

    if (!calibrating && frontInChain && frontHip) {
      ensureHipInit(frontRuntimeRef.current, frontHip, frontLegs)
      frontResult = runHipStep(frontRuntimeRef.current, frontHip, cascadeOut[frontHipIdx], dt)
    }

    if (!calibrating && rearInChain && rearHip) {
      ensureHipInit(rearRuntimeRef.current, rearHip, rearLegs)
      rearResult = runHipStep(rearRuntimeRef.current, rearHip, cascadeOut[rearHipIdx], dt)
    }

    const alpha = 1 - Math.exp(-SLERP_RATE * dt)
    const scratch = scratchRef.current
    const nowMs = performance.now()
    const recording = isRecording()
    const shouldSnapshot = recording || nowMs - lastSnapshotAtRef.current >= SNAPSHOT_INTERVAL_MS
    const pivotSnapshots: PivotSnapshot[] | null = shouldSnapshot ? [] : null

    for (const sg of skeletonGroups) {
      const pivot = pivots.get(sg.id)
      if (!pivot) continue

      let requestedYaw = 0
      if (calibrating && sg.id === calibratingGroupId) {
        scratch.qYaw.setFromAxisAngle(Y_AXIS, calibratingYaw)
        scratch.qPitch.setFromAxisAngle(Z_AXIS, calibratingPitch)
        targetQuat.current.copy(scratch.qYaw).multiply(scratch.qPitch)
        requestedYaw = calibratingYaw
      } else if (!calibrating && cascadeIds.has(sg.id)) {
        const i = cascadeIdxFor.get(sg.id)!
        let r: number
        if (i === frontHipIdx && frontResult) r = frontResult.appliedYaw
        else if (i === rearHipIdx && rearResult) r = rearResult.appliedYaw
        else r = cascadeOut[i]
        targetQuat.current.setFromAxisAngle(Y_AXIS, r)
        requestedYaw = r
      } else {
        targetQuat.current.identity()
      }

      pivot.quaternion.slerp(targetQuat.current, alpha)

      if (pivotSnapshots && cascadeIds.has(sg.id)) {
        const q = pivot.quaternion
        const sinY = 2 * (q.w * q.y - q.z * q.x)
        const cosY = 1 - 2 * (q.y * q.y + q.x * q.x)
        const eulerY = Math.atan2(sinY, cosY)
        pivot.getWorldPosition(scratch.wp)
        pivotSnapshots.push({
          id: sg.id,
          name: sg.name,
          type: sg.type,
          requestedYaw,
          appliedQuat: [q.x, q.y, q.z, q.w],
          appliedEulerY: eulerY,
          worldPos: [scratch.wp.x, scratch.wp.y, scratch.wp.z],
        })
      }
    }

    for (const leg of allLegs) {
      const mesh = pivots.get(leg.id)
      if (!mesh) continue
      if (calibrating && leg.id === calibratingGroupId) continue
      mesh.quaternion.identity()
      mesh.position.set(0, 0, 0)
    }

    if (calibrating && calibratingGroupId) {
      const calibratingLeg = allLegs.find((g) => g.id === calibratingGroupId)
      if (calibratingLeg) {
        const parentSpine = calibratingLeg.attachedToSpineId
          ? groups.find((g) => g.id === calibratingLeg.attachedToSpineId)
          : null
        const hipNode =
          calibratingLeg.type === 'leg-left'
            ? parentSpine?.nodeHipLeft
            : parentSpine?.nodeHipRight
        const legMesh = pivots.get(calibratingLeg.id)
        if (legMesh && hipNode) {
          scratch.v1.set(hipNode.x, hipNode.y ?? 0, hipNode.z)
          scratch.qYaw.setFromAxisAngle(Y_AXIS, calibratingYaw)
          scratch.qPitch.setFromAxisAngle(Z_AXIS, calibratingPitch)
          scratch.qLeg.copy(scratch.qYaw).multiply(scratch.qPitch)
          legMesh.quaternion.copy(scratch.qLeg)
          scratch.v2.copy(scratch.v1).applyQuaternion(scratch.qLeg)
          legMesh.position.copy(scratch.v1).sub(scratch.v2)
        }
      }
    }

    if (!calibrating) {
      if (frontInChain && frontHip) {
        applyHipLegs(
          scratch,
          pivots,
          frontHip,
          frontLegs,
          frontRuntimeRef.current,
          footMarkers?.front ?? null
        )
      }
      if (rearInChain && rearHip) {
        applyHipLegs(
          scratch,
          pivots,
          rearHip,
          rearLegs,
          rearRuntimeRef.current,
          footMarkers?.rear ?? null
        )
      }
    }

    if (shouldSnapshot && pivotSnapshots) {
      const snapshot: FrameSnapshot = {
        t: nowMs,
        attractor: attractor ? { x: attractor.x, y: attractor.y, z: attractor.z } : null,
        modelRotation: [modelRotation[0], modelRotation[1], modelRotation[2]],
        desiredHeadYaw: desired,
        chain: chain.map((g) => ({ id: g.id, name: g.name, type: g.type })),
        caps,
        cascadeOut,
        frontHip: buildHipSnapshot(frontHip, frontHipIdx, frontRuntimeRef.current, frontResult, cascadeOut),
        rearHip: buildHipSnapshot(rearHip, rearHipIdx, rearRuntimeRef.current, rearResult, cascadeOut),
        pivots: pivotSnapshots,
      }
      recordFrame(snapshot)
      lastSnapshotAtRef.current = nowMs
    }
  })
}

function buildHipSnapshot(
  hipGroup: BodyGroup | null,
  cascadeIndex: number,
  runtime: HipRuntime,
  result: HipStepResult | null,
  cascadeOut: number[]
): HipSnapshot | null {
  if (!hipGroup || cascadeIndex === -1 || !result) return null
  const hipBack = hipGroup.nodeBack
    ? { x: hipGroup.nodeBack.x, z: hipGroup.nodeBack.z }
    : null
  return {
    id: hipGroup.id,
    hipBack,
    cascadeIndex,
    wantedYaw: cascadeOut[cascadeIndex],
    appliedYaw: result.appliedYaw,
    plantedYaw: runtime.state.plantedYaw,
    targetYaw: runtime.state.targetYaw,
    leftFoot: footSnap(runtime.feet.left, result.leftStrain),
    rightFoot: footSnap(runtime.feet.right, result.rightStrain),
  }
}

function footSnap(f: FootState | null, strain: number): FootSnapshot | null {
  if (!f) return null
  return {
    phase: f.phase,
    plantedX: f.plantedX,
    plantedZ: f.plantedZ,
    swingStartX: f.swingStartX,
    swingStartZ: f.swingStartZ,
    swingTargetX: f.swingTargetX,
    swingTargetZ: f.swingTargetZ,
    swingT: f.swingT,
    restOffsetX: f.restOffsetX,
    restOffsetZ: f.restOffsetZ,
    restY: f.restY,
    strain,
  }
}
