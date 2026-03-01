'use client'

import { useQuery } from '@tanstack/react-query'
import { listR2FilesAction, getSignedUrlAction } from './page.actions'

export function useR2Files() {
  return useQuery({
    queryKey: ['r2-files'],
    queryFn: listR2FilesAction,
  })
}

export function useSignedUrl(key: string | null) {
  return useQuery({
    queryKey: ['signed-url', key],
    queryFn: () => getSignedUrlAction(key!),
    enabled: !!key,
  })
}
