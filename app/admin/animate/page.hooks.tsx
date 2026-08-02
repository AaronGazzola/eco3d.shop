'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveAnimationsAction } from '../_lib/actions'
import { useSharedStore } from '../_lib/sharedStore'
import type { Animations } from '@/app/game/animation.types'
import { useAnimateStore } from './animateStore'

export function useSaveAnimations() {
  const configId = useSharedStore((s) => s.configId)
  const setAnimations = useSharedStore((s) => s.setAnimations)
  const markSaved = useAnimateStore((s) => s.markSaved)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (animations: Animations) => {
      if (!configId) {
        console.error('Cannot save animations before the rig has been saved')
        throw new Error('Save the rig before saving animations')
      }
      return saveAnimationsAction(configId, animations)
    },
    onSuccess: (saved) => {
      setAnimations(saved.animations)
      markSaved()
      queryClient.invalidateQueries({ queryKey: ['dragon-rigs'] })
    },
    onError: (err) => console.error(err),
  })
}
