import type { DragonModel, DragonRole, DragonVariant, RoleTags } from '@/app/game/dragons.types'
import type { BodyGroup } from '@/app/admin/_lib/types'

export type { DragonModel, DragonRole, DragonVariant, RoleTags, BodyGroup }

export type ModelBundle = {
  model: DragonModel
  variant: DragonVariant
  roles: DragonRole[]
}

export type RoleTagDraft = Record<string, string>
