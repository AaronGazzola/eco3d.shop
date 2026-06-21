'use server'

import { createClient } from '@/supabase/server-client'
import { BodyGroup } from '@/app/admin/_lib/types'
import { RoleTags } from '@/app/game/dragons.types'
import { VariantBundle } from './page.types'

// Reads the public, admin-authored definition tables for one variant (readable by anyone per RLS), so
// the preview can roll + render without a persisted, owner-scoped dragon row.
export async function getVariantBundleAction(variantKey: string): Promise<VariantBundle> {
  const supabase = await createClient()

  const variant = await supabase
    .from('dragon_variants')
    .select('id, key, name')
    .eq('key', variantKey)
    .single()
  if (variant.error) {
    console.error(variant.error)
    throw new Error(`Variant "${variantKey}" not found`)
  }
  const variantId = variant.data.id

  const [roles, genes, models] = await Promise.all([
    supabase.from('dragon_roles').select('*').eq('variant_id', variantId),
    supabase.from('dragon_genes').select('*').eq('variant_id', variantId),
    supabase.from('dragon_models').select('*').eq('variant_id', variantId),
  ])
  if (roles.error || genes.error || models.error) {
    console.error(roles.error ?? genes.error ?? models.error)
    throw new Error('Failed to load variant definitions')
  }

  const geneIds = genes.data.map((g) => g.id)
  const alleles = geneIds.length
    ? await supabase.from('dragon_alleles').select('*').in('gene_id', geneIds)
    : { data: [], error: null }
  if (alleles.error) {
    console.error(alleles.error)
    throw new Error('Failed to load alleles')
  }

  const filamentIds = Array.from(new Set(alleles.data.map((a) => a.filament_color_id)))
  const filaments = filamentIds.length
    ? await supabase.from('filament_colors').select('*').in('id', filamentIds)
    : { data: [], error: null }
  if (filaments.error) {
    console.error(filaments.error)
    throw new Error('Failed to load filament colors')
  }

  return {
    variantId,
    variantKey: variant.data.key,
    variantName: variant.data.name,
    roles: roles.data,
    genes: genes.data,
    alleles: alleles.data,
    filaments: filaments.data,
    models: models.data.map((m) => ({
      id: m.id,
      stage: m.stage,
      stlKey: m.stl_key,
      groups: m.groups as unknown as BodyGroup[],
      roleTags: m.role_tags as unknown as RoleTags,
      modelRotation: m.model_rotation as [number, number, number],
    })),
  }
}
