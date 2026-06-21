'use server'

import { createClient } from '@/lib/supabase/server-client'
import { checkIsAdminAction } from '@/app/layout.actions'
import type { Database } from '@/supabase/types'
import type { ModelBundle, RoleTagDraft } from './page.types'

async function assertAdmin() {
  const isAdmin = await checkIsAdminAction()
  if (!isAdmin) {
    console.error('Unauthorized dragon-model write attempt')
    throw new Error('Not authorized')
  }
}

export async function getModelAction(modelId: string): Promise<ModelBundle> {
  const supabase = await createClient()

  const model = await supabase.from('dragon_models').select('*').eq('id', modelId).single()
  if (model.error || !model.data) {
    console.error(model.error)
    throw new Error('Model not found')
  }

  const variant = await supabase
    .from('dragon_variants')
    .select('*')
    .eq('id', model.data.variant_id)
    .single()
  if (variant.error || !variant.data) {
    console.error(variant.error)
    throw new Error('Variant not found')
  }

  const roles = await supabase
    .from('dragon_roles')
    .select('*')
    .eq('variant_id', model.data.variant_id)
    .order('display_order', { ascending: true })
  if (roles.error) {
    console.error(roles.error)
    throw new Error('Failed to load roles')
  }

  return { model: model.data, variant: variant.data, roles: roles.data }
}

export async function saveRoleTagsAction(modelId: string, roleTags: RoleTagDraft): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('dragon_models')
    .update({
      role_tags: roleTags as Database['public']['Tables']['dragon_models']['Update']['role_tags'],
    })
    .eq('id', modelId)
  if (error) {
    console.error(error)
    throw new Error(error.message)
  }
}

export async function deleteModelAction(modelId: string): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('dragon_models').delete().eq('id', modelId)
  if (error) {
    console.error(error)
    throw new Error(error.message)
  }
}
