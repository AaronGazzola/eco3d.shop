'use server'

import { createClient } from '@/lib/supabase/server-client'
import type { DragonModel } from './page.types'

export async function listModelsForVariantAction(variantId: string): Promise<DragonModel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dragon_models')
    .select('*')
    .eq('variant_id', variantId)
    .order('stage', { ascending: true })
  if (error) {
    console.error(error)
    throw new Error('Failed to load models')
  }
  return data
}
