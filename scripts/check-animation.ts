import { evaluateCycle, advancePhase, wrapPhase, buildDefaultWalkCycle } from '../app/game/animation'
import type { Cycle, Pose } from '../app/game/animation.types'
import type { BodyGroup } from '../app/admin/_lib/types'

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++
    console.error(`FAIL ${name} ${detail}`)
  } else {
    console.error(`ok   ${name} ${detail}`)
  }
}

function pose(yaw: number, x = 0): Pose {
  return { root: { x, z: 0, yawRad: 0 }, joints: { a: { yawRad: yaw, pitchRad: 0 } } }
}

const cycle: Cycle = { keyframes: [pose(0), pose(1)], speed: 1, amplitude: 1 }

check('phase 0 hits first keyframe', evaluateCycle(cycle, 0).joints.a.yawRad === 0)
check(
  'midway between frames interpolates',
  Math.abs(evaluateCycle(cycle, 0.25).joints.a.yawRad - 0.5) < 1e-9,
  `got ${evaluateCycle(cycle, 0.25).joints.a.yawRad}`,
)
check('second frame reached at half phase', evaluateCycle(cycle, 0.5).joints.a.yawRad === 1)
check(
  'loops back toward the first frame',
  Math.abs(evaluateCycle(cycle, 0.75).joints.a.yawRad - 0.5) < 1e-9,
  `got ${evaluateCycle(cycle, 0.75).joints.a.yawRad}`,
)
check(
  'phase 1 equals phase 0 (seamless)',
  evaluateCycle(cycle, 1).joints.a.yawRad === evaluateCycle(cycle, 0).joints.a.yawRad,
)

const half: Cycle = { ...cycle, amplitude: 0.5 }
check('amplitude scales joints', evaluateCycle(half, 0.5).joints.a.yawRad === 0.5)

const rootCycle: Cycle = { keyframes: [pose(0, 0), pose(0, 2)], speed: 1, amplitude: 0.5 }
check('amplitude scales root', evaluateCycle(rootCycle, 0.5).root.x === 1)

check('empty cycle yields rest pose', Object.keys(evaluateCycle({ keyframes: [], speed: 1, amplitude: 1 }, 0.3).joints).length === 0)
check('negative phase wraps', wrapPhase(-0.25) === 0.75)
check('advance wraps past one', Math.abs(advancePhase(0.9, 1, 0.2) - 0.1) < 1e-9)
check('speed zero holds phase', advancePhase(0.4, 0, 0.5) === 0.4)

const groups: BodyGroup[] = [
  { id: 'head', name: 'head', segmentIds: [], color: '#fff', type: 'head' },
  { id: 's1', name: 's1', segmentIds: [], color: '#fff', type: 'spine' },
  { id: 's2', name: 's2', segmentIds: [], color: '#fff', type: 'spine' },
  { id: 'l1', name: 'l1', segmentIds: [], color: '#fff', type: 'leg-left', attachedToSpineId: 's1' },
  { id: 'r1', name: 'r1', segmentIds: [], color: '#fff', type: 'leg-right', attachedToSpineId: 's1' },
  { id: 'l2', name: 'l2', segmentIds: [], color: '#fff', type: 'leg-left', attachedToSpineId: 's2' },
  { id: 'r2', name: 'r2', segmentIds: [], color: '#fff', type: 'leg-right', attachedToSpineId: 's2' },
  { id: 'tail', name: 'tail', segmentIds: [], color: '#fff', type: 'tail' },
]

const walk = buildDefaultWalkCycle(groups)
check('default walk has keyframes', walk.keyframes.length === 4, `${walk.keyframes.length}`)
check(
  'default walk drives every joint',
  groups.every((g) => walk.keyframes.some((k) => k.joints[g.id] !== undefined)),
)

const at0 = evaluateCycle(walk, 0)
check(
  'diagonal legs are in phase',
  Math.sign(at0.joints.l1.yawRad) === Math.sign(at0.joints.r2.yawRad),
  `l1=${at0.joints.l1.yawRad.toFixed(3)} r2=${at0.joints.r2.yawRad.toFixed(3)}`,
)
check(
  'left and right on the same girdle oppose',
  Math.sign(at0.joints.l1.yawRad) !== Math.sign(at0.joints.r1.yawRad),
  `l1=${at0.joints.l1.yawRad.toFixed(3)} r1=${at0.joints.r1.yawRad.toFixed(3)}`,
)

let maxDeg = 0
for (let p = 0; p < 1; p += 0.01) {
  const s = evaluateCycle(walk, p)
  for (const id of Object.keys(s.joints)) {
    maxDeg = Math.max(maxDeg, Math.abs(s.joints[id].yawRad) * (180 / Math.PI))
  }
}
check('walk stays within a sane range', maxDeg <= 25, `max ${maxDeg.toFixed(1)} deg`)

console.error(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
