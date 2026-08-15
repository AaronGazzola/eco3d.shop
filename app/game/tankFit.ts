import type { TankView } from './motion/resolve'

// Where the overlay's camera goes, given the volume it has to frame. Pure on purpose: no React, no
// three, no store. The claim this file exists to support — that the whole tank is inside the frustum —
// is only worth making if it can be CHECKED, and it is checked by projecting the tank's eight corners
// through the returned camera at several aspect ratios. A screenshot cannot make that claim: a corner
// outside the frame looks exactly like a corner that is not there.

export interface TankVolume {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface TankFit {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
}

// A little room around the volume so the glass is not flush with the frame edge.
const FIT_PADDING = 1.05

export function fitTankCamera(opts: {
  bounds: TankVolume
  view: TankView
  aspect: number
  fovDeg: number
}): TankFit {
  const { bounds, view, aspect, fovDeg } = opts
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const halfW = (bounds.maxX - bounds.minX) / 2
  const halfH = (bounds.maxY - bounds.minY) / 2
  const halfD = (bounds.maxZ - bounds.minZ) / 2

  // The vertical half-angle is the field of view; the horizontal one follows from the aspect ratio.
  const vHalf = (fovDeg * Math.PI) / 360
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)

  // Both faces fit the plane the creature actually moves in, which is not the same plane in each case.
  //
  // Side-on watches a flying creature, which occupies the whole volume, so the plane to fit is the NEAR
  // face: its corners subtend the widest angle, and fitting from the centre lets them fall outside the
  // frustum.
  //
  // Overhead watches a creature on the floor, so the plane to fit is the FLOOR. Fitting the near face
  // there — the ceiling — was measured and looked wrong: the tank is 30 units tall, the creature lives 30
  // units beyond the plane being framed, and it came out at roughly a fifth of the window with the rest
  // of the frame empty. It also made the framing depend on the tank's height, which is nothing to a
  // grounded creature but headroom it never uses.
  if (view === 'overhead') {
    const distance = Math.max(halfW / Math.tan(hHalf), halfD / Math.tan(vHalf)) * FIT_PADDING
    // Aimed at the floor, not at the tank's mid-height. With the camera measured up from the floor and
    // the aim left at the centre, a tank taller than twice the fitted distance puts the target ABOVE the
    // camera and it ends up looking at the ceiling. Caught by the fit check, which is the reason the fit
    // is a function.
    const target: [number, number, number] = [cx, bounds.minY, cz]
    // Straight down −Y. The up direction has to be given explicitly: with the default up of +Y it is
    // parallel to the view direction, the frame's roll is undefined and lookAt produces a degenerate
    // basis. −Z up puts +X to the right of the frame and −Z toward the top, so a creature travelling
    // along the tank's long axis crosses the window rather than climbing it.
    //
    // Measured up from the floor, so the height of the glass above the creature changes nothing about
    // how large it appears.
    return { position: [cx, bounds.minY + distance, cz], target, up: [0, 0, -1] }
  }
  const distance = Math.max(halfW / Math.tan(hHalf), halfH / Math.tan(vHalf)) * FIT_PADDING
  return { position: [cx, cy, cz + halfD + distance], target: [cx, cy, cz], up: [0, 1, 0] }
}
