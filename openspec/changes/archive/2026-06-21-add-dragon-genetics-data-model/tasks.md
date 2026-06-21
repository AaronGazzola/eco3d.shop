## 1. Migration — schema

- [x] 1.1 Create the migration with `npx supabase migration new dragon_genetics_data_model` (do not
  hand-author the file path). Add the `dragon_stage` enum `('egg','baby','adult','winged')`.
- [x] 1.2 Create `filament_colors` (id, name, hex, `available` bool default true, brand null, sku null,
  timestamps).
- [x] 1.3 Create `dragon_variants` (id, `key` unique, name, description null, `max_print_colors` int
  null, timestamps).
- [x] 1.4 Create `dragon_roles` (id, `variant_id` fk on delete cascade, key, name, display_order,
  `unique(variant_id, key)`).
- [x] 1.5 Create `dragon_genes` (id, `variant_id` fk on delete cascade, `role_id` fk on delete
  restrict, key, name, display_order, `unique(variant_id, key)`).
- [x] 1.6 Create `dragon_alleles` (id, `gene_id` fk on delete cascade, `filament_color_id` fk on delete
  restrict, key, name, `dominance_rank` int default 0, `frequency` real default 1, timestamps,
  `unique(gene_id, key)`).
- [x] 1.7 Create `dragon_models` (id, `variant_id` fk on delete cascade, `stage` dragon_stage,
  `stl_key`, `groups` jsonb default '[]', `role_tags` jsonb default '{}', `model_rotation` float4[]
  default '{0,0,0}', timestamps, `unique(variant_id, stage)`).
- [x] 1.8 Create `dragons` (id, `user_id` fk → auth.users null, `variant_id` fk on delete restrict,
  `stage` dragon_stage default 'egg', name null, `genotype` jsonb not null default '{}', timestamps).

## 2. Migration — RLS

- [x] 2.1 Enable RLS on all seven tables.
- [x] 2.2 Definition tables (`filament_colors`, `dragon_variants`, `dragon_roles`, `dragon_genes`,
  `dragon_alleles`, `dragon_models`): public `select`; insert/update/delete restricted to admins
  (reuse the existing admin/role check — mirror how `model_configs` policies are written and the
  `profiles.role` enum).
- [x] 2.3 `dragons`: select/insert/update/delete gated on `auth.uid() = user_id`.

## 3. Push + types

- [x] 3.1 `npx supabase db push` the migration to the remote project.
- [x] 3.2 Regenerate `supabase/types.ts` (`npx supabase gen types typescript --project-id <ref>`); the
  seven tables and the `dragon_stage` enum appear in `Database['public']`.

## 4. Domain types

- [x] 4.1 Add a `*.types.ts` for the genetics domain, constructed from the generated Supabase types
  (per CLAUDE.md), exporting: `FilamentColor`, `DragonVariant`, `DragonRole`, `DragonGene`,
  `DragonAllele`, `DragonModel`, `Dragon`, `DragonStage`, and a `Genotype` type
  (`Record<geneKey, [alleleId, alleleId]>`) plus a `RoleTags` type (`Record<segmentId, roleKey>`).
- [x] 4.2 `npx tsc --noEmit` + `npx eslint` pass.

## 5. Verification

- [x] 5.1 Write a throwaway TypeScript script under `scripts/` (run with the project's script pattern,
  not psql) that: inserts a `dragon_variants` row; two `dragon_roles`; two `dragon_genes` (each → a
  role); a `filament_colors` row + two `dragon_alleles` bound to it; a `dragon_models` row for
  `(variant, egg)` with a `role_tags` map; and a `dragons` row with a diploid `genotype`. Then reads
  the dragon back and asserts the genotype round-trips unchanged and holds only allele ids (no colors).
- [x] 5.2 In the same script, prove the discontinuation path: flip the filament `available = false`,
  rebind the alleles to a new filament, and assert the dragon's `genotype` is unchanged.
- [x] 5.3 Assert the binding constraint: attempting to delete a filament still bound to an allele is
  rejected.

## 6. Documentation + validation

- [x] 6.1 Add a short note to `documentation/` (or AZ-94's thread) recording that Foundation A landed
  and pointing B (engine/render) and C (admin UIs) at this schema.
- [x] 6.2 `npx openspec validate add-dragon-genetics-data-model --strict` passes.
