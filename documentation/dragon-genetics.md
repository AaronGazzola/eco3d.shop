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

## Foundation B — genetics engine & render (landed)

OpenSpec change `add-dragon-genetics-engine-render`. Makes a stored dragon visible:

- **Engine** (`app/game/dragons.genetics.ts`, pure): `resolveGenotype` expresses the higher-
  `dominance_rank` allele per gene (tie → smaller `key`, no blend) → `{ roleKey: hex }`; `rollGenotype`
  draws a frequency-weighted diploid pair per gene.
- **Render by role** (`app/game/AnimatedModel.tsx` → `PosedDragon`): each group's segments are split by
  their `role_tags` role and painted the resolved colour (untagged → neutral). Self-fits to frame any
  STL. The locomotion studio's per-`BodyGroup` path is untouched.
- **Preview**: `/game/dragons/[variantKey]` (e.g. `/game/dragons/demo`) — loads a variant, rolls a
  genotype, renders it, with stage + "Roll random" controls.
- **Seed**: `scripts/seed-dragon-genetics.ts` writes a `demo` variant (borrowing a real model's
  geometry) so the preview has something to render before the admin UIs (C) exist.

Verified: `scripts/check-dragon-genetics.ts` (engine, no DB) + `scripts/verify-dragon-render.ts`
(DB-backed pipeline) + a headless render of `/game/dragons/demo` showing head/spine/limb/tail in
distinct per-role colours.

## What's next

- **C — admin authoring UIs:** role tagging, genetics/dominance definition, filament management
  (discontinue + rebind), orderability map (enumerate printable phenotypes vs `max_print_colors`).
  Replaces the seed script with real authoring; lets rolled dragons be saved as owned entities.

Deferred threads: AZ-96 breeding, AZ-97 growth, AZ-98 mutations, AZ-99 selection/population,
AZ-100 traits & conditional color expression.

Domain types: `app/game/dragons.types.ts`. A-layer round-trip check:
`scripts/verify-dragon-genetics.ts` (`doppler run -- npx tsx scripts/verify-dragon-genetics.ts`).
