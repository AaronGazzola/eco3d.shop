## 1. Admin section scaffold

- [ ] 1.1 Add `app/admin/dragons/page.tsx` (the variants list + filament manager), wrapping content in
  the existing `AdminFrame` so only admins see it. Add an admin nav entry pointing to it.
- [ ] 1.2 Add `app/admin/dragons/[variantId]/page.tsx` (the per-variant genetics editor), also
  `AdminFrame`-gated.

## 2. Server actions (admin-gated)

- [ ] 2.1 `app/admin/dragons/page.actions.ts`: list variants; create a variant; list/add/edit
  `filament_colors` (the colour/filament palette). Each mutating action calls `auth.getUser()` and
  verifies admin (reuse the `app/layout.actions.ts` admin check) before writing; throw +
  `console.error` on failure.
- [ ] 2.2 `app/admin/dragons/[variantId]/page.actions.ts`: CRUD for that variant's `dragon_roles`,
  `dragon_genes` (with `role_id`), and `dragon_alleles` (key, name, `dominance_rank`, `frequency`,
  `filament_color_id`). Same admin gate; respect the unique constraints (surface conflicts as errors).

## 3. Hooks + stores

- [ ] 3.1 `page.hooks.tsx` for both routes: react-query queries + mutations, invalidating the relevant
  query keys on success. Loading/error live in the hooks, not the store (per CLAUDE.md).
- [ ] 3.2 `page.stores.ts` (zustand, no `persist`) for transient editor state — which role/gene/allele
  is being edited and its draft field values.
- [ ] 3.3 `page.types.ts` for both routes, constructed from `@/app/game/dragons.types` / the Supabase
  types.

## 4. Colour/filament palette UI

- [ ] 4.1 List palette colours with a swatch; forms to add/edit (hex + filament). Full page UI with
  loading skeletons only on the data-dependent lists (per CLAUDE.md).

## 5. Variant genetics editor UI

- [ ] 5.1 Variant header (key, name, `max_print_colors`) editable; roles list with add/edit/remove.
- [ ] 5.2 Genes list (each with a role picker) and, per gene, its alleles with `dominance_rank`,
  `frequency`, and a filament picker (swatch). Reuse B's filament hexes for swatches.

## 6. Verification

- [ ] 6.1 As an admin, author edits to the seeded `demo` variant (add an allele; change a
  `dominance_rank`; bind an allele to a different palette colour) and confirm B's preview
  (`/game/dragons/demo`) reflects them on reload.
- [ ] 6.2 Confirm gating: a non-admin session does not render the editor and a write action refuses.

## 7. Documentation + validation

- [ ] 7.1 Update `documentation/dragon-genetics.md`: C (authoring) landed; the seed script is now a
  convenience, not the only authoring path; point at the role-tagging + orderability follow-ups.
- [ ] 7.2 `npx tsc --noEmit` + `npx eslint` pass; `npx openspec validate add-dragon-genetics-authoring
  --strict` passes.
