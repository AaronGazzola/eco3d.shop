'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAnimateStore } from '@/app/admin/animate/animateStore'

// The creature's centre of mass, and the heading the roaming controller is steering from. Drawn because
// the heading is a DERIVED quantity: it is not where the nose points and it is not where the body lies,
// it is the averaged direction of travel over the last few seconds. Every reversal and every hard lock
// seen so far came from that quantity being something other than it looked, and it could only be read
// out of a capture afterwards rather than watched as it happened.
//
// Read straight from the diagnostics the runtime publishes, which is the same vector the controller was
// handed, so the arrow cannot show one heading while the steering uses another.
const ARROW_LENGTH = 12
// The heading is a mean of unit vectors, so its length is a coherence measure between 0 and 1 rather
// than a speed: 1 is a creature travelling dead straight, near 0 is one thrashing with no net direction.
// It scales the arrow, so a heading the controller should not trust is visibly short.
const MIN_DRAWN = 0.02
// Head proportions fixed against the constant shaft, never against a scaled one.
const HEAD_LENGTH = ARROW_LENGTH * 0.22
const HEAD_WIDTH = ARROW_LENGTH * 0.12

export function HeadingMarker() {
  const groupRef = useRef<THREE.Group>(null)
  const arrowRef = useRef<THREE.ArrowHelper>(null)
  const tankEnabled = useAnimateStore((s) => s.tankEnabled)

  const arrow = useMemo(
    () =>
      new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        ARROW_LENGTH,
        0xfbbf24,
        HEAD_LENGTH,
        HEAD_WIDTH,
      ),
    [],
  )
  const dot = useMemo(
    () =>
      new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
      ),
    [],
  )

  useEffect(() => {
    return () => {
      arrow.dispose()
      dot.geometry.dispose()
      ;(dot.material as THREE.Material).dispose()
    }
  }, [arrow, dot])

  // Driven per frame rather than by re-rendering on every diagnostics update: the marker has to track a
  // body that moves every frame, and re-rendering the whole scene at that rate to move one arrow is a
  // cost with nothing to show for it.
  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const d = useAnimateStore.getState().simDiagnostics
    g.position.set(d.comX, d.comY, d.comZ)
    const len = Math.hypot(d.headingX, d.headingZ)
    if (len < MIN_DRAWN) {
      arrow.visible = false
      return
    }
    arrow.visible = true
    // Constant length, so the arrow is read for its DIRECTION alone. Scaling it by the heading's
    // coherence was tried and made the arrowhead swallow the shaft whenever coherence was low, which is
    // exactly when the direction most needs reading.
    arrow.setDirection(new THREE.Vector3(d.headingX / len, 0, d.headingZ / len))
  })

  if (!tankEnabled) return null
  return (
    <group ref={groupRef}>
      <primitive object={dot} />
      <primitive object={arrow} ref={arrowRef} />
    </group>
  )
}
