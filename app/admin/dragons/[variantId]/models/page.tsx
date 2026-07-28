'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminGate } from '../../../_lib/AdminGate'
import { Skeleton } from '@/components/ui/skeleton'
import { useModelsForVariant } from './page.hooks'

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
      </div>
    </AdminGate>
  )
}

function ModelsList({ variantId }: { variantId: string }) {
  const { data: models, isLoading } = useModelsForVariant(variantId)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Models</h2>
        <Link
          href="/admin/pick"
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          Author a rig in the studio →
        </Link>
      </div>
      <div className="rounded-lg border border-white/10 bg-[#3a3a3a]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        ) : models && models.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {models.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <Link
                  href={`/admin/dragons/${variantId}/models/${m.id}`}
                  className="flex flex-1 items-center justify-between"
                >
                  <span className="font-medium capitalize">{m.stage}</span>
                  <span className="flex items-center gap-3 text-sm text-white/40">
                    <code className="text-white/50">{m.stl_key.split('/').pop()}</code>
                    <span>{Object.keys((m.role_tags ?? {}) as Record<string, string>).length} tagged</span>
                  </span>
                </Link>
                <Link
                  href="/admin/pick"
                  className="ml-4 shrink-0 text-xs text-white/50 hover:text-white transition-colors"
                >
                  Edit rig →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-white/40">
            No stage models yet. Author a rig in the studio to create one.
          </p>
        )}
      </div>
    </section>
  )
}
