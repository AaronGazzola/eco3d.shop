import { BodyGroup, SegmentData } from '../app/admin/_lib/types'
import { buildBodySpec } from '../app/game/locomotion/body'

function box(id: string, cx: number, sx: number, sy: number, sz: number): SegmentData {
  const hx = sx / 2
  const hy = sy / 2
  const hz = sz / 2
  const corners = [
    [cx - hx, -hy, -hz],
    [cx + hx, hy, hz],
    [cx - hx, hy, -hz],
    [cx + hx, -hy, hz],
  ]
  const flat: number[] = []
  for (const c of corners) flat.push(c[0], c[1], c[2])
  return { id, positions: new Float32Array(flat), color: '#fff' }
}

function group(
  id: string,
  type: BodyGroup['type'],
  segmentIds: string[],
  nodeX: number,
  yaw: number
): BodyGroup {
  return {
    id,
    name: id,
    segmentIds,
    color: '#fff',
    type,
    nodeBack: { x: nodeX, y: 0, z: 0 },
    angleCaps: { yaw, pitchUp: 0.3, pitchDown: 0.3 },
  }
}

const groups: BodyGroup[] = [
  group('head', 'head', ['mHead'], 0, 0.5),
  group('spine1', 'spine', ['mSpine1'], 2, 0.4),
  group('spine2', 'spine', ['mSpine2'], 5, 0.3),
  group('tail', 'tail', ['mTail'], 7, 0.6),
]

const segments: SegmentData[] = [
  box('mHead', 0, 1, 1, 1),
  box('mSpine1', 2, 2, 2, 2),
  box('mSpine2', 5, 1, 1, 1),
  box('mTail', 7, 0.5, 0.5, 0.5),
]

let failures = 0
function check(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!ok) failures++
}

const spec = buildBodySpec(groups, segments)
if (!spec) {
  console.log('FAIL  buildBodySpec returned null')
  process.exit(1)
}

check(
  'segment count and order',
  spec.segments.length === 4 &&
    spec.segments.map((s) => s.groupId).join(',') === 'head,spine1,spine2,tail',
  spec.segments.map((s) => s.groupId).join(',')
)

const headLen = spec.segments[0].length
check('head length from node spacing', Math.abs(headLen - 2) < 1e-6, `head length = ${headLen}`)
const spine1Len = spec.segments[1].length
check('spine1 length from node spacing', Math.abs(spine1Len - 3) < 1e-6, `spine1 length = ${spine1Len}`)

check(
  'larger mesh has greater mass',
  spec.segments[1].mass > spec.segments[0].mass && spec.segments[0].mass > spec.segments[3].mass,
  `masses head=${spec.segments[0].mass} spine1=${spec.segments[1].mass} tail=${spec.segments[3].mass}`
)

check(
  'joint count excludes head',
  spec.joints.length === 3,
  `${spec.joints.length} joints`
)
check(
  'joint limits sourced from caps',
  Math.abs(spec.joints[0].yawForwardLimit - 0.4) < 1e-6 &&
    Math.abs(spec.joints[2].yawForwardLimit - 0.6) < 1e-6,
  `spine1 cap=${spec.joints[0].yawForwardLimit}, tail cap=${spec.joints[2].yawForwardLimit}`
)
check(
  'joint coord indices are contiguous from 3',
  spec.joints.map((j) => j.coordIndex).join(',') === '3,4,5',
  spec.joints.map((j) => j.coordIndex).join(',')
)

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`)
  process.exit(1)
} else {
  console.log('\nAll body-spec checks passed.')
}
