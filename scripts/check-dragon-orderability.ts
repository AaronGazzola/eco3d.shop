import { enumeratePhenotypes, isOverPrintLimit } from '../app/game/dragons.genetics'
import type { DragonAllele, DragonGene, DragonRole, FilamentColor } from '../app/game/dragons.types'

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) {
    console.error(`ASSERT FAILED: ${msg}`)
    throw new Error(msg)
  }
}

const role = (id: string, key: string): DragonRole =>
  ({ id, key, name: key, variant_id: 'v', display_order: 0, created_at: '', updated_at: '' })
const gene = (id: string, key: string, roleId: string): DragonGene =>
  ({ id, key, name: key, role_id: roleId, variant_id: 'v', display_order: 0, created_at: '', updated_at: '' })
const allele = (id: string, geneId: string, key: string, filamentId: string): DragonAllele =>
  ({ id, gene_id: geneId, key, name: key, filament_color_id: filamentId, dominance_rank: 1, frequency: 1, created_at: '', updated_at: '' })
const filament = (id: string, hex: string): FilamentColor =>
  ({ id, name: hex, hex, available: true, brand: null, sku: null, created_at: '', updated_at: '' })

function main() {
  // demo shape: 4 genes (head/dorsal/tail/limb) x 2 alleles each, every allele a distinct filament.
  const roles = ['head', 'dorsal', 'tail', 'limb'].map((k) => role(`r-${k}`, k))
  const genes = ['head', 'dorsal', 'tail', 'limb'].map((k) => gene(`g-${k}`, k, `r-${k}`))
  const hexes = ['#e5e7eb', '#374151', '#dc2626', '#2563eb', '#16a34a', '#eab308', '#ea580c', '#7c3aed']
  const filaments = hexes.map((h, i) => filament(`f-${i}`, h))
  const alleles: DragonAllele[] = []
  genes.forEach((g, gi) => {
    alleles.push(allele(`${g.id}-a`, g.id, `${g.key}-a`, `f-${gi * 2}`))
    alleles.push(allele(`${g.id}-b`, g.id, `${g.key}-b`, `f-${gi * 2 + 1}`))
  })

  const enumeration = enumeratePhenotypes(genes, roles, alleles, filaments)

  assert(enumeration.total === 16, `expected 16 combinations, got ${enumeration.total}`)
  assert(enumeration.capped === false, 'should not be capped at 16')
  assert(enumeration.phenotypes.length === 16, `expected 16 distinct phenotypes, got ${enumeration.phenotypes.length}`)
  assert(
    enumeration.phenotypes.every((p) => p.colorCount === 4),
    'every phenotype should need 4 distinct colours (all filaments distinct)',
  )
  console.log('OK — 16 distinct phenotypes, each 4 colours')

  // ceiling: 4 -> none over; 3 -> all over
  const over4 = enumeration.phenotypes.filter((p) => isOverPrintLimit(p.colorCount, 4)).length
  const over3 = enumeration.phenotypes.filter((p) => isOverPrintLimit(p.colorCount, 3)).length
  const overNull = enumeration.phenotypes.filter((p) => isOverPrintLimit(p.colorCount, null)).length
  assert(over4 === 0, `max 4 should flag none, flagged ${over4}`)
  assert(over3 === 16, `max 3 should flag all 16, flagged ${over3}`)
  assert(overNull === 0, `null ceiling should flag none, flagged ${overNull}`)
  console.log('OK — ceiling flags: max4=0, max3=16, null=0')

  // shared filament across roles collapses the colour count
  const sharedFilaments = [filament('f-x', '#ffffff')]
  const sharedAlleles = genes.map((g) => allele(`${g.id}-only`, g.id, `${g.key}-only`, 'f-x'))
  const shared = enumeratePhenotypes(genes, roles, sharedAlleles, sharedFilaments)
  assert(shared.phenotypes.length === 1, `all-shared should be 1 phenotype, got ${shared.phenotypes.length}`)
  assert(shared.phenotypes[0].colorCount === 1, `shared filament should count 1 colour, got ${shared.phenotypes[0].colorCount}`)
  console.log('OK — shared filament across roles counts once')

  // enumeration cap: tiny maxEnum marks capped
  const capped = enumeratePhenotypes(genes, roles, alleles, filaments, { maxEnum: 5 })
  assert(capped.capped === true, 'maxEnum 5 should mark capped')
  assert(capped.total === 16, `capped result should still report total 16, got ${capped.total}`)
  console.log('OK — enumeration capped, not silently truncated')

  console.log('\nALL ORDERABILITY CHECKS PASSED')
}

try {
  main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
