'use client'

import { RefObject, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { BodyGroup } from '@/app/admin/_lib/types'
import { pickSimConfig, useAnimateStore } from '@/app/admin/animate/animateStore'
import { createMujocoLocomotion, MujocoLocomotion } from './mujocoRuntime'

const TIMESTEP = 1 / 120
const MAX_FRAME = 0.05
const DIAGNOSTICS_INTERVAL = 0.1

// Drives the studio rig with the reduced-coordinate MuJoCo engine when `simEngine === 'mujoco'`. Builds
// a fresh driver from the node skeleton on each Run, steps it from the same fixed-1/120 accumulator the
// Rapier path uses (so freeze/step/slow-mo apply), and writes each rig group's matrix from the MuJoCo
// body transform — the identical `Translate(t)·Rotate(q)·Translate(−restCenter)` mapping useLocomotion
// uses — so what renders is exactly what MuJoCo simulates. Runs only when active; otherwise idle.
export function useMujocoLocomotion(
  bodyRefs: RefObject<Map<string, THREE.Group>>,
  groups: BodyGroup[],
  rootRef?: RefObject<THREE.Group | null>
): void {
  const driverRef = useRef<MujocoLocomotion | null>(null)
  const loadingRef = useRef(false)
  const accRef = useRef(0)
  const builtGroupsRef = useRef<BodyGroup[] | null>(null)
  const obsDriverRef = useRef<MujocoLocomotion | null>(null)
  const baseComRef = useRef<[number, number, number] | null>(null)
  const diagAccumRef = useRef(0)
  const scratch = useRef({
    q: new THREE.Quaternion(),
    v: new THREE.Vector3(),
    mat: new THREE.Matrix4(),
    matT: new THREE.Matrix4(),
    one: new THREE.Vector3(1, 1, 1),
  })

  // Publish the same harness-facing data the Rapier path does (mirrors useLocomotion): throttled sim
  // diagnostics, plus the node-position / primitive-window / foot-reach capture the observe harness reads
  // off window.__nodeCapture. Fresh driver → reset the captured baseline COM and the diag accumulator.
  const publishObservation = (driver: MujocoLocomotion, store: ReturnType<typeof useAnimateStore.getState>, dt: number): void => {
    if (obsDriverRef.current !== driver) {
      obsDriverRef.current = driver
      baseComRef.current = null
      diagAccumRef.current = 0
    }
    if (baseComRef.current === null) {
      const nds = driver.nodePositions()
      const inv = 1 / Math.max(1, nds.length)
      let cx = 0, cy = 0, cz = 0
      for (const n of nds) { cx += n.x; cy += n.y; cz += n.z }
      baseComRef.current = [cx * inv, cy * inv, cz * inv]
    }

    diagAccumRef.current += dt
    if (diagAccumRef.current >= DIAGNOSTICS_INTERVAL) {
      diagAccumRef.current -= DIAGNOSTICS_INTERVAL
      store.setSimTime(driver.time)
      store.setSimDiagnostics(driver.diag(baseComRef.current))
    }

    if (typeof window === 'undefined') return
    const ncap = window.__nodeCapture
    if (!ncap?.active) return
    const cf = driver.capFracNow()
    if (cf > (ncap.maxCapFrac ?? 0)) ncap.maxCapFrac = cf
    // Roll rocking/vibration: peak |roll| + reversal count (roll-rate sign flips over a small deadband).
    const roll = driver.rollDegNow()
    const aRoll = Math.abs(roll)
    if (aRoll > (ncap.maxRollDeg ?? 0)) ncap.maxRollDeg = aRoll
    const rate = roll - (ncap.prevRoll ?? roll)
    const prevRate = ncap.prevRollRate ?? 0
    if (Math.abs(rate) > 0.01 && Math.abs(prevRate) > 0.01 && Math.sign(rate) !== Math.sign(prevRate)) {
      ncap.rollFlips = (ncap.rollFlips ?? 0) + 1
    }
    ncap.prevRoll = roll
    if (Math.abs(rate) > 0.01) ncap.prevRollRate = rate
    const tNow = (performance.now() - ncap.startWallTime) / 1000
    if (!window.__nodeCaptureSpec) {
      const spec = driver.nodeSpec()
      window.__nodeCaptureSpec = { count: spec.count, groupIds: spec.groupIds.slice(), segLength: spec.segLength.slice() }
    }
    const interval = ncap.hz > 0 ? 1 / ncap.hz : 0
    if (ncap.buffer.length < ncap.maxSamples && tNow - ncap.lastSampleTime >= interval - 1e-4) {
      ncap.lastSampleTime = tNow
      ncap.buffer.push({ t: tNow, nodes: driver.nodePositions(), cpg: driver.cpgSigned() })
    }

    if (!ncap.events) return
    const legs = driver.legObs()
    const gripShift = store.gripShift
    const gripDuration = store.gripDuration
    const stepDuty = Math.min(0.95, Math.max(0.05, store.gripDuration))
    if (!ncap.prevWindows) ncap.prevWindows = legs.map(() => ({ grip: false, sweep: false, lift: false }))
    if (!ncap.reachAccum) {
      ncap.reachAccum = legs.map(() => ({ c: 0, s: 0, n: 0, cAx: 0, sAx: 0, minFore: Infinity, maxFore: -Infinity, phiAtMin: 0, phiAtMax: 0 }))
      ncap.reachLegs = legs.map((l) => l.leg)
    }
    for (let h = 0; h < legs.length; h++) {
      const lo = legs[h]
      const phase = lo.phase
      const phaseRad = phase * 2 * Math.PI
      const rel = ((phase - gripShift) % 1 + 1) % 1
      const win = { grip: rel < gripDuration, sweep: rel < stepDuty, lift: rel >= stepDuty }
      const prev = ncap.prevWindows[h]
      for (const prim of ['grip', 'sweep', 'lift'] as const) {
        if (win[prim] !== prev[prim]) {
          const edge: 'start' | 'end' = win[prim] ? 'start' : 'end'
          ncap.eventBuffer.push({
            t: tNow, leg: lo.leg, primitive: prim, edge, rel, phase,
            ...(ncap.eventSnapshots ? { nodes: driver.nodePositions() } : {}),
          })
        }
      }
      ncap.prevWindows[h] = win
      const fore = lo.hipX - lo.footX
      const ra = ncap.reachAccum[h]
      ra.c += fore * Math.cos(phaseRad)
      ra.s += fore * Math.sin(phaseRad)
      ra.n += 1
      if (fore < ra.minFore) { ra.minFore = fore; ra.phiAtMin = phase }
      if (fore > ra.maxFore) { ra.maxFore = fore; ra.phiAtMax = phase }
    }
  }

  useFrame((_state, dt) => {
    const store = useAnimateStore.getState()
    const active = store.simEngine === 'mujoco' && store.coupledRunning && store.animateTab !== 'calibrate'

    // Not active → tear down so the next Run starts fresh (mirrors the Rapier rebuild-on-run).
    if (!active) {
      if (driverRef.current) {
        driverRef.current.dispose()
        driverRef.current = null
        builtGroupsRef.current = null
      }
      accRef.current = 0
      return
    }

    // Rebuild if there is no driver yet, or the loaded creature changed.
    if (!loadingRef.current && (driverRef.current === null || builtGroupsRef.current !== groups)) {
      if (driverRef.current) {
        driverRef.current.dispose()
        driverRef.current = null
      }
      loadingRef.current = true
      const forGroups = groups
      createMujocoLocomotion(groups)
        .then((d) => {
          driverRef.current = d
          builtGroupsRef.current = forGroups
        })
        .catch((e) => console.error('MuJoCo driver build failed', e))
        .finally(() => {
          loadingRef.current = false
        })
    }

    const driver = driverRef.current
    if (!driver) return

    const cfg = pickSimConfig(store)
    const speed = Math.max(0.1, Math.min(1, store.playSpeed))
    const stepTicks = Math.max(0, store.consumeStepRequest())
    const intake = (store.frozen ? 0 : Math.min(dt, MAX_FRAME) * speed) + stepTicks * TIMESTEP
    let acc = accRef.current + intake
    while (acc >= TIMESTEP) {
      driver.step(cfg)
      acc -= TIMESTEP
    }
    accRef.current = acc

    const segGroups = bodyRefs.current
    if (segGroups) {
      const s = scratch.current
      for (const t of driver.transforms()) {
        const g = segGroups.get(t.groupId)
        if (!g) continue
        s.q.set(t.quat[0], t.quat[1], t.quat[2], t.quat[3])
        s.v.set(t.pos[0], t.pos[1], t.pos[2])
        s.mat.compose(s.v, s.q, s.one)
        s.matT.makeTranslation(-t.restCenter[0], -t.restCenter[1], -t.restCenter[2])
        s.mat.multiply(s.matT)
        g.matrix.copy(s.mat)
        g.matrixWorldNeedsUpdate = true
      }
    }
    const root = rootRef?.current
    if (root) {
      root.position.set(0, 0, 0)
      root.quaternion.identity()
    }

    publishObservation(driver, store, dt)
  })
}
