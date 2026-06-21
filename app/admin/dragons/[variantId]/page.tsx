'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminGate } from '../../_lib/AdminGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useCreateAllele,
  useCreateGene,
  useCreateRole,
  useDeleteAllele,
  useDeleteGene,
  useDeleteRole,
  useUpdateAllele,
  useUpdateGene,
  useUpdateRole,
  useUpdateVariantHeader,
  useVariantGenetics,
} from './page.hooks'
import { isEditing, useVariantEditorStore } from './page.stores'
import type {
  DragonAllele,
  DragonGene,
  DragonRole,
  FilamentColor,
  VariantGenetics,
} from './page.types'

export default function VariantEditorPage() {
  const params = useParams<{ variantId: string }>()
  const variantId = params.variantId
  const { data, isLoading } = useVariantGenetics(variantId)

  return (
    <AdminGate title="Variant genetics">
      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full bg-white/10" />
          <Skeleton className="h-40 w-full bg-white/10" />
        </div>
      ) : (
        <div className="space-y-12">
          <div className="flex items-center gap-5">
            <Link
              href={`/admin/dragons/${variantId}/models`}
              className="text-sm text-violet-300 hover:text-violet-200 transition-colors"
            >
              Stage models & role tagging →
            </Link>
            <Link
              href={`/admin/dragons/${variantId}/orderability`}
              className="text-sm text-violet-300 hover:text-violet-200 transition-colors"
            >
              Orderability map →
            </Link>
          </div>
          <VariantHeader key={data.variant.updated_at} variantId={variantId} data={data} />
          <RolesSection variantId={variantId} data={data} />
          <GenesSection variantId={variantId} data={data} />
        </div>
      )}
    </AdminGate>
  )
}

