'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useAnimateStore } from '@/app/admin/animate/animateStore'

// The region the creature is confined to, drawn so it can be seen in the same frame as the creature.
// Without it a creature outside the WINDOW and a creature outside the TANK look identical, and the
// camera and the physics cannot be told apart.
//
// The floor rectangle only. Overhead, the camera fits the floor, so the floor rectangle is the exact
// shape the fit claims to frame and the line should sit just inside the window edge. The tank's other
// eight edges are deliberately not drawn: an edge above the floor projects OUTWARD under perspective, so
// a line that is expected to fall outside the window cannot be read as evidence that something has
// fallen outside the window.
//
// Drawn from the bounds the physics publishes, which is the same source `fitTankCamera` is given, so the
// line cannot disagree with either the physics or the camera. Deriving the rectangle from the tank's
// width and depth instead would be a third opinion, and a diagnostic that can be wrong about the thing
// it measures is worse than no diagnostic.
export function TankBounds() {
  const bounds = useAnimateStore((s) => s.tankBounds)

  // Null until the physics has built its model and published, which is several frames after mount. That
  // gap is every healthy page load, so it is silent rather than logged.
  const line = useMemo(() => {
    if (!bounds) return null
    const { minX, maxX, minY, minZ, maxZ } = bounds
    const corners = [
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, minY, minZ),
      new THREE.Vector3(maxX, minY, maxZ),
      new THREE.Vector3(minX, minY, maxZ),
    ]
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(corners),
      // Lines, never a filled surface: the outline must not obscure the creature it is drawn to measure.
      new THREE.LineBasicMaterial({ color: '#22d3ee' }),
    )
  }, [bounds])

  // The bounds are republished on every rebuild, so a run that resizes the tank or resets the creature
  // builds a new line and the old one has to go with it.
  useEffect(() => {
    if (!line) return
    return () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    }
  }, [line])

  if (!line) return null
  return <primitive object={line} />
}
