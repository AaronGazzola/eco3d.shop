'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { BodyGroup } from '@/app/admin/_lib/types'
import type { Pose } from '@/app/game/animation.types'
import { buildNetwork, networkToPose } from './network'
import {
  EXCITABILITY_AXIAL,
  axialLeftIndex,
  jointBends,
  setAxialDrive,
  stepNetwork,
} from './oscillator'
import type { OscillatorNetwork } from './oscillator.types'
import {
  advanceRoot,
  chainSegments,
  forwardAxis,
  segmentVelocities,
  swimSpeed,
} from './swim'
import type { SegmentState } from './swim'

export interface LocomotionParams {
  groups: BodyGroup[]
  drive: number
  bendGain: number
  thrustGain: number
  drag: number
  running: boolean
}

export interface LocomotionStats {
  frequencyHz: number
  totalLagRad: number
  speed: number
  bends: number[]
}

function restPose(): Pose {
  return { root: { x: 0, z: 0, yawRad: 0 }, joints: {} }
}

function wrapSigned(value: number): number {
  let d = value
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

export function useLocomotion(params: LocomotionParams) {
  const paramsRef = useRef(params)

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  const networkRef = useRef<OscillatorNetwork | null>(null)
  const groupsKeyRef = useRef('')
  const poseRef = useRef<Pose>(restPose())
  const previousSegmentsRef = useRef<SegmentState[]>([])
  const forwardRef = useRef({ x: 1, z: 0 })
  const speedRef = useRef(0)
  const bendsRef = useRef<number[]>([])

  const ensureNetwork = useCallback((): OscillatorNetwork => {
    const { groups, drive } = paramsRef.current
    const key = groups.map((g) => g.id).join(',')
    if (!networkRef.current || groupsKeyRef.current !== key) {
      const network = buildNetwork(groups, drive)
      networkRef.current = network
      groupsKeyRef.current = key
      forwardRef.current = forwardAxis(groups)
      const pose = networkToPose(groups, new Array(network.jointCount).fill(0))
      poseRef.current = pose
      previousSegmentsRef.current = chainSegments(groups, pose)
      bendsRef.current = new Array(network.jointCount).fill(0)
      speedRef.current = 0
    }
    return networkRef.current
  }, [])

  const poseSource = useCallback(
    (dt: number): Pose => {
      const { groups, drive, bendGain, thrustGain, drag, running } = paramsRef.current
      const network = ensureNetwork()
      if (!running || groups.length === 0) return poseRef.current

      setAxialDrive(network, drive)
      stepNetwork(network, dt)

      const { bends } = jointBends(network, bendGain)
      bendsRef.current = bends

      const next = networkToPose(groups, bends)
      next.root = { ...poseRef.current.root }

      const segments = chainSegments(groups, next)
      const velocities = segmentVelocities(previousSegmentsRef.current, segments, dt)
      const speed = swimSpeed(segments, velocities, forwardRef.current, {
        thrustGain,
        drag: Math.max(drag, 0.001),
      })
      speedRef.current = speed
      advanceRoot(next, speed, dt, forwardRef.current)

      previousSegmentsRef.current = segments
      poseRef.current = next
      return next
    },
    [ensureNetwork],
  )

  const reset = useCallback(() => {
    networkRef.current = null
    groupsKeyRef.current = ''
    poseRef.current = restPose()
    previousSegmentsRef.current = []
    speedRef.current = 0
    bendsRef.current = []
  }, [])

  const getStats = useCallback((): LocomotionStats => {
    const network = networkRef.current
    let totalLagRad = 0
    if (network) {
      for (let j = 1; j < network.jointCount; j++) {
        totalLagRad += wrapSigned(
          network.oscillators[axialLeftIndex(j - 1)].phase -
            network.oscillators[axialLeftIndex(j)].phase,
        )
      }
    }
    return {
      frequencyHz: paramsRef.current.drive * EXCITABILITY_AXIAL,
      totalLagRad,
      speed: speedRef.current,
      bends: bendsRef.current,
    }
  }, [])

  const getPose = useCallback(() => poseRef.current, [])

  return { poseSource, reset, getStats, getPose }
}
