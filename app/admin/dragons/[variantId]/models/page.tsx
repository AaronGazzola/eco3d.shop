'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminGate } from '../../../_lib/AdminGate'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateModel, useModelConfigs, useModelsForVariant } from './page.hooks'
import { DRAGON_STAGES, type DragonStage } from './page.types'

export default function VariantModelsPage() {
  const params = useParams<{ variantId: string }>()
  const variantId = params.variantId

  return (
    <AdminGate title="Stage models">
      <div className="space-y-10">
        <div>
          <Link
            href={`/admin/dragons/${variantId}`}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Back to variant
          </Link>
        </div>
        <ModelsList variantId={variantId} />
        <CreateModel variantId={variantId} />
      </div>
    </AdminGate>
  )
}

function ModelsList({ variantId }: { variantId: string }) {
  const { data: models, isLoading } = useModelsForVariant(variantId)

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Models</h2>
      <div className="rounded-lg border border-white/10 bg-[#3a3a3a]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        ) : models && models.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/dragons/${variantId}/models/${m.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium capitalize">{m.stage}</span>
                  <span className="flex items-center gap-3 text-sm text-white/40">
                    <code className="text-white/50">{m.stl_key.split('/').pop()}</code>
                    <span>{Object.keys((m.role_tags ?? {}) as Record<string, string>).length} tagged</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-white/40">No stage models yet.</p>
        )}
      </div>
    </section>
  )
}

function CreateModel({ variantId }: { variantId: string }) {
  const { data: configs, isLoading } = useModelConfigs()
  const { data: models } = useModelsForVariant(variantId)
  const create = useCreateModel(variantId)
  const [stage, setStage] = useState<DragonStage>('adult')
  const [configId, setConfigId] = useState('')

  const usedStages = new Set((models ?? []).map((m) => m.stage))
  const noConfigs = !isLoading && (!configs || configs.length === 0)

  const onCreate = () => {
    if (!configId) return
    create.mutate(
      { variantId, stage, modelConfigId: configId },
      { onSuccess: () => setConfigId('') },
    )
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Create a stage model</h2>
      {noConfigs ? (
        <p className="rounded-lg border border-white/10 bg-[#333333] p-4 text-sm text-amber-300/80">
          No saved model configurations. Author a model in the studio first, then return here.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-[#333333] p-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-white/50">Stage</Label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as DragonStage)}
              className={selectCls}
            >
              {DRAGON_STAGES.map((s) => (
                <option key={s} value={s} disabled={usedStages.has(s)}>
                  {s}
                  {usedStages.has(s) ? ' (exists)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-white/50">Source configuration</Label>
            {isLoading ? (
              <Skeleton className="h-9 w-64 bg-white/10" />
            ) : (
              <select
                value={configId}
                onChange={(e) => setConfigId(e.target.value)}
                className={selectCls}
              >
                <option value="">Select a configuration…</option>
                {configs!.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button onClick={onCreate} disabled={!configId || create.isPending || usedStages.has(stage)}>
            {create.isPending ? 'Creating…' : 'Create model'}
          </Button>
        </div>
      )}
    </section>
  )
}

const selectCls =
  'h-9 min-w-[12rem] rounded-md border border-white/10 bg-[#4a4a4a] px-3 text-sm text-white outline-none'
