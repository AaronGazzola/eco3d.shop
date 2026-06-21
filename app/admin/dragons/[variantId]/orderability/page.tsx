'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminGate } from '@/app/admin/_lib/AdminGate'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useOrderability } from './page.hooks'
import type { OrderabilityResult } from './page.types'

export default function OrderabilityPage() {
  const params = useParams<{ variantId: string }>()
  const variantId = params.variantId
  const { data, isLoading } = useOrderability(variantId)

  return (
    <AdminGate title="Orderability">
      <div className="space-y-8">
        <div>
          <Link
            href={`/admin/dragons/${variantId}`}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Back to variant
          </Link>
        </div>
        <h2 className="text-lg font-semibold">Printable phenotypes</h2>
        {isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full bg-white/10" />
            <Skeleton className="h-40 w-full bg-white/10" />
          </div>
        ) : (
          <OrderabilityView data={data} />
        )}
      </div>
    </AdminGate>
  )
}

function OrderabilityView({ data }: { data: OrderabilityResult }) {
  const { rows, roles, capped, total, maxPrintColors, overLimitCount } = data

  if (roles.length === 0) {
    return <p className="text-sm text-amber-300/80">This variant has no roles/genes to analyse yet.</p>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-[#333333] p-4 text-sm">
        <p>
          <span className="font-medium">{rows.length}</span> distinct phenotype
          {rows.length === 1 ? '' : 's'}
          {capped && (
            <span className="text-amber-300/80"> (capped — variant produces {total} combinations)</span>
          )}
        </p>
        <p className="mt-1 text-white/60">
          Colour ceiling:{' '}
          {maxPrintColors == null ? (
            <span className="text-white/50">no limit set</span>
          ) : (
            <>
              <span className="font-medium text-white">{maxPrintColors}</span> ·{' '}
              <span className={cn(overLimitCount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {overLimitCount} over limit
              </span>
            </>
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#3a3a3a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-white/40">
              <th className="px-4 py-2 font-medium">Phenotype</th>
              <th className="px-4 py-2 font-medium">Colours</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-3">
                    {roles.map((role) => {
                      const hex = row.roleHex[role.key]
                      if (!hex) return null
                      return (
                        <span key={role.id} className="flex items-center gap-1.5">
                          <span
                            className="h-4 w-4 rounded border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="text-white/60">{role.name}</span>
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-white/80">{row.colorCount}</td>
                <td className="px-4 py-2.5">
                  {row.overLimit ? (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                      Over limit
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
