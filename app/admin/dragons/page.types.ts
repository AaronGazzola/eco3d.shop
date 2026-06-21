import type {
  DragonVariant,
  DragonVariantInsert,
  FilamentColor,
  FilamentColorInsert,
} from '@/app/game/dragons.types'

export type { DragonVariant, FilamentColor }

export type VariantInput = {
  key: string
  name: string
  max_print_colors: number | null
  description: string | null
}

export type FilamentColorInput = {
  name: string
  hex: string
  brand: string | null
  sku: string | null
}

export type VariantInsert = DragonVariantInsert
export type FilamentInsert = FilamentColorInsert
