export const DEFAULT_SPINE_CAP = Math.PI / 6

export function computeCascadeRotations(caps: number[], desiredYaw: number): number[] {
  const out = new Array(caps.length).fill(0)
  let remaining = desiredYaw
  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i]
    let contrib = remaining
    if (contrib > cap) contrib = cap
    else if (contrib < -cap) contrib = -cap
    out[i] = contrib
    remaining -= contrib
  }
  return out
}
