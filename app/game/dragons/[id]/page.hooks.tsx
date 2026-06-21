'use client'

import { useQuery } from '@tanstack/react-query'
import { getVariantBundleAction } from './page.actions'

export function useVariantBundle(variantKey: string) {
  return useQuery({
    queryKey: ['variant-bundle', variantKey],
    queryFn: () => getVariantBundleAction(variantKey),
    enabled: !!variantKey,
    staleTime: 60_000,
  })
}
