'use server'

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/supabase/server-client'
import { R2FileNode, BodyGroup, ModelConfigRow } from './page.types'

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

export async function saveModelConfigAction(params: {
  id: string | null
  stlKey: string
  name: string
  groups: BodyGroup[]
  modelRotation: [number, number, number]
}): Promise<ModelConfigRow> {
  const supabase = await createClient()

  const payload = {
    stl_key: params.stlKey,
    name: params.name,
    groups: params.groups as unknown as import('@/supabase/types').Json,
    model_rotation: params.modelRotation,
    updated_at: new Date().toISOString(),
  }

  if (params.id) {
    const { data, error } = await supabase
      .from('model_configs')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single()
    if (error) { console.error(error); throw new Error('Failed to save config') }
    return { ...data, groups: data.groups as unknown as BodyGroup[], model_rotation: data.model_rotation as [number, number, number] }
  }

  const { data, error } = await supabase
    .from('model_configs')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select()
    .single()
  if (error) { console.error(error); throw new Error('Failed to save config') }
  return { ...data, groups: data.groups as unknown as BodyGroup[], model_rotation: data.model_rotation as [number, number, number] }
}

export async function listModelConfigsAction(): Promise<ModelConfigRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('model_configs')
    .select('id, stl_key, name, groups, model_rotation, created_at')
    .order('updated_at', { ascending: false })
  if (error) { console.error(error); throw new Error('Failed to list configs') }
  return data.map((row) => ({
    ...row,
    groups: row.groups as unknown as BodyGroup[],
    model_rotation: row.model_rotation as [number, number, number],
  }))
}
