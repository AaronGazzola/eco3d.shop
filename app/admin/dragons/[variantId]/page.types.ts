import type {
  DragonAllele,
  DragonGene,
  DragonRole,
  DragonVariant,
  FilamentColor,
} from '@/app/game/dragons.types'

export type { DragonAllele, DragonGene, DragonRole, DragonVariant, FilamentColor }

export type VariantGenetics = {
  variant: DragonVariant
  roles: DragonRole[]
  genes: DragonGene[]
  alleles: DragonAllele[]
  filaments: FilamentColor[]
}

export type VariantHeaderInput = {
  key: string
  name: string
  max_print_colors: number | null
}

export type RoleInput = {
  key: string
  name: string
  display_order: number
}

export type GeneInput = {
  key: string
  name: string
  role_id: string
  display_order: number
}

export type AlleleInput = {
  key: string
  name: string
  dominance_rank: number
  frequency: number
  filament_color_id: string
}
