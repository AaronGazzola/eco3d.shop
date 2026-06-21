import { Database } from '@/supabase/types'

type Tables = Database['public']['Tables']

export type DragonStage = Database['public']['Enums']['dragon_stage']

export type FilamentColor = Tables['filament_colors']['Row']
export type DragonVariant = Tables['dragon_variants']['Row']
export type DragonRole = Tables['dragon_roles']['Row']
export type DragonGene = Tables['dragon_genes']['Row']
export type DragonAllele = Tables['dragon_alleles']['Row']
export type DragonModel = Tables['dragon_models']['Row']
export type Dragon = Tables['dragons']['Row']

export type FilamentColorInsert = Tables['filament_colors']['Insert']
export type DragonVariantInsert = Tables['dragon_variants']['Insert']
export type DragonRoleInsert = Tables['dragon_roles']['Insert']
export type DragonGeneInsert = Tables['dragon_genes']['Insert']
export type DragonAlleleInsert = Tables['dragon_alleles']['Insert']
export type DragonModelInsert = Tables['dragon_models']['Insert']
export type DragonInsert = Tables['dragons']['Insert']

export type Genotype = Record<string, [string, string]>

export type RoleTags = Record<string, string>
