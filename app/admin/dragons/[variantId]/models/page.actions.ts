'use server'

import { createClient } from '@/lib/supabase/server-client'
import { checkIsAdminAction } from '@/app/layout.actions'
import type { Database } from '@/supabase/types'
import type { CreateModelInput, DragonModel, ModelConfigOption } from './page.types'

async function assertAdmin() {
  const isAdmin = await checkIsAdminAction()
  if (!isAdmin) {
    console.error('Unauthorized dragon-model write attempt')
    throw new Error('Not authorized')
  }
}

export async function listModelConfigsForCreateAction(): Promise<ModelConfigOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('model_configs')
    .select('id, name, stl_key, groups, model_rotation')
    .order('created_at', { ascending: false })
  if (error) {
    console.error(error)
    throw new Error('Failed to load model configurations')
  }
  return data as unknown as ModelConfigOption[]
}

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

export async function createModelAction(input: CreateModelInput): Promise<DragonModel> {
  await assertAdmin()
  const supabase = await createClient()

  const config = await supabase
    .from('model_configs')
    .select('stl_key, groups, model_rotation')
    .eq('id', input.modelConfigId)
    .single()
  if (config.error || !config.data) {
    console.error(config.error)
    throw new Error('Source model configuration not found')
  }

  const { data, error } = await supabase
    .from('dragon_models')
    .insert({
      variant_id: input.variantId,
      stage: input.stage,
      stl_key: config.data.stl_key,
      groups: config.data.groups as Database['public']['Tables']['dragon_models']['Insert']['groups'],
      model_rotation: config.data.model_rotation,
      role_tags: {} as Database['public']['Tables']['dragon_models']['Insert']['role_tags'],
    })
    .select()
    .single()
  if (error) {
    console.error(error)
    if (error.message.includes('duplicate key') || error.message.includes('unique')) {
      throw new Error(`A ${input.stage} model already exists for this variant.`)
    }
    throw new Error(error.message)
  }
  return data
}
