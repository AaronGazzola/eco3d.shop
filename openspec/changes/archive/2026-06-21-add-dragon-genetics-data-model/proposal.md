# Add the dragon genetics data model (Foundation A)

## Why

This is the first build of the **creature-game layer** sketched in Linear **AZ-94** — a collect/breed
game whose heritable axis is **color**, designed so that fixing the geometry (a sculpted set of
printable building blocks) and putting all variation into color keeps every dragon printable *and*
lands genetics on the axis real evolution cares most about.

Per AZ-94 the only thing to spec next is **Section 1: color-genotype representation** — define the
genotype, the genotype→per-part-color mapping, and render/persist a dragon from it, stopping *before*
breeding and selection (where the real ambiguity lives). That section is itself large, so it is split
into three small, sequenced changes:

- **A (this change) — data model & persistence contract.** The Postgres schema + generated types for
  variants, roles, genes, alleles, the filament palette, the (variant × stage) models, and the dragon
  entity. No genetics computation, no rendering, no UI.
- **B — genetics engine & render.** Diploid + dominant/recessive expression → per-role colors, painted
  onto the loaded stage-model; "roll a random dragon"; the read-side queries it needs. *(Future change.)*
- **C — admin authoring UIs.** Role tagging, genetics/dominance definition, filament management
  (incl. discontinue-and-rebind), and the orderability map; the write-side queries. *(Future change.)*

A stands up the data contract every later layer — B, C, and the deferred threads (breeding AZ-96,
growth AZ-97, mutations AZ-98, selection AZ-99, traits AZ-100) — sits on.

## What Changes

A dragon is modelled as **three orthogonal axes**: **variant** (sculpted clade, e.g. `cyber`/`fire`),
**life stage** (`egg → baby → adult → winged`), and **color genotype** (the heritable axis). New
Supabase tables:

- **`filament_colors`** — the global, mutable color supply (name, hex, availability). Discontinuing a
  color flips `available`, never deletes.
- **`dragon_variants`** — one per clade; owns its roles and genes; carries `max_print_colors`.
- **`dragon_roles`** — per-variant part-class taxonomy (dorsal/belly/eyes/horn/…), independent of the
  mechanical rig groups. The color/printing (and later behavior) unit.
- **`dragon_genes`** — per-variant color loci; each gene colors one role (1 gene ↔ 1 role for v1).
- **`dragon_alleles`** — per-gene allele variants, each carrying a **dominance rank**, a **frequency**
  (for rolls), and a **mutable binding to a `filament_colors` row** (the allele→filament binding).
- **`dragon_models`** — one per **(variant, stage)**: the stage geometry (`stl_key` + rig `groups`,
  same shape as `model_configs`) plus **`role_tags`** mapping each segment id → a role.
- **`dragons`** — the persisted individual: `variant`, `stage`, and a **diploid `genotype`** (jsonb:
  per gene, a pair of stable allele ids).

Plus a Postgres enum `dragon_stage`, RLS (admin-authored definition tables = public read / admin write;
`dragons` = owner-scoped), regenerated `supabase/types.ts`, a domain `*.types.ts` constructed from
them, and a verification script that inserts a variant→genes→alleles→model→dragon and reads it back.

**Stable-allele-id design (load-bearing):** genotypes store abstract allele ids, never raw colors, and
a separate editable `allele → filament_colors` binding resolves the color. So a discontinued filament
is handled by **rebinding the allele** — every affected dragon re-renders in the new printable color
with **zero genotype migration**. This directly satisfies AZ-94's "rather dragons changed color than
become unprintable."

Out of scope (→ B/C and the AZ-9x tickets): genotype→phenotype resolution, dominance computation,
rendering, "roll random", the orderability map, any admin UI, breeding, growth process, mutations.

## Impact

- **Specs:** new capability `dragon-genetics` — the data-model requirements.
- **Code:** new Supabase migration(s); regenerated `supabase/types.ts`; a new domain types file; a
  verification script under `scripts/`.
- **Reuses unchanged:** the `model_configs` `groups`/`stl_key` shape (stage geometry mirrors it); the
  STL segment ids (`seg-N`) that `role_tags` key off.
- **No app behavior changes yet** — this is the data contract; B renders from it, C authors it.
