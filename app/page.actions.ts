'use server'

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createClient } from '@/supabase/server-client'
import { ModelConfigRow, BodyGroup } from './admin/_lib/types'
import { EggPair } from './page.types'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

export async function listEggPairsAction(): Promise<EggPair[]> {
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET })
  const res = await s3.send(cmd)
  const allKeys = (res.Contents ?? []).map((o) => o.Key!).filter(Boolean)

  const candidates = allKeys.filter((k) => {
    const lower = k.toLowerCase()
    if (!lower.endsWith('.stl')) return false
    if (!lower.includes('egg')) return false
    if (!k.includes('/STLs/')) return false
    if (lower.includes('split')) return false
    const file = k.split('/').pop()!.toLowerCase()
    if (file.startsWith('simple_')) return false
    return true
  })

  const byDir = new Map<string, string[]>()
  for (const k of candidates) {
    const dir = k.substring(0, k.lastIndexOf('/'))
    const list = byDir.get(dir)
    if (list) list.push(k)
    else byDir.set(dir, [k])
  }

  const pairs: EggPair[] = []
  for (const [dir, files] of byDir.entries()) {
    const top = files.find((f) => /top/i.test(f.split('/').pop()!))
    const bottom = files.find((f) => /bottom/i.test(f.split('/').pop()!))
    if (!top || !bottom) continue
    const parts = dir.split('/').filter(Boolean)
    const stlsIdx = parts.lastIndexOf('STLs')
    const id = stlsIdx > 0 ? parts[stlsIdx - 1] : parts[parts.length - 1]
    pairs.push({ id, topKey: top, bottomKey: bottom })
  }

  return pairs
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
