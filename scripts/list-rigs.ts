import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('missing Supabase url or publishable key in the environment')
  process.exit(1)
}

async function main() {
  const supabase = createClient(url as string, key as string)
  const { data, error } = await supabase
    .from('dragon_models')
    .select('id, stage, role_tags, variant_id')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error(error)
    process.exit(1)
  }

  for (const row of data) {
    const tagged = Object.keys((row.role_tags ?? {}) as Record<string, string>).length
    console.log(`${row.id}\t${row.stage}\ttagged-segments=${tagged}`)
  }

  const { data: roles, error: rolesError } = await supabase.from('dragon_roles').select('key, variant_id')
  const { data: filaments, error: filamentsError } = await supabase
    .from('filament_colors')
    .select('name, hex, available')
    .eq('available', true)
  if (rolesError || filamentsError) {
    console.error(rolesError ?? filamentsError)
    process.exit(1)
  }
  console.log(`roles=${roles.map((r) => r.key).join(',')}`)
  console.log(`available filaments=${filaments.map((f) => `${f.name}:${f.hex}`).join(', ')}`)
}

main()
