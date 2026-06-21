# Add dragon genetics authoring — variants, genes, filaments (Foundation C)

## Why

Foundations A (data) and B (engine + render) are shipped, but the genetics and filament rows only
exist because a seed script writes them — there is no way for the owner to author a variant's colour
genetics or manage the colour/filament palette. C adds the admin UI for exactly that: define a
variant's roles, genes, and alleles (with dominance + frequency + filament binding), and manage the
`filament_colors` palette (the colours and the filaments that produce them). This is the "admin UIs"
half of AZ-94 Section 1; it is split so each piece stays small — **this change is the forms-based
genetics + palette authoring**, with **role tagging** (the 3D component→region tool + model creation,
per stage) and the **orderability map** as the two follow-up changes.

## What Changes

- **New admin section** `app/admin/dragons/`, gated by the existing `AdminFrame` / `useIsStudioAdmin`
  (no middleware — gating via the admin hook, per project rules).
- **Colour/filament palette manager**: list, add, and edit `filament_colors` (the colour by hex + the
  filament that produces it) — the palette that alleles bind to.
- **Variant genetics editor**: CRUD a `dragon_variants` row (key, name, `max_print_colors`); manage its
  `dragon_roles`; its `dragon_genes` (each bound to one role); and each gene's `dragon_alleles`
  (`key`, `name`, `dominance_rank`, `frequency`, and the `filament_color_id` binding).
- **Server actions** (Supabase server client, `auth.getUser()` + admin check before every write) +
  **react-query hooks** + a small **zustand store** for editor state.

Out of scope (→ follow-up changes): the 3D **role-tagging** UI and `(variant, stage)` **model
creation** (`add-dragon-role-tagging`); the **orderability map** (`add-dragon-orderability-map`);
breeding/growth/mutations (AZ-9x).

## Impact

- **Specs:** `dragon-genetics` — add admin-authoring requirements.
- **Code:** new `app/admin/dragons/` route(s) + `page.actions.ts` / `page.hooks.tsx` / `page.stores.ts`
  / `page.types.ts`; an admin nav entry.
- **Reuses unchanged:** A's schema + RLS (admin-write already enforced), B's engine for any in-UI
  colour preview, `AdminFrame` for gating. The seed script stays as a convenience but is no longer the
  only way to create genetics.
