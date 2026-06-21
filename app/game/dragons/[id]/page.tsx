'use client'

import { use, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { StudioCanvas } from '@/app/admin/_lib/StudioCanvas'
import { PosedDragon } from '@/app/game/AnimatedModel'
import { resolveGenotype, rollGenotype } from '@/app/game/dragons.genetics'
import { Genotype } from '@/app/game/dragons.types'
import { useStlSegments } from '@/app/game/useStlSegments'
import { useVariantBundle } from './page.hooks'

const STAGE_ORDER = ['egg', 'baby', 'adult', 'winged'] as const

export default function DragonPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: variantKey } = use(params)
  const { data: bundle, isLoading, error } = useVariantBundle(variantKey)

  const [genotype, setGenotype] = useState<Genotype | null>(null)
  const [stage, setStage] = useState<string | null>(null)
  const [rolledFor, setRolledFor] = useState<string | null>(null)

  // Roll an initial genotype + pick a default stage once each variant bundle arrives (React's
  // "adjust state while rendering" pattern — not an effect — so a later stage switch doesn't re-roll).
  if (bundle && rolledFor !== bundle.variantKey) {
    setRolledFor(bundle.variantKey)
    setGenotype(rollGenotype(bundle.genes, bundle.alleles))
    const preferred =
      bundle.models.find((m) => m.stage === 'adult') ??
      [...bundle.models].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))[0]
    setStage(preferred ? preferred.stage : null)
  }

  const model = useMemo(
    () => bundle?.models.find((m) => m.stage === stage) ?? null,
    [bundle, stage],
  )
  const { data: segments } = useStlSegments(model?.stlKey ?? null)

  const phenotype = useMemo(() => {
    if (!bundle || !genotype) return {}
    return resolveGenotype(genotype, bundle.genes, bundle.roles, bundle.alleles, bundle.filaments)
  }, [bundle, genotype])

  return (
    <div className="flex h-screen flex-col bg-neutral-900 text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
        <div>
          <h1 className="text-sm font-semibold">
            Dragon preview —{' '}
            {isLoading ? (
              <span className="inline-block h-3 w-24 animate-pulse rounded bg-white/15 align-middle" />
            ) : (
              <span className="text-violet-300">{bundle?.variantName ?? variantKey}</span>
            )}
          </h1>
          <p className="text-[11px] text-white/45">Genotype → per-role colour, rolled in-memory.</p>
        </div>
        <div className="flex items-center gap-2">
          {bundle?.models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setStage(m.stage)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs capitalize transition-colors',
                stage === m.stage ? 'bg-violet-600/50 text-violet-100' : 'bg-white/10 text-white/70 hover:text-white',
              )}
            >
              {m.stage}
            </button>
          ))}
          <button
            type="button"
            disabled={!bundle}
            onClick={() => bundle && setGenotype(rollGenotype(bundle.genes, bundle.alleles))}
            className="rounded-md bg-emerald-600/50 px-3 py-1 text-xs text-emerald-100 transition-colors hover:bg-emerald-600/70 disabled:opacity-40"
          >
            Roll random
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-300/80">
            {(error as Error).message}
          </div>
        ) : (
          <StudioCanvas>
            {model && segments && genotype ? (
              <PosedDragon
                groups={model.groups}
                segments={segments}
                roleTags={model.roleTags}
                phenotype={phenotype}
              />
            ) : null}
          </StudioCanvas>
        )}
      </main>
    </div>
  )
}
