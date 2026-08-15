'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAnimateStore } from '@/app/admin/animate/animateStore'
import { fitTankCamera } from './tankFit'
import type { TankView } from './motion/resolve'

// The game window is a pane of glass in the side of a tank, or a lid over the top of one, so the camera
// is FIXED: it is placed once, aimed at the tank's centre, and never moves again. It does not track the
// creature. That is the whole point — a camera that chases the creature cancels exactly the cues that
// make the window read as a volume rather than a picture.
//
// Which face it watches through comes from the running motion, not from here. A creature on the floor is
// watched from above; one in flight is watched square-on through the glass.
//
// Refitting happens on a viewport change only: a browser source can be resized at any time, and
// re-framing in response to the WINDOW is not tracking the CREATURE.
export function TankCamera({ view }: { view: TankView }) {
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
    const fit = fitTankCamera({ bounds, view, aspect: perspective.aspect, fovDeg: perspective.fov })

    // Up before lookAt, always. lookAt builds its basis from the current up, so setting it afterwards
    // leaves the rotation stale — and looking straight down with the default +Y up is degenerate.
    camera.up.set(...fit.up)
    camera.position.set(...fit.position)
    camera.lookAt(...fit.target)
    // With inspect controls on, the orbit target has to be the tank centre too, or the controls' own
    // target (the origin) overrides the aim on the first mouse move and the fit is thrown away.
    const oc = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null
    if (oc?.target) {
      oc.target.set(...fit.target)
      oc.update?.()
    }
  }, [camera, controls, bounds, view, size.width, size.height])

  return null
}
