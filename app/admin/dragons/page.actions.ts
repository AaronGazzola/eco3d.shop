'use server'

import { createClient } from '@/lib/supabase/server-client'
import { checkIsAdminAction } from '@/app/layout.actions'
import type {
  DragonVariant,
  FilamentColor,
  FilamentColorInput,
  VariantInput,
} from './page.types'

async function assertAdmin() {
  const isAdmin = await checkIsAdminAction()
  if (!isAdmin) {
    console.error('Unauthorized dragon-genetics write attempt')
    throw new Error('Not authorized')
  }
}

function describeConflict(message: string) {
  if (message.includes('duplicate key') || message.includes('unique')) {
    return 'That key already exists — keys must be unique.'
  }
  return message
}

export async function listVariantsAction(): Promise<DragonVariant[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dragon_variants')
    .select('*')
    .order('name', { ascending: true })
  if (error) {
    console.error(error)
    throw new Error('Failed to load variants')
  }
  return data
}

export async function createVariantAction(input: VariantInput): Promise<DragonVariant> {
  await assertAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dragon_variants')
    .insert({
      key: input.key,
      name: input.name,
      max_print_colors: input.max_print_colors,
      description: input.description,
    })
    .select()
    .single()
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
  return data
}

export async function listFilamentColorsAction(): Promise<FilamentColor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('filament_colors')
    .select('*')
    .order('name', { ascending: true })
  if (error) {
    console.error(error)
    throw new Error('Failed to load filament colors')
  }
  return data
}

export async function createFilamentColorAction(input: FilamentColorInput): Promise<FilamentColor> {
  await assertAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('filament_colors')
    .insert({
      name: input.name,
      hex: input.hex,
      brand: input.brand,
      sku: input.sku,
    })
    .select()
    .single()
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
  return data
}

export async function updateFilamentColorAction(
  id: string,
  input: FilamentColorInput,
): Promise<FilamentColor> {
  await assertAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('filament_colors')
    .update({
      name: input.name,
      hex: input.hex,
      brand: input.brand,
      sku: input.sku,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
  return data
}
