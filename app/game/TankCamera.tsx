'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAnimateStore } from '@/app/admin/animate/animateStore'

const FIT_PADDING = 1.05

// The game window is a pane of glass in the side of a tank, so the camera is FIXED: it is placed once,
// square-on to the tank's +Z face, aimed at the tank's centre, and never moves again. It does not track
// the creature. That is the whole point — a creature swimming toward the glass has to grow and one
// swimming away has to shrink, and a camera that chases the creature cancels exactly that cue and
// flattens the volume back into a picture.
//
// The distance is fitted so the whole tank is inside the frustum, width and height fitted separately
// with the looser winning. Refitting happens on a viewport change only: a browser source can be resized
// at any time, and re-framing in response to the WINDOW is not tracking the CREATURE.
export function TankCamera() {
  const { camera, size, controls } = useThree()
  const bounds = useAnimateStore((s) => s.tankBounds)
  const tankEnabled = useAnimateStore((s) => s.tankEnabled)

  // The bounds are published by the physics once the model is built, several frames after mount, so
  // complaining about that gap would report every healthy page load as a failure. The running motion is
  // what distinguishes the two: a motion that asked for no tank is a real fault, not a wait.
  useEffect(() => {
    if (!tankEnabled) console.error('game: the running motion carries no tank, so the camera has no volume to frame')
  }, [tankEnabled])

  useEffect(() => {
    if (!bounds) return
    const perspective = camera as THREE.PerspectiveCamera
    const cx = (bounds.minX + bounds.maxX) / 2
    const cy = (bounds.minY + bounds.maxY) / 2
    const cz = (bounds.minZ + bounds.maxZ) / 2
    const halfW = (bounds.maxX - bounds.minX) / 2
    const halfH = (bounds.maxY - bounds.minY) / 2
    const halfD = (bounds.maxZ - bounds.minZ) / 2

    const vHalf = (perspective.fov * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * perspective.aspect)
    // Measured from the NEAR face, not from the centre: the near face is the closest thing that has to
    // stay inside the frustum, and fitting from the centre lets the near corners fall outside it.
    const distance = Math.max(halfW / Math.tan(hHalf), halfH / Math.tan(vHalf)) * FIT_PADDING + halfD

    camera.position.set(cx, cy, cz + halfD + distance)
    camera.lookAt(cx, cy, cz)
    // With inspect controls on, the orbit target has to be the tank centre too, or the controls' own
    // target (the origin) overrides the aim on the first mouse move and the fit is thrown away.
    const oc = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null
    if (oc?.target) {
      oc.target.set(cx, cy, cz)
      oc.update?.()
    }
  }, [camera, controls, bounds, size.width, size.height])

  return null
}
