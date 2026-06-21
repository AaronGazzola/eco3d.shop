'use server'

import { createClient } from '@/lib/supabase/server-client'
import { checkIsAdminAction } from '@/app/layout.actions'
import type {
  AlleleInput,
  DragonAllele,
  DragonGene,
  DragonRole,
  GeneInput,
  RoleInput,
  VariantGenetics,
  VariantHeaderInput,
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
    return 'That key already exists for this variant — keys must be unique.'
  }
  return message
}

export async function getVariantGeneticsAction(variantId: string): Promise<VariantGenetics> {
  const supabase = await createClient()

  const variant = await supabase.from('dragon_variants').select('*').eq('id', variantId).single()
  if (variant.error) {
    console.error(variant.error)
    throw new Error('Failed to load variant')
  }

  const roles = await supabase
    .from('dragon_roles')
    .select('*')
    .eq('variant_id', variantId)
    .order('display_order', { ascending: true })
  if (roles.error) {
    console.error(roles.error)
    throw new Error('Failed to load roles')
  }

  const genes = await supabase
    .from('dragon_genes')
    .select('*')
    .eq('variant_id', variantId)
    .order('display_order', { ascending: true })
  if (genes.error) {
    console.error(genes.error)
    throw new Error('Failed to load genes')
  }

  const geneIds = genes.data.map((g) => g.id)
  const alleles = geneIds.length
    ? await supabase
        .from('dragon_alleles')
        .select('*')
        .in('gene_id', geneIds)
        .order('dominance_rank', { ascending: false })
    : { data: [] as DragonAllele[], error: null }
  if (alleles.error) {
    console.error(alleles.error)
    throw new Error('Failed to load alleles')
  }

  const filaments = await supabase
    .from('filament_colors')
    .select('*')
    .order('name', { ascending: true })
  if (filaments.error) {
    console.error(filaments.error)
    throw new Error('Failed to load filament colors')
  }

  return {
    variant: variant.data,
    roles: roles.data,
    genes: genes.data,
    alleles: alleles.data ?? [],
    filaments: filaments.data,
  }
}

export async function updateVariantHeaderAction(
  variantId: string,
  input: VariantHeaderInput,
): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('dragon_variants')
    .update({ key: input.key, name: input.name, max_print_colors: input.max_print_colors })
    .eq('id', variantId)
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
}

export async function createRoleAction(variantId: string, input: RoleInput): Promise<DragonRole> {
  await assertAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dragon_roles')
    .insert({ variant_id: variantId, key: input.key, name: input.name, display_order: input.display_order })
    .select()
    .single()
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
  return data
}

export async function updateRoleAction(roleId: string, input: RoleInput): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('dragon_roles')
    .update({ key: input.key, name: input.name, display_order: input.display_order })
    .eq('id', roleId)
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
}

export async function deleteRoleAction(roleId: string): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('dragon_roles').delete().eq('id', roleId)
  if (error) {
    console.error(error)
    throw new Error(error.message)
  }
}

export async function createGeneAction(variantId: string, input: GeneInput): Promise<DragonGene> {
  await assertAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dragon_genes')
    .insert({
      variant_id: variantId,
      role_id: input.role_id,
      key: input.key,
      name: input.name,
      display_order: input.display_order,
    })
    .select()
    .single()
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
  return data
}

export async function updateGeneAction(geneId: string, input: GeneInput): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('dragon_genes')
    .update({
      role_id: input.role_id,
      key: input.key,
      name: input.name,
      display_order: input.display_order,
    })
    .eq('id', geneId)
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
}

export async function deleteGeneAction(geneId: string): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('dragon_genes').delete().eq('id', geneId)
  if (error) {
    console.error(error)
    throw new Error(error.message)
  }
}

export async function createAlleleAction(geneId: string, input: AlleleInput): Promise<DragonAllele> {
  await assertAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dragon_alleles')
    .insert({
      gene_id: geneId,
      key: input.key,
      name: input.name,
      dominance_rank: input.dominance_rank,
      frequency: input.frequency,
      filament_color_id: input.filament_color_id,
    })
    .select()
    .single()
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
  return data
}

export async function updateAlleleAction(alleleId: string, input: AlleleInput): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('dragon_alleles')
    .update({
      key: input.key,
      name: input.name,
      dominance_rank: input.dominance_rank,
      frequency: input.frequency,
      filament_color_id: input.filament_color_id,
    })
    .eq('id', alleleId)
  if (error) {
    console.error(error)
    throw new Error(describeConflict(error.message))
  }
}

export async function deleteAlleleAction(alleleId: string): Promise<void> {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('dragon_alleles').delete().eq('id', alleleId)
  if (error) {
    console.error(error)
    throw new Error(error.message)
  }
}
