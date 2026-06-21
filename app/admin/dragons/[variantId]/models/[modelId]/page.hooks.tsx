'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CustomToast } from '@/components/CustomToast'
import { deleteModelAction, getModelAction, saveRoleTagsAction } from './page.actions'
import type { RoleTagDraft } from './page.types'

function errorToast(error: Error) {
  toast.custom(() => (
    <CustomToast variant="error" title="Something went wrong" message={error.message} />
  ))
}

export function useModel(modelId: string) {
  return useQuery({
    queryKey: ['dragon-model', modelId],
    queryFn: () => getModelAction(modelId),
    enabled: !!modelId,
  })
}

export function useSaveRoleTags(modelId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleTags: RoleTagDraft) => saveRoleTagsAction(modelId, roleTags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon-model', modelId] })
      toast.custom(() => <CustomToast variant="success" title="Tags saved" />)
    },
    onError: errorToast,
  })
}

export function useDeleteModel(modelId: string, variantId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: () => deleteModelAction(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon-models', variantId] })
      toast.custom(() => <CustomToast variant="success" title="Model deleted" />)
      router.push(`/admin/dragons/${variantId}/models`)
    },
    onError: errorToast,
  })
}
