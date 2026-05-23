'use client'

import { RefObject, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BodyGroup } from '@/app/admin/_lib/types'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { buildSkeletonTree, flattenSkeleton, effectiveAngleCaps } from './chain'
import { findFrontHip, findRearHip, findLegsForHip } from './legs'
import {
  buildCpgNetwork,
  initCpgState,
  tickCpg,
  axialYawWithSteer,
  computeDriveSteer,
  CpgNetwork,
  CpgState,
  DEFAULT_STEER_SCALE,
  DEFAULT_STRIDE_FORWARD,
} from './cpg'
import {
  FootState,
  LIFT_HEIGHT,
  makeFootState,
  updateFootFromPhase,
  footWorldX,
  footWorldY,
  footWorldZ,
} from './foot'
import {
  recordFrame,
  getRecording,
  AxialOscSnapshot,
  LimbOscSnapshot,
  PivotSnapshot,
  FrameSnapshot,
} from './diagnostics'

const SLERP_RATE = 12
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

interface Scratch {
  qYaw: THREE.Quaternion
  qPitch: THREE.Quaternion
  qLeg: THREE.Quaternion
  qWorld: THREE.Quaternion
  qWorldInv: THREE.Quaternion
  qMesh: THREE.Quaternion
  v1: THREE.Vector3
  v2: THREE.Vector3
  v3: THREE.Vector3
  v4: THREE.Vector3
  v5: THREE.Vector3
  v6: THREE.Vector3
  wp: THREE.Vector3
}

function writeMarker(marker: THREE.Group | null, foot: FootState) {
  if (!marker) return
  marker.position.set(footWorldX(foot), footWorldY(foot), footWorldZ(foot))
}

function yawFromQuaternion(q: THREE.Quaternion): number {
  const sinY = 2 * (q.w * q.y - q.z * q.x)
  const cosY = 1 - 2 * (q.y * q.y + q.x * q.x)
  return Math.atan2(sinY, cosY)
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

  hipPivot.updateWorldMatrix(true, false)
  hipPivot.getWorldQuaternion(scratch.qWorld)
  scratch.qWorldInv.copy(scratch.qWorld).invert()

  const hRest = scratch.v2.set(hipNode.x, hipNode.y ?? 0, hipNode.z)
  const fRest = scratch.v3.set(leg.nodeFoot.x, leg.nodeFoot.y ?? 0, leg.nodeFoot.z)

  const hNow = scratch.v4
    .set(hRest.x - hipBackX, hRest.y - hipBackY, hRest.z - hipBackZ)
    .applyMatrix4(hipPivot.matrixWorld)
  const fNow = scratch.v5.set(footWorldX(foot), footWorldY(foot), footWorldZ(foot))

  const dRest = scratch.v6.subVectors(fRest, hRest)
  if (dRest.lengthSq() < 1e-10) return
  dRest.normalize()

  const dNowLocal = scratch.v1.subVectors(fNow, hNow)
  if (dNowLocal.lengthSq() < 1e-10) return
  dNowLocal.applyQuaternion(scratch.qWorldInv).normalize()

  const legCaps = effectiveAngleCaps(leg)
  const yawForward = legCaps.yaw
  const yawBackward = legCaps.yawBack ?? legCaps.yaw
  const restYaw = Math.atan2(dRest.x, dRest.z)
  const nowYaw = Math.atan2(dNowLocal.x, dNowLocal.z)
  let yawDelta = nowYaw - restYaw
  while (yawDelta > Math.PI) yawDelta -= 2 * Math.PI
  while (yawDelta < -Math.PI) yawDelta += 2 * Math.PI
  if (yawDelta > yawForward) yawDelta = yawForward
  else if (yawDelta < -yawBackward) yawDelta = -yawBackward
  const clampedYaw = restYaw + yawDelta
  const xzMag = Math.sqrt(dNowLocal.x * dNowLocal.x + dNowLocal.z * dNowLocal.z)
  dNowLocal.set(xzMag * Math.sin(clampedYaw), dNowLocal.y, xzMag * Math.cos(clampedYaw))
  if (dNowLocal.lengthSq() < 1e-10) return
  dNowLocal.normalize()

  scratch.qLeg.setFromUnitVectors(dRest, dNowLocal)
  scratch.qMesh.copy(scratch.qWorld).multiply(scratch.qLeg)
  mesh.quaternion.copy(scratch.qMesh)
  scratch.v3.copy(hRest).applyQuaternion(scratch.qMesh)
  mesh.position.copy(hNow).sub(scratch.v3)
}

export interface FootMarkerPairRefs {
  left: RefObject<THREE.Group | null>
  right: RefObject<THREE.Group | null>
}