function VariantHeader({ variantId, data }: { variantId: string; data: VariantGenetics }) {
  const update = useUpdateVariantHeader(variantId)
  const [key, setKey] = useState(data.variant.key)
  const [name, setName] = useState(data.variant.name)
  const [maxColors, setMaxColors] = useState(String(data.variant.max_print_colors ?? ''))

  const onSave = () => {
    update.mutate({
      key: key.trim(),
      name: name.trim(),
      max_print_colors: maxColors.trim() === '' ? null : Number(maxColors),
    })
  }

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-[#333333] p-4">
      <Field label="Key">
        <Input value={key} onChange={(e) => setKey(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Max print colours">
        <Input
          type="number"
          min={1}
          value={maxColors}
          onChange={(e) => setMaxColors(e.target.value)}
          className={cn(inputCls, 'w-32')}
        />
      </Field>
      <Button onClick={onSave} disabled={update.isPending || key.trim() === '' || name.trim() === ''}>
        {update.isPending ? 'Saving…' : 'Save variant'}
      </Button>
    </section>
  )
}

function RolesSection({ variantId, data }: { variantId: string; data: VariantGenetics }) {
  const create = useCreateRole(variantId)
  const update = useUpdateRole(variantId)
  const remove = useDeleteRole(variantId)
  const { editing, draft, startEdit, setDraft, cancel } = useVariantEditorStore()

  const onSave = () => {
    const input = {
      key: String(draft.key ?? '').trim(),
      name: String(draft.name ?? '').trim(),
      display_order: Number(draft.display_order ?? data.roles.length),
    }
    if (editing?.kind !== 'role') return
    if (editing.id === 'new') {
      create.mutate(input, { onSuccess: cancel })
    } else {
      update.mutate({ roleId: editing.id, input }, { onSuccess: cancel })
    }
  }

  const saving = create.isPending || update.isPending
  const editingRole = editing?.kind === 'role'

  return (
    <section>
      <SectionHeader title="Roles">
        {!editingRole && (
          <Button
            variant="outline"
            onClick={() =>
              startEdit({ kind: 'role', id: 'new' }, { key: '', name: '', display_order: data.roles.length })
            }
          >
            Add role
          </Button>
        )}
      </SectionHeader>

      {editingRole && editing.id === 'new' && (
        <RoleForm draft={draft} setDraft={setDraft} onSave={onSave} onCancel={cancel} saving={saving} />
      )}

      <div className="rounded-lg border border-white/10 bg-[#3a3a3a]">
        {data.roles.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/40">No roles yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.roles.map((role) => {
              const rowEditing = isEditing(editing, { kind: 'role', id: role.id })
              return (
                <li key={role.id} className="px-4 py-3">
                  {rowEditing ? (
                    <RoleForm
                      draft={draft}
                      setDraft={setDraft}
                      onSave={onSave}
                      onCancel={cancel}
                      saving={saving}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        <span className="font-medium">{role.name}</span>
                        <code className="text-sm text-white/40">{role.key}</code>
                      </span>
                      <span className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            startEdit(
                              { kind: 'role', id: role.id },
                              { key: role.key, name: role.name, display_order: role.display_order },
                            )
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => remove.mutate(role.id)}
                        >
                          Remove
                        </Button>
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function RoleForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: Record<string, string | number | null>
  setDraft: (patch: Record<string, string | number | null>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const canSave = String(draft.key ?? '').trim() !== '' && String(draft.name ?? '').trim() !== '' && !saving
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Key">
        <Input
          value={String(draft.key ?? '')}
          onChange={(e) => setDraft({ key: e.target.value })}
          placeholder="dorsal"
          className={inputCls}
        />
      </Field>
      <Field label="Name">
        <Input
          value={String(draft.name ?? '')}
          onChange={(e) => setDraft({ name: e.target.value })}
          placeholder="Dorsal ridge"
          className={inputCls}
        />
      </Field>
      <Button onClick={onSave} disabled={!canSave}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="ghost" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  )
}

function GenesSection({ variantId, data }: { variantId: string; data: VariantGenetics }) {
  const create = useCreateGene(variantId)
  const update = useUpdateGene(variantId)
  const remove = useDeleteGene(variantId)
  const { editing, draft, startEdit, setDraft, cancel } = useVariantEditorStore()

  const onSave = () => {
    if (editing?.kind !== 'gene') return
    const input = {
      key: String(draft.key ?? '').trim(),
      name: String(draft.name ?? '').trim(),
      role_id: String(draft.role_id ?? ''),
      display_order: Number(draft.display_order ?? data.genes.length),
    }
    if (editing.id === 'new') {
      create.mutate(input, { onSuccess: cancel })
    } else {
      update.mutate({ geneId: editing.id, input }, { onSuccess: cancel })
    }
  }

  const saving = create.isPending || update.isPending
  const editingGene = editing?.kind === 'gene'
  const hasRoles = data.roles.length > 0

  return (
    <section>
      <SectionHeader title="Genes">
        {!editingGene && (
          <Button
            variant="outline"
            disabled={!hasRoles}
            onClick={() =>
              startEdit(
                { kind: 'gene', id: 'new' },
                { key: '', name: '', role_id: data.roles[0]?.id ?? '', display_order: data.genes.length },
              )
            }
          >
            Add gene
          </Button>
        )}
      </SectionHeader>

      {!hasRoles && <p className="mb-3 text-sm text-amber-300/80">Add a role before defining genes.</p>}

      {editingGene && editing.id === 'new' && (
        <GeneForm
          draft={draft}
          setDraft={setDraft}
          roles={data.roles}
          onSave={onSave}
          onCancel={cancel}
          saving={saving}
        />
      )}

      <div className="space-y-4">
        {data.genes.map((gene) => {
          const rowEditing = isEditing(editing, { kind: 'gene', id: gene.id })
          const role = data.roles.find((r) => r.id === gene.role_id)
          const geneAlleles = data.alleles.filter((a) => a.gene_id === gene.id)
          return (
            <div key={gene.id} className="rounded-lg border border-white/10 bg-[#3a3a3a]">
              <div className="border-b border-white/5 px-4 py-3">
                {rowEditing ? (
                  <GeneForm
                    draft={draft}
                    setDraft={setDraft}
                    roles={data.roles}
                    onSave={onSave}
                    onCancel={cancel}
                    saving={saving}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <span className="font-medium">{gene.name}</span>
                      <code className="text-sm text-white/40">{gene.key}</code>
                      <span className="text-sm text-white/40">
                        role: {role ? role.name : <span className="text-red-400">unbound</span>}
                      </span>
                      {geneAlleles.length === 0 && (
                        <span className="text-sm text-amber-300/80">no alleles</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          startEdit(
                            { kind: 'gene', id: gene.id },
                            {
                              key: gene.key,
                              name: gene.name,
                              role_id: gene.role_id,
                              display_order: gene.display_order,
                            },
                          )
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => remove.mutate(gene.id)}
                      >
                        Remove
                      </Button>
                    </span>
                  </div>
                )}
              </div>
              <AlleleList
                variantId={variantId}
                gene={gene}
                alleles={geneAlleles}
                filaments={data.filaments}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function GeneForm({
  draft,
  setDraft,
  roles,
  onSave,
  onCancel,
  saving,
}: {
  draft: Record<string, string | number | null>
  setDraft: (patch: Record<string, string | number | null>) => void
  roles: DragonRole[]
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const canSave =
    String(draft.key ?? '').trim() !== '' &&
    String(draft.name ?? '').trim() !== '' &&
    String(draft.role_id ?? '') !== '' &&
    !saving
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Key">
        <Input
          value={String(draft.key ?? '')}
          onChange={(e) => setDraft({ key: e.target.value })}
          placeholder="dorsal"
          className={inputCls}
        />
      </Field>
      <Field label="Name">
        <Input
          value={String(draft.name ?? '')}
          onChange={(e) => setDraft({ name: e.target.value })}
          placeholder="Dorsal colour"
          className={inputCls}
        />
      </Field>
      <Field label="Role">
        <select
          value={String(draft.role_id ?? '')}
          onChange={(e) => setDraft({ role_id: e.target.value })}
          className={selectCls}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <Button onClick={onSave} disabled={!canSave}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="ghost" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  )
}

function AlleleList({
  variantId,
  gene,
  alleles,
  filaments,
}: {
  variantId: string
  gene: DragonGene
  alleles: DragonAllele[]
  filaments: FilamentColor[]
}) {
  const create = useCreateAllele(variantId)
  const update = useUpdateAllele(variantId)
  const remove = useDeleteAllele(variantId)
  const { editing, draft, startEdit, setDraft, cancel } = useVariantEditorStore()

  const onSave = () => {
    if (editing?.kind !== 'allele' || editing.geneId !== gene.id) return
    const input = {
      key: String(draft.key ?? '').trim(),
      name: String(draft.name ?? '').trim(),
      dominance_rank: Number(draft.dominance_rank ?? 1),
      frequency: Number(draft.frequency ?? 1),
      filament_color_id: String(draft.filament_color_id ?? ''),
    }
    if (editing.id === 'new') {
      create.mutate({ geneId: gene.id, input }, { onSuccess: cancel })
    } else {
      update.mutate({ alleleId: editing.id, input }, { onSuccess: cancel })
    }
  }

  const saving = create.isPending || update.isPending
  const addingHere = editing?.kind === 'allele' && editing.geneId === gene.id && editing.id === 'new'

  return (
    <div className="px-4 py-3">
      <ul className="space-y-1">
        {alleles.map((allele) => {
          const rowEditing = isEditing(editing, { kind: 'allele', geneId: gene.id, id: allele.id })
          const filament = filaments.find((f) => f.id === allele.filament_color_id)
          return (
            <li key={allele.id}>
              {rowEditing ? (
                <AlleleForm
                  draft={draft}
                  setDraft={setDraft}
                  filaments={filaments}
                  onSave={onSave}
                  onCancel={cancel}
                  saving={saving}
                />
              ) : (
                <div className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                  <span className="flex items-center gap-3 text-sm">
                    <span
                      className="h-5 w-5 rounded border border-white/20"
                      style={{ backgroundColor: filament?.hex ?? '#000' }}
                    />
                    <span className="font-medium">{allele.name}</span>
                    <code className="text-white/40">{allele.key}</code>
                    <span className="text-white/40">dom {allele.dominance_rank}</span>
                    <span className="text-white/40">freq {allele.frequency}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startEdit(
                          { kind: 'allele', geneId: gene.id, id: allele.id },
                          {
                            key: allele.key,
                            name: allele.name,
                            dominance_rank: allele.dominance_rank,
                            frequency: allele.frequency,
                            filament_color_id: allele.filament_color_id,
                          },
                        )
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => remove.mutate(allele.id)}
                    >
                      Remove
                    </Button>
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {addingHere ? (
        <div className="mt-2">
          <AlleleForm
            draft={draft}
            setDraft={setDraft}
            filaments={filaments}
            onSave={onSave}
            onCancel={cancel}
            saving={saving}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-white/60"
          disabled={filaments.length === 0}
          onClick={() =>
            startEdit(
              { kind: 'allele', geneId: gene.id, id: 'new' },
              {
                key: '',
                name: '',
                dominance_rank: 1,
                frequency: 1,
                filament_color_id: filaments[0]?.id ?? '',
              },
            )
          }
        >
          + Add allele
        </Button>
      )}
    </div>
  )
}

function AlleleForm({
  draft,
  setDraft,
  filaments,
  onSave,
  onCancel,
  saving,
}: {
  draft: Record<string, string | number | null>
  setDraft: (patch: Record<string, string | number | null>) => void
  filaments: FilamentColor[]
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const canSave =
    String(draft.key ?? '').trim() !== '' &&
    String(draft.name ?? '').trim() !== '' &&
    String(draft.filament_color_id ?? '') !== '' &&
    !saving
  const selected = filaments.find((f) => f.id === String(draft.filament_color_id ?? ''))
  return (
    <div className="flex flex-wrap items-end gap-3 rounded bg-white/5 p-3">
      <Field label="Key">
        <Input
          value={String(draft.key ?? '')}
          onChange={(e) => setDraft({ key: e.target.value })}
          placeholder="dorsal-red"
          className={inputCls}
        />
      </Field>
      <Field label="Name">
        <Input
          value={String(draft.name ?? '')}
          onChange={(e) => setDraft({ name: e.target.value })}
          className={inputCls}
        />
      </Field>
      <Field label="Dominance">
        <Input
          type="number"
          value={String(draft.dominance_rank ?? 1)}
          onChange={(e) => setDraft({ dominance_rank: Number(e.target.value) })}
          className={cn(inputCls, 'w-24')}
        />
      </Field>
      <Field label="Frequency">
        <Input
          type="number"
          step="0.1"
          value={String(draft.frequency ?? 1)}
          onChange={(e) => setDraft({ frequency: Number(e.target.value) })}
          className={cn(inputCls, 'w-24')}
        />
      </Field>
      <Field label="Filament">
        <div className="flex items-center gap-2">
          <span
            className="h-8 w-8 shrink-0 rounded border border-white/20"
            style={{ backgroundColor: selected?.hex ?? '#000' }}
          />
          <select
            value={String(draft.filament_color_id ?? '')}
            onChange={(e) => setDraft({ filament_color_id: e.target.value })}
            className={selectCls}
          >
            {filaments.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </Field>
      <Button onClick={onSave} disabled={!canSave}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="ghost" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
    </div>
  )
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-white/50">{label}</Label>
      {children}
    </div>
  )
}

const inputCls = 'bg-[#4a4a4a] text-white border-white/10'
const selectCls =
  'h-9 rounded-md border border-white/10 bg-[#4a4a4a] px-3 text-sm text-white outline-none'
