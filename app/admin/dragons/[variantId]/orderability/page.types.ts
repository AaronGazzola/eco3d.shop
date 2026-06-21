import type { DragonRole } from '@/app/game/dragons.types'

export type { DragonRole }

export type PhenotypeRow = {
  roleHex: Record<string, string>
  colorCount: number
  overLimit: boolean
}

export type OrderabilityResult = {
  rows: PhenotypeRow[]
  roles: DragonRole[]
  capped: boolean
  total: number
  maxPrintColors: number | null
  overLimitCount: number
}