export interface FootMarkerRefs {
  front: FootMarkerPairRefs | null
  rear: FootMarkerPairRefs | null
}

function pickMarker(
  markers: FootMarkerRefs | undefined,
  isFront: boolean,
  side: 'left' | 'right'
): THREE.Group | null {
  const pair = isFront ? markers?.front : markers?.rear
  if (!pair) return null
  const ref = side === 'left' ? pair.left : pair.right
  return ref?.current ?? null
}

interface HeadFrame {
  worldX: number
  worldZ: number
  forwardX: number
  forwardZ: number
}

function readHeadFrame(
  headGroup: BodyGroup,
  headPivot: THREE.Group,
  scratch: Scratch
): HeadFrame {
  headPivot.updateWorldMatrix(true, false)
  scratch.wp.set(0, 0, 0).applyMatrix4(headPivot.matrixWorld)
  const worldX = scratch.wp.x
  const worldZ = scratch.wp.z
  let forwardX = 0
  let forwardZ = 1
  const nf = headGroup.nodeFront
  const nb = headGroup.nodeBack
  if (nf && nb) {
    scratch.v2.set(nf.x - nb.x, 0, nf.z - nb.z)
    headPivot.getWorldQuaternion(scratch.qWorld)
    scratch.v2.applyQuaternion(scratch.qWorld)
    const mag = Math.sqrt(scratch.v2.x * scratch.v2.x + scratch.v2.z * scratch.v2.z)
    if (mag > 1e-6) {
      forwardX = scratch.v2.x / mag
      forwardZ = scratch.v2.z / mag
    }
  }
  return { worldX, worldZ, forwardX, forwardZ }
}

function ensureFootState(
  footStates: Map<string, FootState>,
  legId: string,
  initialX: number,
  initialZ: number,
  restY: number
): FootState {
  const existing = footStates.get(legId)
  if (existing) return existing
  const next = makeFootState(initialX, initialZ, restY)
  footStates.set(legId, next)
  return next
}

