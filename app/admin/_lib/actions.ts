'use server'

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/supabase/server-client'
import { checkIsAdminAction } from '@/app/layout.actions'
import type { Database, Json } from '@/supabase/types'
import type { DragonStage, RoleTags } from '@/app/game/dragons.types'
import { R2FileNode, BodyGroup, DragonRigRow } from './types'

async function assertAdmin() {
  const isAdmin = await checkIsAdminAction()
  if (!isAdmin) {
    console.error('Unauthorized rig write attempt')
    throw new Error('Not authorized')
  }
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

function buildTree(keys: string[]): R2FileNode[] {
  const root: R2FileNode[] = []
  const map = new Map<string, R2FileNode>()

  for (const key of keys) {
    const parts = key.split('/')
    let nodes = root
    let path = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      path = path ? `${path}/${part}` : part
      const isLast = i === parts.length - 1
      if (!map.has(path)) {
        const node: R2FileNode = {
          name: part,
          key: isLast ? key : path,
          isFolder: !isLast,
          children: !isLast ? [] : undefined,
        }
        map.set(path, node)
        nodes.push(node)
      }
      if (!isLast) {
        nodes = map.get(path)!.children!
      }
    }
  }
  return root
}

export async function listR2FilesAction(): Promise<R2FileNode[]> {
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET })
  const res = await s3.send(cmd)
  const keys = (res.Contents ?? []).map((o) => o.Key!).filter(Boolean)
  return buildTree(keys)
}

export async function getSignedUrlAction(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, cmd, { expiresIn: 3600 })
}

type DragonModelWithVariant = Database['public']['Tables']['dragon_models']['Row'] & {
  dragon_variants: { name: string } | null
}

function toRigRow(row: DragonModelWithVariant): DragonRigRow {
  return {
    id: row.id,
    variant_id: row.variant_id,
    variant_name: row.dragon_variants?.name ?? '',
    stage: row.stage,
    stl_key: row.stl_key,
    groups: row.groups as unknown as BodyGroup[],
    model_rotation: row.model_rotation as [number, number, number],
    role_tags: (row.role_tags ?? {}) as unknown as RoleTags,
  }
}

const RIG_SELECT = 'id, variant_id, stage, stl_key, groups, model_rotation, role_tags, dragon_variants(name)'

export async function saveDragonRigAction(params: {
  id: string | null
  variantId: string
  stage: DragonStage
  stlKey: string
  groups: BodyGroup[]
  modelRotation: [number, number, number]
}): Promise<DragonRigRow> {
  await assertAdmin()
  const supabase = await createClient()

  const rigFields = {
    stl_key: params.stlKey,
    groups: params.groups as unknown as Json,
    model_rotation: params.modelRotation,
    updated_at: new Date().toISOString(),
  }

  if (params.id) {
    const { data, error } = await supabase
      .from('dragon_models')
      .update(rigFields)
      .eq('id', params.id)
      .select(RIG_SELECT)
      .single()
    if (error) { console.error(error); throw new Error('Failed to save rig') }
    return toRigRow(data as unknown as DragonModelWithVariant)
  }

  const { data, error } = await supabase
    .from('dragon_models')
    .insert({
      variant_id: params.variantId,
      stage: params.stage,
      ...rigFields,
      role_tags: {} as Database['public']['Tables']['dragon_models']['Insert']['role_tags'],
    })
    .select(RIG_SELECT)
    .single()
  if (error) {
    console.error(error)
    if (error.message.includes('duplicate key') || error.message.includes('unique')) {
      throw new Error(`A ${params.stage} rig already exists for this variant — load it to edit.`)
    }
    throw new Error('Failed to save rig')
  }
  return toRigRow(data as unknown as DragonModelWithVariant)
}

export async function listDragonRigsAction(): Promise<DragonRigRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dragon_models')
    .select(RIG_SELECT)
    .order('updated_at', { ascending: false })
  if (error) { console.error(error); throw new Error('Failed to list rigs') }
  return (data as unknown as DragonModelWithVariant[]).map(toRigRow)
}

export async function getDragonRigAction(id: string): Promise<DragonRigRow> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dragon_models')
    .select(RIG_SELECT)
    .eq('id', id)
    .single()
  if (error) { console.error(error); throw new Error('Rig not found') }
  return toRigRow(data as unknown as DragonModelWithVariant)
}
