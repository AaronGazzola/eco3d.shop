import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/env.utils'
import { BodyGroup } from '@/app/admin/_lib/types'

const OUT = resolve(process.cwd(), 'documentation/diagnostics/creature-groups.json')

function hasLegs(groups: BodyGroup[]): boolean {
  return groups.some((g) => g.type === 'leg-left') && groups.some((g) => g.type === 'leg-right')
}

async function main(): Promise<void> {
  const nameFilter = process.argv[2]
  const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey())
  let query = supabase.from('model_configs').select('id, name, groups, model_rotation, created_at')
  if (nameFilter) query = query.ilike('name', `%${nameFilter}%`)
  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) throw new Error('no model_configs matched')

  const rows = data.map((r) => ({ ...r, groups: r.groups as unknown as BodyGroup[] }))
  const legged = rows.filter((r) => hasLegs(r.groups))
  const chosen = legged[0] ?? rows[0]
  if (!chosen) throw new Error('no usable model config')
  if (legged.length === 0) throw new Error(`chosen config "${chosen.name}" has no legs — pass a name filter`)

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        id: chosen.id,
        name: chosen.name,
        model_rotation: chosen.model_rotation,
        groups: chosen.groups,
      },
      null,
      2
    )
  )
  const legs = chosen.groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right').length
  const axial = chosen.groups.filter((g) => g.type === 'head' || g.type === 'spine' || g.type === 'tail').length
  console.log(`wrote ${OUT}`)
  console.log(`  config: ${chosen.name} (${chosen.groups.length} groups: ${axial} axial, ${legs} legs)`)
}

main().then(() => process.exit(0))
