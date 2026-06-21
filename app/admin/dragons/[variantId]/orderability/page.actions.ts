'use server'

import { getVariantGeneticsAction } from '../page.actions'
import type { VariantGenetics } from '../page.types'

export async function getOrderabilityDataAction(variantId: string): Promise<VariantGenetics> {
  return getVariantGeneticsAction(variantId)
}
