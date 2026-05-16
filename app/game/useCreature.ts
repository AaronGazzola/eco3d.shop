'use client'

import { MutableRefObject, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { Chain3D } from './chain3d'
import { Solver, LimbState, IntentState } from './animations/solver'
import { Director } from './animations/director'
import { createDragonBehaviors } from './animations/dragon'

export type { LimbState, IntentState } from './animations/solver'

export function useCreature(
  config: CreatureConfig,
  targetRef: MutableRefObject<THREE.Vector3>,
  enabled: boolean = true,
) {
  const solverRef = useRef<Solver | null>(null)
  const directorRef = useRef<Director | null>(null)
  const chainRef = useRef<Chain3D | null>(null)
  const limbStatesRef = useRef<LimbState[]>([])
  const intentRef = useRef<IntentState | null>(null)

  useEffect(() => {
    if (!enabled) return
    const solver = new Solver(config)
    const director = new Director({
      initial: 'wandering',
      registry: createDragonBehaviors(),
    })
    solverRef.current = solver
    directorRef.current = director
    chainRef.current = solver.chain
    limbStatesRef.current = solver.limbs
    intentRef.current = solver.intent
  }, [
    enabled,
    config.segmentCount,
    config.segmentLength,
    config.segmentLengths,
    config.angleConstraint,
    config.limbNodes.length,
    config.limbSegmentLength,
    config.hipJointFrontIndex,
    config.hipJointBackIndex,
    config.chainOrigin?.x,
    config.chainOrigin?.z,
    config.initialJoints,
  ])

  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
    if (solverRef.current) solverRef.current.config = config
  }, [config])

  useFrame((_, delta) => {
    if (!enabled) return
    const director = directorRef.current
    const solver = solverRef.current
    if (!director || !solver) return
    const drive = director.update({ targetRef, config: configRef.current, time: performance.now() }, delta)
    solver.apply(drive, delta)
  })

  return { chainRef, limbStatesRef, intentRef }
}
