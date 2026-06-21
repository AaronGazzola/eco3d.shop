import { BodyGroup } from '@/app/admin/_lib/types'
import {
  DragonAllele,
  DragonGene,
  DragonRole,
  DragonStage,
  FilamentColor,
  RoleTags,
} from '@/app/game/dragons.types'

export interface VariantStageModel {
  id: string
  stage: DragonStage
  stlKey: string
  groups: BodyGroup[]
  roleTags: RoleTags
  modelRotation: [number, number, number]
}

export interface VariantBundle {
  variantId: string
  variantKey: string
  variantName: string
  roles: DragonRole[]
  genes: DragonGene[]
  alleles: DragonAllele[]
  filaments: FilamentColor[]
  models: VariantStageModel[]
}
