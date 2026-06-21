# Design — Dragon genetics data model (Foundation A)

## Context

AZ-94 proposes a creature game on the printable dragon models where **color is the only heritable
axis**. The renderer today colors per **rig group** (`BodyGroup`: head/spine/tail/legs, one material
each — `app/admin/_lib/types.ts`, `app/game/AnimatedModel.tsx`); the printable building blocks are the
**STL segments** (`SegmentData`, ids `seg-N`). There is no species/stage/genotype concept anywhere.

This change introduces only the **data contract**. Every decision below is about *storage shape*, not
computation — dominance resolution, rendering, rolls, and UI are deliberately deferred to B/C so this
change stays small and independently verifiable (migration applies, types generate, a script can
round-trip a dragon).

## Decisions

1. **Three orthogonal axes → separate columns/tables.** `variant` (clade) and `stage` are stored on
   the dragon and on `dragon_models`; `genotype` rides on the dragon. Keeping them orthogonal is what
   lets winged / new clades / deeper genetics land later without touching the foundation (AZ-94).

2. **Roles are their own taxonomy, not rig groups.** `dragon_roles` (per variant) tags segments into
   part-classes (dorsal/belly/eyes/horn) independently of the mechanical `BodyGroup`s — the eye blocks
   are mechanically part of the head body but are their own color role. Confirmed with the user: roles
   (and genes) are defined **per variant**, since `cyber` and `fire` genuinely differ in geometry.
   Roles carry only identity now; their future "behavior" semantics (AZ-100) layer on later.

3. **Gene ↔ role is 1:1 for v1, but modelled as distinct rows.** `dragon_genes.role_id` references the
   one role a gene colors. Distinct tables keep the door open for many-to-many (pleiotropy/polygeny)
   later without a schema break.

4. **Alleles carry dominance + frequency + the filament binding.** `dragon_alleles` has
   `dominance_rank` (int; higher wins — the engine in B resolves expression, A only stores it),
   `frequency` (float, for B's weighted roll), and `filament_color_id` → `filament_colors`. Dominance
   is genuinely needed (it is the Mendelian teaching point) — but *computing* it is B's job; A just
   records the rank.

5. **Genotype is jsonb of stable allele ids, not normalized rows.** `dragons.genotype` =
   `{ "<gene_key>": ["<allele_id_a>", "<allele_id_b>"] }` — a diploid pair per gene. jsonb because the
   genotype is always read/written whole, gene count varies per variant, and it stays portable for
   breeding (AZ-96). Trade-off: Postgres can't FK into jsonb, so allele-id integrity inside a genotype
   is **application-enforced** (B/C validate against `dragon_alleles`). Accepted — it mirrors the
   existing `model_configs.groups` jsonb pattern.

6. **Allele→filament is an editable binding, the discontinuation answer.** Because the genotype holds
   allele ids (not colors), discontinuing a filament = set `filament_colors.available = false` and
   point the affected alleles' `filament_color_id` at a replacement. Genotypes never change; dragons
   re-render in the new color. `filament_colors` rows are therefore **never deleted while bound** (FK
   `on delete restrict`); availability is a flag.

7. **Stage geometry mirrors `model_configs`, in its own admin-authored table.** `dragon_models` holds
   `stl_key` + rig `groups` (identical shape to `model_configs`) plus `role_tags` (segment id → role).
   Separate from the user-scoped `model_configs` sandbox because stage models are canonical,
   admin-authored content. `unique(variant_id, stage)`. The *same* dragon genotype paints the *same*
   roles across a variant's stage models → consistent look as it grows.

8. **RLS split.** Definition tables (`filament_colors`, `dragon_variants`, `dragon_roles`,
   `dragon_genes`, `dragon_alleles`, `dragon_models`) are **public read / admin write** (everyone must
   read them to render a dragon; only admins author). `dragons` is **owner-scoped** (`user_id`), with
   `user_id` nullable reserved for future unowned "wild" dragons (AZ-99) — for this change a dragon is
   always owned by its creator.

9. **`max_print_colors` lives on the variant now, enforced later.** Stored on `dragon_variants`
   (nullable = unlimited) so C's orderability map and print-limit checks have a home; A only stores it.

## Open questions

None blocking A. Deferred-by-design and tracked elsewhere: dominance/codominance resolution rules (B),
weighted-roll + mutation frequency semantics (B / AZ-98), orderability enumeration and the print-limit
check (C), cross-variant genotype translation (AZ-96), default-stage policy for rolled dragons (B —
the `dragons.stage` column defaults to `egg` but any stage is insertable for authoring/testing).

## Schema sketch (authoritative shape; SQL written via `supabase migration new`)

```
type dragon_stage = enum('egg','baby','adult','winged')

filament_colors(id pk, name text, hex text, available bool default true,
                brand text null, sku text null, created_at, updated_at)

dragon_variants(id pk, key text unique, name text, description text null,
                max_print_colors int null, created_at, updated_at)

dragon_roles(id pk, variant_id fk→dragon_variants on delete cascade,
             key text, name text, display_order int default 0,
             unique(variant_id, key))

dragon_genes(id pk, variant_id fk→dragon_variants on delete cascade,
             role_id fk→dragon_roles on delete restrict,
             key text, name text, display_order int default 0,
             unique(variant_id, key))

dragon_alleles(id pk, gene_id fk→dragon_genes on delete cascade,
               filament_color_id fk→filament_colors on delete restrict,
               key text, name text, dominance_rank int default 0,
               frequency real default 1, created_at, updated_at,
               unique(gene_id, key))

dragon_models(id pk, variant_id fk→dragon_variants on delete cascade,
              stage dragon_stage, stl_key text, groups jsonb default '[]',
              role_tags jsonb default '{}', model_rotation float4[] default '{0,0,0}',
              created_at, updated_at, unique(variant_id, stage))

dragons(id pk, user_id fk→auth.users null, variant_id fk→dragon_variants on delete restrict,
        stage dragon_stage default 'egg', name text null,
        genotype jsonb not null default '{}', created_at, updated_at)
```
