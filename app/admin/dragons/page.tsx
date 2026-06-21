'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AdminGate } from '../_lib/AdminGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useCreateFilamentColor,
  useCreateVariant,
  useFilamentColors,
  useUpdateFilamentColor,
  useVariants,
} from './page.hooks'
import { useDragonsPageStore } from './page.stores'

export default function DragonsAdminPage() {
  return (
    <AdminGate title="Genetics authoring">
      <div className="space-y-12">
        <VariantsSection />
        <PaletteSection />
      </div>
    </AdminGate>
  )
}

function VariantsSection() {
  const { data: variants, isLoading } = useVariants()
  const createVariant = useCreateVariant()
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [maxColors, setMaxColors] = useState('4')

  const onCreate = () => {
    createVariant.mutate(
      {
        key: key.trim(),
        name: name.trim(),
        max_print_colors: maxColors.trim() === '' ? null : Number(maxColors),
        description: null,
      },
      {
        onSuccess: () => {
          setKey('')
          setName('')
          setMaxColors('4')
        },
      },
    )
  }

  const canCreate = key.trim() !== '' && name.trim() !== '' && !createVariant.isPending

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Variants</h2>
      <div className="rounded-lg border border-white/10 bg-[#3a3a3a]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        ) : variants && variants.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {variants.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/admin/dragons/${v.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium">{v.name}</span>
                  <span className="flex items-center gap-3 text-sm text-white/40">
                    <code className="text-white/50">{v.key}</code>
                    <span>max {v.max_print_colors ?? '—'} colours</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-white/40">No variants yet.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-[#333333] p-4">
        <Field label="Key">
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="cyber"
            className="bg-[#4a4a4a] text-white border-white/10"
          />
        </Field>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cyber Dragon"
            className="bg-[#4a4a4a] text-white border-white/10"
          />
        </Field>
        <Field label="Max print colours">
          <Input
            type="number"
            min={1}
            value={maxColors}
            onChange={(e) => setMaxColors(e.target.value)}
            className="w-32 bg-[#4a4a4a] text-white border-white/10"
          />
        </Field>
        <Button onClick={onCreate} disabled={!canCreate}>
          {createVariant.isPending ? 'Creating…' : 'Create variant'}
        </Button>
      </div>
    </section>
  )
}

function PaletteSection() {
  const { data: colors, isLoading } = useFilamentColors()
  const createColor = useCreateFilamentColor()
  const updateColor = useUpdateFilamentColor()
  const {
    filamentEditing,
    filamentDraft,
    startNewFilament,
    startEditFilament,
    setFilamentDraft,
    cancelFilament,
  } = useDragonsPageStore()

  const onSave = () => {
    const input = {
      name: filamentDraft.name.trim(),
      hex: filamentDraft.hex.trim(),
      brand: filamentDraft.brand?.trim() || null,
      sku: filamentDraft.sku?.trim() || null,
    }
    if (filamentEditing === 'new') {
      createColor.mutate(input, { onSuccess: cancelFilament })
    } else if (filamentEditing) {
      updateColor.mutate({ id: filamentEditing, input }, { onSuccess: cancelFilament })
    }
  }

  const saving = createColor.isPending || updateColor.isPending
  const canSave = filamentDraft.name.trim() !== '' && /^#[0-9a-fA-F]{6}$/.test(filamentDraft.hex) && !saving

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Colour / filament palette</h2>
        {filamentEditing === null && (
          <Button variant="outline" onClick={startNewFilament}>
            Add colour
          </Button>
        )}
      </div>

      {filamentEditing !== null && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-[#333333] p-4">
          <Field label="Colour">
            <input
              type="color"
              value={filamentDraft.hex}
              onChange={(e) => setFilamentDraft({ hex: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </Field>
          <Field label="Hex">
            <Input
              value={filamentDraft.hex}
              onChange={(e) => setFilamentDraft({ hex: e.target.value })}
              className="w-28 bg-[#4a4a4a] text-white border-white/10"
            />
          </Field>
          <Field label="Name">
            <Input
              value={filamentDraft.name}
              onChange={(e) => setFilamentDraft({ name: e.target.value })}
              placeholder="Galaxy Black"
              className="bg-[#4a4a4a] text-white border-white/10"
            />
          </Field>
          <Field label="Brand">
            <Input
              value={filamentDraft.brand ?? ''}
              onChange={(e) => setFilamentDraft({ brand: e.target.value })}
              className="bg-[#4a4a4a] text-white border-white/10"
            />
          </Field>
          <Field label="SKU">
            <Input
              value={filamentDraft.sku ?? ''}
              onChange={(e) => setFilamentDraft({ sku: e.target.value })}
              className="bg-[#4a4a4a] text-white border-white/10"
            />
          </Field>
          <Button onClick={onSave} disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" onClick={cancelFilament} disabled={saving}>
            Cancel
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#3a3a3a]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        ) : colors && colors.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {colors.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-6 w-6 rounded border border-white/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="font-medium">{c.name}</span>
                  <code className="text-sm text-white/40">{c.hex}</code>
                  {c.brand && <span className="text-sm text-white/40">{c.brand}</span>}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(filamentEditing === c.id && 'text-white')}
                  onClick={() =>
                    startEditFilament(c.id, {
                      name: c.name,
                      hex: c.hex,
                      brand: c.brand,
                      sku: c.sku,
                    })
                  }
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-white/40">No colours yet.</p>
        )}
      </div>
    </section>
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
