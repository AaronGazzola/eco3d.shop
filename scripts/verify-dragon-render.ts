import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import type { BodyGroup } from '../app/admin/_lib/types'
import type { DragonAllele, DragonGene, DragonRole, FilamentColor, Genotype, RoleTags } from '../app/game/dragons.types'
import { resolveGenotype, rollGenotype } from '../app/game/dragons.genetics'

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) {
    console.error(`ASSERT FAILED: ${msg}`)
    throw new Error(msg)
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment')
    process.exit(1)
  }
  const db = createClient<Database>(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const variant = await db.from('dragon_variants').select('id').eq('key', 'demo').single()
  assert(!variant.error, 'demo variant not found — run seed-dragon-genetics first')
  const vid = variant.data.id

  const roles = (await db.from('dragon_roles').select('*').eq('variant_id', vid)).data as DragonRole[]
  const genes = (await db.from('dragon_genes').select('*').eq('variant_id', vid)).data as DragonGene[]
  const alleles = (await db.from('dragon_alleles').select('*').in('gene_id', genes.map((g) => g.id))).data as DragonAllele[]
  const filaments = (await db.from('filament_colors').select('*').in('id', alleles.map((a) => a.filament_color_id))).data as FilamentColor[]
  const models = (await db.from('dragon_models').select('*').eq('variant_id', vid)).data!

  // every rolled dragon resolves a colour for every role
  const g: Genotype = rollGenotype(genes, alleles)
  const ph = resolveGenotype(g, genes, roles, alleles, filaments)
  for (const r of roles) assert(/^#[0-9a-f]{6}$/i.test(ph[r.key] ?? ''), `role ${r.key} got no hex (${ph[r.key]})`)
  console.log(`OK 6.1a — rolled dragon resolves a colour for all ${roles.length} roles`)

  // dominance: head-bright (rank 2) over head-dark (rank 1)
  const byKey = Object.fromEntries(alleles.map((a) => [a.key, a]))
  const headGene = genes.find((x) => x.key === 'head')!
  const headRole = roles.find((r) => r.id === headGene.role_id)!
  const phDom = resolveGenotype({ ...g, head: [byKey['head-bright'].id, byKey['head-dark'].id] }, genes, roles, alleles, filaments)
  const brightHex = filaments.find((f) => f.id === byKey['head-bright'].filament_color_id)!.hex
  assert(phDom[headRole.key] === brightHex, `dominant head-bright expected ${brightHex}, got ${phDom[headRole.key]}`)
  console.log('OK 6.1b — dominant allele expressed over recessive')

  // cross-stage consistency: same genotype, both stage models tag roles that all resolve
  assert(models.length >= 2, 'expected >= 2 stage models')
  const roleKeys = new Set(roles.map((r) => r.key))
  for (const m of models) {
    const tags = m.role_tags as unknown as RoleTags
    const tagged = Object.values(tags)
    assert(tagged.length > 0, `model ${m.stage} has no role tags`)
    for (const rk of new Set(tagged)) {
      assert(roleKeys.has(rk), `model ${m.stage} tags unknown role ${rk}`)
      assert(/^#[0-9a-f]{6}$/i.test(ph[rk] ?? ''), `role ${rk} unresolved for stage ${m.stage}`)
    }
    // sanity: tags key onto real geometry segment ids
    const segIds = new Set((m.groups as unknown as BodyGroup[]).flatMap((gr) => gr.segmentIds))
    for (const sid of Object.keys(tags)) assert(segIds.has(sid), `tag ${sid} not a real segment of stage ${m.stage}`)
  }
  console.log(`OK 6.2 — same genotype resolves consistently across ${models.length} stage models; tags map to real segments`)

  console.log('\nAll dragon render-pipeline checks passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
