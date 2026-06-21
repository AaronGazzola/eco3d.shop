import { DragonAllele, DragonGene, DragonRole, FilamentColor, Genotype } from './dragons.types'

export type Phenotype = Record<string, string>

function pickWeighted(alleles: DragonAllele[]): DragonAllele {
  const total = alleles.reduce((sum, a) => sum + Math.max(0, a.frequency), 0)
  if (total <= 0) return alleles[Math.floor(Math.random() * alleles.length)]
  let r = Math.random() * total
  for (const a of alleles) {
    r -= Math.max(0, a.frequency)
    if (r <= 0) return a
  }
  return alleles[alleles.length - 1]
}

function expressedAllele(a: DragonAllele, b: DragonAllele): DragonAllele {
  if (a.dominance_rank > b.dominance_rank) return a
  if (b.dominance_rank > a.dominance_rank) return b
  return a.key <= b.key ? a : b
}

export function resolveGenotype(
  genotype: Genotype,
  genes: DragonGene[],
  roles: DragonRole[],
  alleles: DragonAllele[],
  filaments: FilamentColor[],
): Phenotype {
  const alleleById = new Map(alleles.map((a) => [a.id, a]))
  const filamentById = new Map(filaments.map((f) => [f.id, f]))
  const roleById = new Map(roles.map((r) => [r.id, r]))
  const out: Phenotype = {}

  for (const gene of genes) {
    const pair = genotype[gene.key]
    if (!pair) {
      console.error(`Missing genotype entry for gene "${gene.key}"`)
      throw new Error(`Missing genotype entry for gene "${gene.key}"`)
    }
    const a = alleleById.get(pair[0])
    const b = alleleById.get(pair[1])
    if (!a || !b) {
      console.error(`Genotype for gene "${gene.key}" references unknown allele id`)
      throw new Error(`Genotype for gene "${gene.key}" references unknown allele id`)
    }
    const expressed = expressedAllele(a, b)
    const filament = filamentById.get(expressed.filament_color_id)
    if (!filament) {
      console.error(`Allele "${expressed.key}" references unknown filament`)
      throw new Error(`Allele "${expressed.key}" references unknown filament`)
    }
    const role = roleById.get(gene.role_id)
    if (!role) {
      console.error(`Gene "${gene.key}" references unknown role`)
      throw new Error(`Gene "${gene.key}" references unknown role`)
    }
    out[role.key] = filament.hex
  }

  return out
}

export type OrderabilityPhenotype = {
  roleHex: Record<string, string>
  colorCount: number
}

export type OrderabilityEnumeration = {
  phenotypes: OrderabilityPhenotype[]
  capped: boolean
  total: number
}

export function isOverPrintLimit(colorCount: number, maxPrintColors: number | null): boolean {
  if (maxPrintColors == null) return false
  return colorCount > maxPrintColors
}

export function enumeratePhenotypes(
  genes: DragonGene[],
  roles: DragonRole[],
  alleles: DragonAllele[],
  filaments: FilamentColor[],
  opts?: { maxEnum?: number },
): OrderabilityEnumeration {
  const maxEnum = opts?.maxEnum ?? 5000
  if (genes.length === 0) return { phenotypes: [], capped: false, total: 0 }

  const roleById = new Map(roles.map((r) => [r.id, r]))
  const filamentById = new Map(filaments.map((f) => [f.id, f]))
  const allelesByGene = new Map<string, DragonAllele[]>()
  for (const a of alleles) {
    const list = allelesByGene.get(a.gene_id) ?? []
    list.push(a)
    allelesByGene.set(a.gene_id, list)
  }

  const pools: DragonAllele[][] = []
  let total = 1
  for (const gene of genes) {
    const pool = allelesByGene.get(gene.id) ?? []
    if (pool.length === 0) {
      console.error(`Gene "${gene.key}" has no alleles to enumerate`)
      throw new Error(`Gene "${gene.key}" has no alleles to enumerate`)
    }
    pools.push(pool)
    total *= pool.length
  }

  const limit = Math.min(total, maxEnum)
  const seen = new Set<string>()
  const phenotypes: OrderabilityPhenotype[] = []
  const idx = new Array(genes.length).fill(0)

  for (let produced = 0; produced < limit; produced++) {
    const roleHex: Record<string, string> = {}
    for (let gi = 0; gi < genes.length; gi++) {
      const gene = genes[gi]
      const allele = pools[gi][idx[gi]]
      const role = roleById.get(gene.role_id)
      if (!role) {
        console.error(`Gene "${gene.key}" references unknown role`)
        throw new Error(`Gene "${gene.key}" references unknown role`)
      }
      const filament = filamentById.get(allele.filament_color_id)
      if (!filament) {
        console.error(`Allele "${allele.key}" references unknown filament`)
        throw new Error(`Allele "${allele.key}" references unknown filament`)
      }
      roleHex[role.key] = filament.hex
    }

    const sig = Object.keys(roleHex)
      .sort()
      .map((k) => `${k}:${roleHex[k]}`)
      .join('|')
    if (!seen.has(sig)) {
      seen.add(sig)
      phenotypes.push({ roleHex, colorCount: new Set(Object.values(roleHex)).size })
    }

    let gi = genes.length - 1
    while (gi >= 0) {
      idx[gi]++
      if (idx[gi] < pools[gi].length) break
      idx[gi] = 0
      gi--
    }
    if (gi < 0) break
  }

  return { phenotypes, capped: total > maxEnum, total }
}

export function rollGenotype(genes: DragonGene[], alleles: DragonAllele[]): Genotype {
  const allelesByGene = new Map<string, DragonAllele[]>()
  for (const al of alleles) {
    const list = allelesByGene.get(al.gene_id) ?? []
    list.push(al)
    allelesByGene.set(al.gene_id, list)
  }
  const out: Genotype = {}
  for (const gene of genes) {
    const pool = allelesByGene.get(gene.id) ?? []
    if (pool.length === 0) {
      console.error(`Gene "${gene.key}" has no alleles to roll`)
      throw new Error(`Gene "${gene.key}" has no alleles to roll`)
    }
    out[gene.key] = [pickWeighted(pool).id, pickWeighted(pool).id]
  }
  return out
}
