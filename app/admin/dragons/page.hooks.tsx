'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CustomToast } from '@/components/CustomToast'
import {
  createFilamentColorAction,
  createVariantAction,
  listFilamentColorsAction,
  listVariantsAction,
  updateFilamentColorAction,
} from './page.actions'
import type { FilamentColorInput, VariantInput } from './page.types'

function errorToast(error: Error) {
  toast.custom(() => (
    <CustomToast variant="error" title="Something went wrong" message={error.message} />
  ))
}

export function useVariants() {
  return useQuery({
    queryKey: ['dragon-variants'],
    queryFn: listVariantsAction,
  })
}

export function useFilamentColors() {
  return useQuery({
    queryKey: ['filament-colors'],
    queryFn: listFilamentColorsAction,
  })
}

export function useCreateVariant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VariantInput) => createVariantAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon-variants'] })
      toast.custom(() => (
        <CustomToast variant="success" title="Variant created" message="" />
      ))
    },
    onError: errorToast,
  })
}

export function useCreateFilamentColor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FilamentColorInput) => createFilamentColorAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filament-colors'] })
      toast.custom(() => (
        <CustomToast variant="success" title="Colour added" message="" />
      ))
    },
    onError: errorToast,
  })
}

export function useUpdateFilamentColor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FilamentColorInput }) =>
      updateFilamentColorAction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filament-colors'] })
      toast.custom(() => (
        <CustomToast variant="success" title="Colour updated" message="" />
      ))
    },
    onError: errorToast,
  })
}
