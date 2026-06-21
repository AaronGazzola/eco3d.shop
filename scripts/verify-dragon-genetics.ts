import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import type { Genotype } from '../app/game/dragons.types'

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) {
    console.error(`ASSERT FAILED: ${msg}`)
    throw new Error(msg)
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// jsonb does not preserve top-level object key order; compare by value (allele pairs are arrays,
// whose element order jsonb does preserve).
function genotypeEqual(a: Genotype, b: Genotype): boolean {
  const ka = Object.keys(a).sort()
  const kb = Object.keys(b).sort()
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false
  return ka.every((k) => a[k]?.[0] === b[k]?.[0] && a[k]?.[1] === b[k]?.[1])
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment')
    process.exit(1)
  }

  const db = createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const suffix = `${Date.now()}`
  let variantId: string | null = null
  const filamentIds: string[] = []

  try {
    const filA = await db
      .from('filament_colors')
      .insert({ name: `Test Red ${suffix}`, hex: '#cc0000' })
      .select()
      .single()
    assert(!filA.error, `insert filament A: ${filA.error?.message}`)
    filamentIds.push(filA.data.id)

    const variant = await db
      .from('dragon_variants')
      .insert({ key: `test-${suffix}`, name: 'Test Variant', max_print_colors: 4 })
      .select()
      .single()
    assert(!variant.error, `insert variant: ${variant.error?.message}`)
    variantId = variant.data.id

    const roles = await db
      .from('dragon_roles')
      .insert([
        { variant_id: variantId, key: 'dorsal', name: 'Dorsal' },
        { variant_id: variantId, key: 'belly', name: 'Belly' },
      ])
      .select()
    assert(!roles.error && roles.data.length === 2, `insert roles: ${roles.error?.message}`)
    const roleByKey = Object.fromEntries(roles.data.map((r) => [r.key, r.id]))

    const genes = await db
      .from('dragon_genes')
      .insert([
        { variant_id: variantId, role_id: roleByKey.dorsal, key: 'dorsal', name: 'Dorsal color' },
        { variant_id: variantId, role_id: roleByKey.belly, key: 'belly', name: 'Belly color' },
      ])
      .select()
    assert(!genes.error && genes.data.length === 2, `insert genes: ${genes.error?.message}`)
    const geneByKey = Object.fromEntries(genes.data.map((g) => [g.key, g.id]))

    const alleles = await db
      .from('dragon_alleles')
      .insert([
        { gene_id: geneByKey.dorsal, filament_color_id: filA.data.id, key: 'dorsal-red', name: 'Red', dominance_rank: 2 },
        { gene_id: geneByKey.dorsal, filament_color_id: filA.data.id, key: 'dorsal-dark', name: 'Dark', dominance_rank: 1 },
        { gene_id: geneByKey.belly, filament_color_id: filA.data.id, key: 'belly-red', name: 'Red', dominance_rank: 1 },
      ])
      .select()
    assert(!alleles.error && alleles.data.length === 3, `insert alleles: ${alleles.error?.message}`)
    const al = Object.fromEntries(alleles.data.map((a) => [a.key, a.id]))

    const model = await db
      .from('dragon_models')
      .insert({
        variant_id: variantId,
        stage: 'egg',
        stl_key: `test/${suffix}.stl`,
        role_tags: { 'seg-0': 'dorsal', 'seg-1': 'belly' },
      })
      .select()
      .single()
    assert(!model.error, `insert model: ${model.error?.message}`)

    const genotype: Genotype = {
      dorsal: [al['dorsal-red'], al['dorsal-dark']],
      belly: [al['belly-red'], al['belly-red']],
    }
    const dragon = await db
      .from('dragons')
      .insert({ variant_id: variantId, stage: 'egg', name: 'Testy', genotype })
      .select()
      .single()
    assert(!dragon.error, `insert dragon: ${dragon.error?.message}`)
    const dragonId = dragon.data.id

    // 5.1 round-trip + ids-only
    const read = await db.from('dragons').select('*').eq('id', dragonId).single()
    assert(!read.error, `read dragon: ${read.error?.message}`)
    const readGeno = read.data.genotype as Genotype
    assert(genotypeEqual(readGeno, genotype), 'genotype did not round-trip')
    for (const pair of Object.values(readGeno)) {
      for (const id of pair) {
        assert(UUID_RE.test(id), `genotype value "${id}" is not an allele id (uuid)`)
        assert(!id.startsWith('#'), `genotype value "${id}" looks like a color`)
      }
    }
    console.log('OK 5.1 — genotype round-trips and holds only allele ids')

    // 5.2 discontinuation: new filament, flag old unavailable, rebind alleles, genotype unchanged
    const filB = await db
      .from('filament_colors')
      .insert({ name: `Test Crimson ${suffix}`, hex: '#990022' })
      .select()
      .single()
    assert(!filB.error, `insert filament B: ${filB.error?.message}`)
    filamentIds.push(filB.data.id)

    const flag = await db.from('filament_colors').update({ available: false }).eq('id', filA.data.id)
    assert(!flag.error, `flag filament unavailable: ${flag.error?.message}`)
    const rebind = await db
      .from('dragon_alleles')
      .update({ filament_color_id: filB.data.id })
      .eq('filament_color_id', filA.data.id)
    assert(!rebind.error, `rebind alleles: ${rebind.error?.message}`)

    const read2 = await db.from('dragons').select('genotype').eq('id', dragonId).single()
    assert(!read2.error, `re-read dragon: ${read2.error?.message}`)
    assert(
      genotypeEqual(read2.data.genotype as Genotype, genotype),
      'genotype changed after filament rebind',
    )
    console.log('OK 5.2 — genotype unchanged after discontinue + rebind')

    // 5.3 binding constraint: deleting a still-bound filament is rejected
    const delBound = await db.from('filament_colors').delete().eq('id', filB.data.id)
    assert(!!delBound.error, 'deleting a bound filament should have been rejected but was not')
    console.log(`OK 5.3 — bound-filament delete rejected (${delBound.error?.code})`)

    // cleanup
    await db.from('dragons').delete().eq('id', dragonId)
    await db.from('dragon_variants').delete().eq('id', variantId)
    variantId = null
    await db.from('filament_colors').delete().in('id', filamentIds)

    console.log('\nAll dragon-genetics data-model checks passed.')
  } catch (err) {
    // best-effort cleanup on failure
    if (variantId) await db.from('dragon_variants').delete().eq('id', variantId)
    if (filamentIds.length) await db.from('filament_colors').delete().in('id', filamentIds)
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
