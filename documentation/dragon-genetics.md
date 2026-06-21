# Dragon genetics — data model (Foundation A)

Status: **landed** (migration `20260621095524_dragon_genetics_data_model` pushed; OpenSpec change
`add-dragon-genetics-data-model`). Part of the AZ-94 creature-game layer, Section 1 (color-genotype
representation). This change is the **data contract only** — no genetics computation, rendering, or UI.

## The model

A dragon = three orthogonal axes:

- **variant** (clade, e.g. `cyber`/`fire`) — sculpted set; owns its roles and genes.
- **stage** (`egg → baby → adult → winged`) — `dragon_stage` enum.
- **color genotype** — the heritable axis, stored on the dragon.

### Tables

| table | purpose |
|-------|---------|
| `filament_colors` | global, mutable filament supply; `available` flag (discontinue = flag, never delete) |
| `dragon_variants` | clade; `max_print_colors` ceiling |
| `dragon_roles` | per-variant part-class taxonomy (dorsal/belly/eyes/horn), independent of rig groups |
| `dragon_genes` | per-variant color locus; 1 gene ↔ 1 role (v1) |
| `dragon_alleles` | per-gene variants; `dominance_rank`, `frequency`, and the editable `filament_color_id` binding |
| `dragon_models` | one per `(variant, stage)`; geometry (`stl_key` + `groups`) + `role_tags` (segment id → role key) |
| `dragons` | the persisted individual: `variant`, `stage`, diploid `genotype` jsonb |

`genotype` shape: `{ "<gene_key>": ["<allele_id_a>", "<allele_id_b>"] }`.

### Load-bearing decision — stable allele ids

Genotypes store **abstract allele ids, never colors**. The `allele → filament_colors` binding is
editable, so a discontinued filament is handled by **rebinding the allele** — every affected dragon
re-renders in the new color with **zero genotype migration**. Allele-id integrity inside a genotype is
application-enforced (jsonb can't FK); jsonb also does not preserve top-level key order, so compare
genotypes by value.

### Access

Definition tables = public read / admin write (via `is_admin()`); `dragons` = owner-scoped.

## What's next

- **B — genetics engine & render:** diploid + dominance (`dominance_rank`) → per-role colors painted
  on the loaded stage-model; "roll a random dragon" (weighted by `frequency`); read-side queries.
- **C — admin authoring UIs:** role tagging, genetics/dominance definition, filament management
  (discontinue + rebind), orderability map (enumerate printable phenotypes vs `max_print_colors`).

Deferred threads: AZ-96 breeding, AZ-97 growth, AZ-98 mutations, AZ-99 selection/population,
AZ-100 traits & conditional color expression.

Domain types: `app/game/dragons.types.ts`. Round-trip check: `scripts/verify-dragon-genetics.ts`
(`doppler run -- npx tsx scripts/verify-dragon-genetics.ts`).
