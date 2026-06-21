# Design — Dragon genetics authoring (Foundation C)

## Context

A's tables are admin-write under RLS via `is_admin()`; B reads them to render. Today only
`scripts/seed-dragon-genetics.ts` writes genetics/filament rows. C gives the owner a real authoring UI.
The admin shell already exists: pages under `app/admin/*` gate their content with `AdminFrame`
(`useIsStudioAdmin`), and the studio uses the `*.actions.ts` / `*.hooks.tsx` / `*.stores.ts` split.

C is deliberately the **forms-based** slice. The 3D role-tagging tool and `(variant, stage)` model
creation are a separate change because they are a canvas/interaction surface (like the existing
group-segments page), not a form; the orderability map is analysis. Keeping them apart keeps each spec
small and testable.

## Decisions

1. **One admin section, nested editors.** `app/admin/dragons/` lists variants + a filament manager; a
   variant route (`app/admin/dragons/[variantId]/`) is its genetics editor (roles → genes → alleles).
   Mirrors the existing admin page layout and the `page.actions/hooks/stores/types` convention.

2. **Writes go through actions with an explicit admin check.** Every mutating action calls
   `auth.getUser()` and verifies admin (reuse `app/layout.actions.ts`'s admin check / the `profiles`
   role) before the query — defence in depth on top of RLS, per CLAUDE.md ("validate auth before
   queries"). Reads of these public tables do not gate.

3. **Palette = colours + the filaments that produce them.** The palette manager is plain CRUD over
   `filament_colors` (hex + filament); alleles bind to a palette row. No discontinue/availability flow
   in this change — `filament_colors.available` stays in the schema, unused by the UI for now.

4. **Editor state in zustand; server state in react-query.** Loading/error/persisted data via
   react-query mutations + queries (invalidate on success); transient form/draft state (which
   gene/allele is being edited, unsaved field values) in a `page.stores.ts` zustand store. No `persist`
   (per project rules).

5. **Validation surfaces, not silent coercion.** Duplicate keys (unique within variant/gene) and a gene
   with no alleles — flagged in the UI; errors thrown + `console.error` in actions (no fallbacks), per
   CLAUDE.md.

6. **Reuse B for an inline colour read-out (optional).** Where helpful the editor can call
   `resolveGenotype`/the filament hexes to show swatches, so the author sees the colours an allele set
   produces without leaving the page. No new engine logic.

## Open questions

None blocking. Deferred by design: role tagging + model creation (next change — they own
`dragon_models` / `role_tags`); orderability enumeration + `max_print_colors` enforcement (the map
change); many-to-many gene↔role (kept 1:1 here, schema already allows the future move).

## Surfaces

```
app/admin/dragons/
  page.tsx              variants list + colour/filament palette manager (AdminFrame-gated)
  page.actions.ts       list/create variant; list/add/edit palette colours
  page.hooks.tsx        queries + mutations
  page.stores.ts        filament-editor draft state
  page.types.ts
  [variantId]/
    page.tsx            genetics editor: roles -> genes -> alleles
    page.actions.ts     CRUD roles/genes/alleles for the variant
    page.hooks.tsx
    page.stores.ts      which row is being edited + draft values
    page.types.ts
```
