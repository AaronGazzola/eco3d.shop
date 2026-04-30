'use server'

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createClient } from '@/supabase/server-client'
import { ModelConfigRow, BodyGroup } from './studio/page.types'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

export async function listEggKeysAction(): Promise<string[]> {
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET })
  const res = await s3.send(cmd)
  const keys = (res.Contents ?? []).map((o) => o.Key!).filter(Boolean)
  return keys.filter(
    (k) => k.toLowerCase().endsWith('.stl') && k.toLowerCase().includes('egg')
  )
}

export async function listDragonConfigsAction(): Promise<ModelConfigRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('model_configs')
    .select('id, stl_key, name, groups, model_rotation, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error(error)
    throw new Error('Failed to list dragon configs')
  }
  return data.map((row) => ({
    ...row,
    groups: row.groups as unknown as BodyGroup[],
    model_rotation: row.model_rotation as [number, number, number],
  }))
}
