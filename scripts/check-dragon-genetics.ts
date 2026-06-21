import { resolveGenotype, rollGenotype } from '../app/game/dragons.genetics'
import type { DragonAllele, DragonGene, DragonRole, FilamentColor, Genotype } from '../app/game/dragons.types'

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
const allele = (id: string, geneId: string, key: string, filamentId: string, dominance_rank: number, frequency: number): DragonAllele =>
  ({ id, gene_id: geneId, key, name: key, filament_color_id: filamentId, dominance_rank, frequency, created_at: '', updated_at: '' })
const filament = (id: string, hex: string): FilamentColor =>
  ({ id, name: hex, hex, available: true, brand: null, sku: null, created_at: '', updated_at: '' })

function main() {
  const roles = [role('r-dorsal', 'dorsal')]
  const genes = [gene('g-dorsal', 'dorsal', 'r-dorsal')]
  const filaments = [filament('f-red', '#cc0000'), filament('f-dark', '#222222'), filament('f-blue', '#0000cc')]
  const alleles = [
    allele('a-red', 'g-dorsal', 'red', 'f-red', 2, 1),
    allele('a-dark', 'g-dorsal', 'dark', 'f-dark', 1, 1),
    allele('a-blue', 'g-dorsal', 'blue', 'f-blue', 2, 0),
  ]

  // dominance: rank 2 (red) over rank 1 (dark)
  const ph1 = resolveGenotype({ dorsal: ['a-red', 'a-dark'] }, genes, roles, alleles, filaments)
  assert(ph1.dorsal === '#cc0000', `dominant red expected, got ${ph1.dorsal}`)
  console.log('OK — dominant allele expressed')

  // tie: equal rank (red 2, blue 2) -> smaller key "blue" wins; never a blend
  const ph2 = resolveGenotype({ dorsal: ['a-red', 'a-blue'] }, genes, roles, alleles, filaments)
  assert(ph2.dorsal === '#0000cc', `tie should pick smaller-key (blue), got ${ph2.dorsal}`)
  assert(ph2.dorsal === '#0000cc' || ph2.dorsal === '#cc0000', 'tie must be one real filament, not a blend')
  console.log('OK — tie resolves to one real filament (smaller key), no blend')

  // roll: valid diploid; frequency 0 allele (blue) never appears
  let sawBlue = false
  for (let i = 0; i < 2000; i++) {
    const g: Genotype = rollGenotype(genes, alleles)
    assert(Array.isArray(g.dorsal) && g.dorsal.length === 2, 'roll must yield a diploid pair')
    for (const id of g.dorsal) {
      assert(['a-red', 'a-dark', 'a-blue'].includes(id), `rolled unknown allele ${id}`)
      if (id === 'a-blue') sawBlue = true
    }
  }
  assert(!sawBlue, 'frequency-0 allele should never be rolled')
  console.log('OK — rolls are valid diploids and respect frequency weighting')

  console.log('\nAll engine checks passed.')
}

main()
