import { BodyGroupType } from '@/app/admin/_lib/types'

export const DEFAULT_AXIAL_WEIGHT = 1.5
export const DEFAULT_LEG_WEIGHT = 0.4
export const STD_SEGMENT_WIDTH = 0.5

export function defaultWeightFor(type: BodyGroupType): number {
  return type === 'leg-left' || type === 'leg-right'
    ? DEFAULT_LEG_WEIGHT
    : DEFAULT_AXIAL_WEIGHT
}
