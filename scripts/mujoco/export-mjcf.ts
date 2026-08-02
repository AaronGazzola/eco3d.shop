import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { BodyGroup } from '@/app/admin/_lib/types'
import { buildMjcf } from './skeleton-to-mjcf'

const FIXTURE = resolve(process.cwd(), 'documentation/diagnostics/creature-groups.json')
const OUT_XML = resolve(process.cwd(), 'documentation/diagnostics/mujoco/model.xml')
const OUT_META = resolve(process.cwd(), 'documentation/diagnostics/mujoco/model.meta.json')

function main(): void {
  const raw = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { name: string; groups: BodyGroup[] }
  const { xml, meta } = buildMjcf(raw.groups)
  meta.configName = raw.name
  mkdirSync(dirname(OUT_XML), { recursive: true })
  writeFileSync(OUT_XML, xml)
  writeFileSync(OUT_META, JSON.stringify(meta, null, 2))
  console.log(`wrote ${OUT_XML}`)
  console.log(`  ${meta.segmentCount} segments, ${meta.spineJoints.length} spine hinges, ${meta.legs.length} legs`)
  console.log(`  legs: ${meta.legs.map((l) => `${l.limbIdx}:${l.side}`).join('  ')}`)
  console.log(`  groundTop=${meta.groundTop.toFixed(3)}`)
}

main()
