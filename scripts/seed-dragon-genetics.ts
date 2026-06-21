import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import type { BodyGroup } from '../app/admin/_lib/types'
import type { RoleTags } from '../app/game/dragons.types'

const VARIANT_KEY = 'demo'

const FILAMENTS = [
  { key: 'bright', name: 'Demo Bright', hex: '#e5e7eb' },
  { key: 'dark', name: 'Demo Dark', hex: '#374151' },
  { key: 'red', name: 'Demo Red', hex: '#dc2626' },
  { key: 'blue', name: 'Demo Blue', hex: '#2563eb' },
  { key: 'green', name: 'Demo Green', hex: '#16a34a' },
  { key: 'yellow', name: 'Demo Yellow', hex: '#eab308' },
  { key: 'orange', name: 'Demo Orange', hex: '#ea580c' },
  { key: 'purple', name: 'Demo Purple', hex: '#7c3aed' },
]

// role key -> { gene, alleles: [key, filamentKey, dominance, frequency] }
const GENETICS = [
  { role: 'head', gene: 'head', alleles: [['head-bright', 'bright', 2, 1], ['head-dark', 'dark', 1, 1]] },
  { role: 'dorsal', gene: 'dorsal', alleles: [['dorsal-red', 'red', 2, 1], ['dorsal-blue', 'blue', 1, 1]] },
  { role: 'tail', gene: 'tail', alleles: [['tail-green', 'green', 2, 1], ['tail-yellow', 'yellow', 1, 1]] },
  { role: 'limb', gene: 'limb', alleles: [['limb-orange', 'orange', 2, 1], ['limb-purple', 'purple', 1, 1]] },
] as const

function roleForGroupType(type: BodyGroup['type']): string | null {
  if (type === 'head') return 'head'
  if (type === 'spine') return 'dorsal'
  if (type === 'tail') return 'tail'
  if (type === 'leg-left' || type === 'leg-right') return 'limb'
  return null
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment')
    process.exit(1)
  }
  const db = createClient<Database>(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Borrow a real model's geometry so role_tags key onto actual seg-N ids.
  const src = await db
    .from('model_configs')
    .select('stl_key, groups, model_rotation')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (src.error || !src.data) {
    console.error(src.error)
    throw new Error('No model_configs row to borrow geometry from — author a model first.')
  }
  const groups = src.data.groups as unknown as BodyGroup[]
  const stlKey = src.data.stl_key
  const modelRotation = src.data.model_rotation

  const roleTags: RoleTags = {}
  for (const g of groups) {
    const role = roleForGroupType(g.type)
    if (!role) continue
    for (const sid of g.segmentIds) roleTags[sid] = role
  }

  // Idempotent: drop any prior demo variant (cascades roles/genes/alleles/models) + demo filaments.
  await db.from('dragon_variants').delete().eq('key', VARIANT_KEY)
  await db.from('filament_colors').delete().like('name', 'Demo %')

  const fil = await db
    .from('filament_colors')
    .insert(FILAMENTS.map((f) => ({ name: f.name, hex: f.hex })))
    .select()
  if (fil.error) throw new Error(`insert filaments: ${fil.error.message}`)
  const filByHex = new Map(fil.data.map((f) => [f.hex, f.id]))
  const filIdForKey = (key: string) => filByHex.get(FILAMENTS.find((f) => f.key === key)!.hex)!

  const variant = await db
    .from('dragon_variants')
    .insert({ key: VARIANT_KEY, name: 'Demo Dragon', max_print_colors: 4 })
    .select()
    .single()
  if (variant.error) throw new Error(`insert variant: ${variant.error.message}`)
  const variantId = variant.data.id

  const roles = await db
    .from('dragon_roles')
    .insert(GENETICS.map((g, i) => ({ variant_id: variantId, key: g.role, name: g.role, display_order: i })))
    .select()
  if (roles.error) throw new Error(`insert roles: ${roles.error.message}`)
  const roleIdByKey = new Map(roles.data.map((r) => [r.key, r.id]))

  const genes = await db
    .from('dragon_genes')
    .insert(GENETICS.map((g, i) => ({ variant_id: variantId, role_id: roleIdByKey.get(g.role)!, key: g.gene, name: g.gene, display_order: i })))
    .select()
  if (genes.error) throw new Error(`insert genes: ${genes.error.message}`)
  const geneIdByKey = new Map(genes.data.map((g) => [g.key, g.id]))

  const alleleRows = GENETICS.flatMap((g) =>
    g.alleles.map(([key, filKey, dom, freq]) => ({
      gene_id: geneIdByKey.get(g.gene)!,
      filament_color_id: filIdForKey(filKey as string),
      key: key as string,
      name: key as string,
      dominance_rank: dom as number,
      frequency: freq as number,
    })),
  )
  const alleles = await db.from('dragon_alleles').insert(alleleRows).select()
  if (alleles.error) throw new Error(`insert alleles: ${alleles.error.message}`)

  // Two stage models sharing the same geometry — enough to show consistent expression across stages.
  const models = await db
    .from('dragon_models')
    .insert(
      (['egg', 'adult'] as const).map((stage) => ({
        variant_id: variantId,
        stage,
        stl_key: stlKey,
        groups: groups as unknown as Database['public']['Tables']['dragon_models']['Insert']['groups'],
        role_tags: roleTags as unknown as Database['public']['Tables']['dragon_models']['Insert']['role_tags'],
        model_rotation: modelRotation,
      })),
    )
    .select()
  if (models.error) throw new Error(`insert models: ${models.error.message}`)

  console.log(
    `Seeded variant "${VARIANT_KEY}": ${roles.data.length} roles, ${genes.data.length} genes, ` +
      `${alleles.data.length} alleles, ${models.data.length} stage models, ` +
      `${Object.keys(roleTags).length} tagged segments. Preview at /game/dragons/${VARIANT_KEY}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
