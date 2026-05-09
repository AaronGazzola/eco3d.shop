'use client'

import { MutableRefObject, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { Chain3D } from './chain3d'
import { Solver, LimbState } from './animations/solver'
import { Director } from './animations/director'
import { createDragonBehaviors } from './animations/dragon'

export type { LimbState } from './animations/solver'

export function useCreature(
  config: CreatureConfig,
  targetRef: MutableRefObject<THREE.Vector3>
) {
  const solverRef = useRef<Solver | null>(null)
  const directorRef = useRef<Director | null>(null)
  const chainRef = useRef<Chain3D | null>(null)
  const limbStatesRef = useRef<LimbState[]>([])

  useEffect(() => {
    const solver = new Solver(config)
    const director = new Director({
      initial: 'wandering',
      registry: createDragonBehaviors(),
    })
    solverRef.current = solver
    directorRef.current = director
    chainRef.current = solver.chain
    limbStatesRef.current = solver.limbs
  }, [
    config.segmentCount,
    config.segmentLength,
    config.segmentLengths,
    config.angleConstraint,
    config.limbNodes.length,
    config.limbSegmentLength,
    config.chainOrigin?.x,
    config.chainOrigin?.z,
    config.initialJoints,
    config,
  ])

  useFrame((_, delta) => {
    const director = directorRef.current
    const solver = solverRef.current
    if (!director || !solver) return
    const drive = director.update({ targetRef, config, time: performance.now() }, delta)
    solver.apply(drive, delta)
  })

  return { chainRef, limbStatesRef }
}
