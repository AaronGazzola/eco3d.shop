'use client'

import { useQuery } from '@tanstack/react-query'
import { enumeratePhenotypes, isOverPrintLimit } from '@/app/game/dragons.genetics'
import { getOrderabilityDataAction } from './page.actions'
import type { OrderabilityResult } from './page.types'

export function useOrderability(variantId: string) {
  return useQuery<OrderabilityResult>({
    queryKey: ['orderability', variantId],
    enabled: !!variantId,
    queryFn: async () => {
      const bundle = await getOrderabilityDataAction(variantId)
      const enumeration = enumeratePhenotypes(
        bundle.genes,
        bundle.roles,
        bundle.alleles,
        bundle.filaments,
      )
      const maxPrintColors = bundle.variant.max_print_colors
      const rows = enumeration.phenotypes.map((p) => ({
        ...p,
        overLimit: isOverPrintLimit(p.colorCount, maxPrintColors),
      }))
      return {
        rows,
        roles: bundle.roles,
        capped: enumeration.capped,
        total: enumeration.total,
        maxPrintColors,
        overLimitCount: rows.filter((r) => r.overLimit).length,
      }
    },
  })
}
