'use client'

import { useQuery } from '@tanstack/react-query'
import { listModelsForVariantAction } from './page.actions'

export function useModelsForVariant(variantId: string) {
  return useQuery({
    queryKey: ['dragon-models', variantId],
    queryFn: () => listModelsForVariantAction(variantId),
    enabled: !!variantId,
  })
}
