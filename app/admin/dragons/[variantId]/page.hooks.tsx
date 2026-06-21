'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CustomToast } from '@/components/CustomToast'
import {
  createAlleleAction,
  createGeneAction,
  createRoleAction,
  deleteAlleleAction,
  deleteGeneAction,
  deleteRoleAction,
  getVariantGeneticsAction,
  updateAlleleAction,
  updateGeneAction,
  updateRoleAction,
  updateVariantHeaderAction,
} from './page.actions'
import type { AlleleInput, GeneInput, RoleInput, VariantHeaderInput } from './page.types'

function errorToast(error: Error) {
  toast.custom(() => (
    <CustomToast variant="error" title="Something went wrong" message={error.message} />
  ))
}

function successToast(title: string) {
  toast.custom(() => <CustomToast variant="success" title={title} />)
}

export function useVariantGenetics(variantId: string) {
  return useQuery({
    queryKey: ['variant-genetics', variantId],
    queryFn: () => getVariantGeneticsAction(variantId),
    enabled: !!variantId,
  })
}

function useGeneticsMutation<TArgs>(
  variantId: string,
  fn: (args: TArgs) => Promise<unknown>,
  successTitle: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-genetics', variantId] })
      if (successTitle) successToast(successTitle)
    },
    onError: errorToast,
  })
}

export function useUpdateVariantHeader(variantId: string) {
  return useGeneticsMutation<VariantHeaderInput>(
    variantId,
    (input) => updateVariantHeaderAction(variantId, input),
    'Variant saved',
  )
}

export function useCreateRole(variantId: string) {
  return useGeneticsMutation<RoleInput>(
    variantId,
    (input) => createRoleAction(variantId, input),
    'Role added',
  )
}

export function useUpdateRole(variantId: string) {
  return useGeneticsMutation<{ roleId: string; input: RoleInput }>(
    variantId,
    ({ roleId, input }) => updateRoleAction(roleId, input),
    'Role saved',
  )
}

export function useDeleteRole(variantId: string) {
  return useGeneticsMutation<string>(variantId, (roleId) => deleteRoleAction(roleId), 'Role removed')
}

export function useCreateGene(variantId: string) {
  return useGeneticsMutation<GeneInput>(
    variantId,
    (input) => createGeneAction(variantId, input),
    'Gene added',
  )
}

export function useUpdateGene(variantId: string) {
  return useGeneticsMutation<{ geneId: string; input: GeneInput }>(
    variantId,
    ({ geneId, input }) => updateGeneAction(geneId, input),
    'Gene saved',
  )
}

export function useDeleteGene(variantId: string) {
  return useGeneticsMutation<string>(variantId, (geneId) => deleteGeneAction(geneId), 'Gene removed')
}

export function useCreateAllele(variantId: string) {
  return useGeneticsMutation<{ geneId: string; input: AlleleInput }>(
    variantId,
    ({ geneId, input }) => createAlleleAction(geneId, input),
    'Allele added',
  )
}

export function useUpdateAllele(variantId: string) {
  return useGeneticsMutation<{ alleleId: string; input: AlleleInput }>(
    variantId,
    ({ alleleId, input }) => updateAlleleAction(alleleId, input),
    'Allele saved',
  )
}

export function useDeleteAllele(variantId: string) {
  return useGeneticsMutation<string>(
    variantId,
    (alleleId) => deleteAlleleAction(alleleId),
    'Allele removed',
  )
}
