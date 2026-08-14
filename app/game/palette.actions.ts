'use server'

import { createClient } from '@/supabase/server-client'
import { DragonRole } from './dragons.types'

export async function getVariantRolesAction(variantId: string): Promise<DragonRole[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dragon_roles')
    .select('*')
    .eq('variant_id', variantId)
    .order('display_order')

  if (error) {
    console.error(error)
    throw new Error('Failed to load roles for the variant')
  }
  return data
}