export function useLocomotion(
  pivotsRef: RefObject<Map<string, THREE.Group>>,
  groups: BodyGroup[],
  modelRotation: [number, number, number],
  footMarkers?: FootMarkerRefs
) {
  const targetQuat = useRef(new THREE.Quaternion())
  const networkRef = useRef<CpgNetwork>({
    axial: [],
    limb: [],
    axialAxialCouplings: [],
    limbAxialCouplings: [],
  })
  const cpgStateRef = useRef<CpgState>({ axial: [], limb: [] })
  const footStatesRef = useRef<Map<string, FootState>>(new Map())
  const playbackTimingRef = useRef<{
    wasPlaying: boolean
    startWallMs: number
    startFrameIndex: number
    startFrameT: number
  }>({ wasPlaying: false, startWallMs: 0, startFrameIndex: 0, startFrameT: 0 })

  const scratchRef = useRef<Scratch>({
    qYaw: new THREE.Quaternion(),
    qPitch: new THREE.Quaternion(),
    qLeg: new THREE.Quaternion(),
    qWorld: new THREE.Quaternion(),
    qWorldInv: new THREE.Quaternion(),
    qMesh: new THREE.Quaternion(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    v3: new THREE.Vector3(),
    v4: new THREE.Vector3(),
    v5: new THREE.Vector3(),
    v6: new THREE.Vector3(),
    wp: new THREE.Vector3(),
  })

  const network = useMemo(() => buildCpgNetwork(groups), [groups])
  const skeletonGroups = useMemo(() => flattenSkeleton(buildSkeletonTree(groups)), [groups])
  const cascadeIdxFor = useMemo(() => {
    const m = new Map<string, number>()
    network.axial.forEach((a, i) => m.set(a.id, i))
    return m
  }, [network])
  const cascadeIds = useMemo(() => new Set(network.axial.map((a) => a.id)), [network])
  const allLegs = useMemo(
    () => groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right'),
    [groups]
  )
  const groupById = useMemo(() => {
    const m = new Map<string, BodyGroup>()
    for (const g of groups) m.set(g.id, g)
    return m
  }, [groups])
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

  useEffect(() => {
    networkRef.current = network
    cpgStateRef.current = initCpgState(network)
    footStatesRef.current = new Map()
  }, [network])

  useFrame((_, dt) => {
    const pivots = pivotsRef.current
    if (!pivots) return
    if (network.axial.length === 0) return

    const storeState = useAnimateStore.getState()
    const calibrating = storeState.animateTab === 'calibrate'
    const calibratingGroupId = storeState.calibratingGroupId
    const calibratingYaw = storeState.calibratingYaw
    const calibratingPitch = storeState.calibratingPitch
    const playback = storeState.playback
    const scratch = scratchRef.current

    if (playback.active) {
      const frames = getRecording()
      if (frames.length === 0) {
        playbackTimingRef.current.wasPlaying = false
        return
      }
      let frameIndex = Math.min(Math.max(0, playback.frameIndex), frames.length - 1)
      const timing = playbackTimingRef.current
      const nowMs = performance.now()

      if (playback.playing) {
        if (!timing.wasPlaying) {
          timing.wasPlaying = true
          timing.startWallMs = nowMs
          timing.startFrameIndex = frameIndex
          timing.startFrameT = frames[frameIndex].t
        }
        const targetT = timing.startFrameT + (nowMs - timing.startWallMs)
        let i = timing.startFrameIndex
        while (i + 1 < frames.length && frames[i + 1].t <= targetT) i++
        if (i >= frames.length - 1 && targetT > frames[frames.length - 1].t) {
          useAnimateStore.getState().setPlaybackPlaying(false)
          useAnimateStore.getState().setPlaybackFrameIndex(frames.length - 1)
          frameIndex = frames.length - 1
        } else if (i !== frameIndex) {
          useAnimateStore.getState().setPlaybackFrameIndex(i)
          frameIndex = i
        }
      } else {
        timing.wasPlaying = false
      }

      const snap = frames[frameIndex]

      const pivotQuats = new Map<string, [number, number, number, number]>()
      for (const p of snap.pivots) pivotQuats.set(p.id, p.appliedQuat)

      for (const sg of skeletonGroups) {
        const pivot = pivots.get(sg.id)
        if (!pivot) continue
        const q = pivotQuats.get(sg.id)
        if (q) pivot.quaternion.set(q[0], q[1], q[2], q[3])
        else pivot.quaternion.identity()
      }

      for (const leg of allLegs) {
        const mesh = pivots.get(leg.id)
        if (!mesh) continue
        mesh.quaternion.identity()
        mesh.position.set(0, 0, 0)
      }

      const foots = footStatesRef.current
      for (const lo of snap.limbOscillators) {
        let foot = foots.get(lo.id)
        if (!foot) {
          foot = makeFootState(lo.plantedX, lo.plantedZ, lo.plantedY)
          foots.set(lo.id, foot)
        }
        foot.plantedX = lo.plantedX
        foot.plantedY = lo.plantedY
        foot.plantedZ = lo.plantedZ
        foot.currentX = lo.worldX
        foot.currentY = lo.worldY
        foot.currentZ = lo.worldZ
        foot.phase = lo.stanceOrSwing
        foot.restY = lo.plantedY
      }

      for (const limbDesc of network.limb) {
        const foot = foots.get(limbDesc.id)
        if (!foot) continue
        const hipGroup = limbDesc.isFront ? frontHip : rearHip
        if (!hipGroup?.nodeBack) continue
        const hipPivot = pivots.get(hipGroup.id)
        if (!hipPivot) continue
        const legGroup = groupById.get(limbDesc.id)
        if (!legGroup) continue
        const hipNode = limbDesc.side === 'left' ? hipGroup.nodeHipLeft : hipGroup.nodeHipRight
        applyLegBone(
          scratch,
          pivots,
          hipPivot,
          hipGroup.nodeBack.x,
          hipGroup.nodeBack.y ?? 0,
          hipGroup.nodeBack.z,
          legGroup,
          hipNode,
          foot
        )
        const marker = pickMarker(footMarkers, limbDesc.isFront, limbDesc.side)
        if (marker) writeMarker(marker, foot)
      }

      return
    } else {
      playbackTimingRef.current.wasPlaying = false
    }

    const effectiveDt = dt * storeState.solver.timeScale
    const attractor = calibrating ? null : storeState.attractor

    const headGroup = groups.find((g) => g.id === network.axial[0]?.id)
    const headPivot = headGroup ? pivots.get(headGroup.id) : null
    let drive = 0
    let steer = 0
    if (!calibrating && headGroup && headPivot) {
      const headFrame = readHeadFrame(headGroup, headPivot, scratch)
      const ds = computeDriveSteer(
        attractor,
        { x: headFrame.worldX, z: headFrame.worldZ },
        { x: headFrame.forwardX, z: headFrame.forwardZ }
      )
      drive = ds.drive
      steer = ds.steer
    }

    const tick = tickCpg(cpgStateRef.current, network, drive, steer, effectiveDt)

    const alpha = 1 - Math.exp(-SLERP_RATE * effectiveDt)
    const nowMs = performance.now()
    const pivotSnapshots: PivotSnapshot[] = []

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
        const capYaw = effectiveAngleCaps(sg).yaw
        const finalYaw = axialYawWithSteer(tick.axialYaws[i], steer, capYaw, DEFAULT_STEER_SCALE)
        targetQuat.current.setFromAxisAngle(Y_AXIS, finalYaw)
        requestedYaw = finalYaw
      } else {
        targetQuat.current.identity()
      }

      pivot.quaternion.slerp(targetQuat.current, alpha)

      if (cascadeIds.has(sg.id)) {
        const q = pivot.quaternion
        const eulerY = yawFromQuaternion(q)
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

    let bodyForwardX = 0
    let bodyForwardZ = 1
    if (!calibrating && headGroup && headPivot) {
      const hf = readHeadFrame(headGroup, headPivot, scratch)
      bodyForwardX = hf.forwardX
      bodyForwardZ = hf.forwardZ
    }
    const strideForward = drive * DEFAULT_STRIDE_FORWARD

    const limbSnapshots: LimbOscSnapshot[] = []
    if (!calibrating) {
      for (let li = 0; li < network.limb.length; li++) {
        const limbDesc = network.limb[li]
        const limbPhase = tick.limbPhases[li]
        const limbState = cpgStateRef.current.limb[li]
        const hipGroup = limbDesc.isFront ? frontHip : rearHip
        if (!hipGroup?.nodeBack) continue
        const hipPivot = pivots.get(hipGroup.id)
        if (!hipPivot) continue
        const legGroup = groupById.get(limbDesc.id)
        if (!legGroup?.nodeFoot) continue
        const hipNode =
          limbDesc.side === 'left' ? hipGroup.nodeHipLeft : hipGroup.nodeHipRight
        if (!hipNode) continue

        hipPivot.updateWorldMatrix(true, false)
        scratch.v1
          .set(hipNode.x - hipGroup.nodeBack.x, 0, hipNode.z - hipGroup.nodeBack.z)
          .applyMatrix4(hipPivot.matrixWorld)
        const hipSocketWorldX = scratch.v1.x
        const hipSocketWorldZ = scratch.v1.z

        hipPivot.getWorldQuaternion(scratch.qWorld)
        const hipWorldYaw = yawFromQuaternion(scratch.qWorld)

        const restOffsetX = legGroup.nodeFoot.x - hipNode.x
        const restOffsetZ = legGroup.nodeFoot.z - hipNode.z
        const restY = legGroup.nodeFoot.y ?? 0

        const foot = ensureFootState(
          footStatesRef.current,
          limbDesc.id,
          hipSocketWorldX + restOffsetX,
          hipSocketWorldZ + restOffsetZ,
          restY
        )

        updateFootFromPhase(foot, {
          limbPhase,
          hipSocketWorldX,
          hipSocketWorldZ,
          hipWorldYaw,
          restOffsetX,
          restOffsetZ,
          restY,
          bodyForwardX,
          bodyForwardZ,
          strideForward,
        })

        applyLegBone(
          scratch,
          pivots,
          hipPivot,
          hipGroup.nodeBack.x,
          hipGroup.nodeBack.y ?? 0,
          hipGroup.nodeBack.z,
          legGroup,
          hipNode,
          foot
        )

        const marker = pickMarker(footMarkers, limbDesc.isFront, limbDesc.side)
        if (marker) writeMarker(marker, foot)

        limbSnapshots.push({
          id: limbDesc.id,
          hipId: limbDesc.hipId,
          side: limbDesc.side,
          isFront: limbDesc.isFront,
          phase: limbState.phase,
          amplitude: limbState.amplitude,
          stanceOrSwing: foot.phase,
          plantedX: foot.plantedX,
          plantedY: foot.plantedY,
          plantedZ: foot.plantedZ,
          worldX: foot.currentX,
          worldY: foot.currentY,
          worldZ: foot.currentZ,
        })
      }
    }

    const axialSnapshots: AxialOscSnapshot[] = network.axial.map((a, i) => ({
      id: a.id,
      name: a.name,
      phase: cpgStateRef.current.axial[i].phase,
      amplitude: cpgStateRef.current.axial[i].amplitude,
      intrinsicFrequency: tick.intrinsicFrequency,
      outputYaw: tick.axialYaws[i],
    }))

    const snapshot: FrameSnapshot = {
      t: nowMs,
      attractor: attractor ? { x: attractor.x, y: attractor.y, z: attractor.z } : null,
      modelRotation: [modelRotation[0], modelRotation[1], modelRotation[2]],
      drive,
      steer,
      chain: network.axial.map((a) => {
        const g = groupById.get(a.id)
        return { id: a.id, name: a.name, type: g?.type ?? 'spine' }
      }),
      axialOscillators: axialSnapshots,
      limbOscillators: limbSnapshots,
      pivots: pivotSnapshots,
    }
    recordFrame(snapshot)

    void frontLegs
    void rearLegs
    void LIFT_HEIGHT
  })
}
