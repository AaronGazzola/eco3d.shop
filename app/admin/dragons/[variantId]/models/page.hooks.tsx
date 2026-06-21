'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CustomToast } from '@/components/CustomToast'
import {
  createModelAction,
  listModelConfigsForCreateAction,
  listModelsForVariantAction,
} from './page.actions'
import type { CreateModelInput } from './page.types'

function errorToast(error: Error) {
  toast.custom(() => (
    <CustomToast variant="error" title="Something went wrong" message={error.message} />
  ))
}

export function useModelConfigs() {
  return useQuery({
    queryKey: ['model-configs'],
    queryFn: listModelConfigsForCreateAction,
  })
}

export function useModelsForVariant(variantId: string) {
  return useQuery({
    queryKey: ['dragon-models', variantId],
    queryFn: () => listModelsForVariantAction(variantId),
    enabled: !!variantId,
  })
}

export function useCreateModel(variantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateModelInput) => createModelAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon-models', variantId] })
      toast.custom(() => <CustomToast variant="success" title="Model created" />)
    },
    onError: errorToast,
  })
}
