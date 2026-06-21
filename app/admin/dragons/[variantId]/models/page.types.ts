import type { DragonModel, DragonStage } from '@/app/game/dragons.types'
import type { BodyGroup } from '@/app/admin/_lib/types'

export type { DragonModel, DragonStage }

export const DRAGON_STAGES: DragonStage[] = ['egg', 'baby', 'adult', 'winged']

export type ModelConfigOption = {
  id: string
  name: string
  stl_key: string
  groups: BodyGroup[]
  model_rotation: number[]
}

export type CreateModelInput = {
  variantId: string
  stage: DragonStage
  modelConfigId: string
}
