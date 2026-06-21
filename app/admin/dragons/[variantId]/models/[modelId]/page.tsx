'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminGate } from '@/app/admin/_lib/AdminGate'
import { useStlSegments } from '@/app/game/useStlSegments'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TagScene } from './TagScene'
import { useDeleteModel, useModel, useSaveRoleTags } from './page.hooks'
import { useTagEditorStore } from './page.stores'
import type { DragonRole, RoleTags } from './page.types'

const ROLE_PALETTE = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function buildRoleColors(roles: DragonRole[]): Record<string, string> {
  const out: Record<string, string> = {}
  roles.forEach((r, i) => {
    out[r.key] = ROLE_PALETTE[i % ROLE_PALETTE.length]
  })
  return out
}

export default function ModelTaggingPage() {
  const params = useParams<{ variantId: string; modelId: string }>()
  const { variantId, modelId } = params
  const { data: bundle, isLoading } = useModel(modelId)
  const { data: segments, isLoading: segmentsLoading } = useStlSegments(bundle?.model.stl_key ?? null)

  const init = useTagEditorStore((s) => s.init)
  useEffect(() => {
    if (!bundle) return
    init((bundle.model.role_tags ?? {}) as RoleTags, bundle.roles[0]?.key ?? null)
  }, [bundle, init])

  const roleColors = useMemo(() => (bundle ? buildRoleColors(bundle.roles) : {}), [bundle])
  const modelRotation = useMemo(
    () => (bundle?.model.model_rotation ?? [0, 0, 0]) as [number, number, number],
    [bundle],
  )

  return (
    <AdminGate
      sidebar={
        bundle ? (
          <TagSidebar
            modelId={modelId}
            variantId={variantId}
            stage={bundle.model.stage}
            variantName={bundle.variant.name}
            roles={bundle.roles}
            roleColors={roleColors}
          />
        ) : (
          <div className="p-4">
            <Skeleton className="h-40 w-full bg-white/10" />
          </div>
        )
      }
    >
      <div className="h-full w-full">
        {isLoading || !bundle ? (
          <div className="flex h-full items-center justify-center">
            <Skeleton className="h-10 w-48 bg-white/10" />
          </div>
        ) : segmentsLoading || !segments ? (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            Loading geometry…
          </div>
        ) : (
          <TagScene segments={segments} roleColors={roleColors} modelRotation={modelRotation} />
        )}
      </div>
    </AdminGate>
  )
}

function TagSidebar({
  modelId,
  variantId,
  stage,
  variantName,
  roles,
  roleColors,
}: {
  modelId: string
  variantId: string
  stage: string
  variantName: string
  roles: DragonRole[]
  roleColors: Record<string, string>
}) {
  const roleTags = useTagEditorStore((s) => s.roleTags)
  const activeRole = useTagEditorStore((s) => s.activeRole)
  const selection = useTagEditorStore((s) => s.selection)
  const dirty = useTagEditorStore((s) => s.dirty)
  const setActiveRole = useTagEditorStore((s) => s.setActiveRole)
  const assign = useTagEditorStore((s) => s.assignSelectionToActiveRole)
  const untag = useTagEditorStore((s) => s.untagSelection)
  const clearSelection = useTagEditorStore((s) => s.clearSelection)
  const markSaved = useTagEditorStore((s) => s.markSaved)

  const save = useSaveRoleTags(modelId)
  const del = useDeleteModel(modelId, variantId)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const role of Object.values(roleTags)) c[role] = (c[role] ?? 0) + 1
    return c
  }, [roleTags])

  const onSave = () => save.mutate(roleTags, { onSuccess: markSaved })

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white">
      <div>
        <Link
          href={`/admin/dragons/${variantId}/models`}
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          ← Back to models
        </Link>
        <h2 className="mt-2 text-sm font-semibold">
          {variantName} · <span className="capitalize">{stage}</span>
        </h2>
        <p className="text-xs text-white/40">
          Select segments, then assign them to a role.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-white/40">Roles</span>
        {roles.length === 0 ? (
          <p className="text-sm text-amber-300/80">This variant has no roles. Add roles first.</p>
        ) : (
          roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.key)}
              className={cn(
                'flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors',
                activeRole === r.key ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: roleColors[r.key] }}
                />
                {r.name}
              </span>
              <span className="text-xs text-white/40">{counts[r.key] ?? 0}</span>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-white/8 pt-3">
        <span className="text-xs text-white/50">Selected: {selection.length}</span>
        <Button size="sm" disabled={!activeRole || selection.length === 0} onClick={assign}>
          Assign to {activeRole ? roles.find((r) => r.key === activeRole)?.name : 'role'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={selection.length === 0}
          onClick={untag}
        >
          Untag selection
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={selection.length === 0}
          onClick={clearSelection}
        >
          Clear selection
        </Button>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-white/8 pt-3">
        {dirty && <span className="text-xs text-amber-300/80">Unsaved changes</span>}
        <Button disabled={!dirty || save.isPending} onClick={onSave}>
          {save.isPending ? 'Saving…' : 'Save tags'}
        </Button>
        <Button
          variant="ghost"
          className="text-red-400 hover:text-red-300"
          disabled={del.isPending}
          onClick={() => del.mutate()}
        >
          Delete model
        </Button>
      </div>
    </div>
  )
}
