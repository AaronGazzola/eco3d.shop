# Dragon genetics — data model (delta)

## ADDED Requirements

### Requirement: Filament color palette with availability

The system SHALL store a global palette of `filament_colors` (name + hex), each flagged `available`,
representing the real, changeable supply of printable filaments. A filament SHALL NOT be deletable
while an allele is bound to it; discontinuation is expressed by setting `available = false`.

#### Scenario: Discontinue without deletion

- **WHEN** an admin retires a filament that an allele is bound to
- **THEN** the filament row is flagged `available = false` rather than deleted, and the delete is
  rejected by the binding constraint so no allele is left dangling

### Requirement: Variants own their roles and genes

The system SHALL store `dragon_variants` (clades, e.g. `cyber`, `fire`), each owning its own
`dragon_roles` (part-class taxonomy: dorsal/belly/eyes/horn/…) and `dragon_genes`, with a nullable
`max_print_colors` ceiling. Roles and genes SHALL be scoped to a single variant.

#### Scenario: Roles and genes are per-variant

- **WHEN** two variants are created
- **THEN** each variant has its own independent set of roles and genes, and a role/gene key is unique
  only within its variant

### Requirement: A gene colors exactly one role

Each `dragon_genes` row SHALL reference exactly one `dragon_roles` row (the role it colors), within the
same variant. Deleting a role that a gene references SHALL be rejected.

#### Scenario: Gene bound to a role

- **WHEN** a gene is created for a variant
- **THEN** it references one role of that variant, and that role cannot be deleted while the gene
  references it

### Requirement: Alleles carry dominance, frequency, and a filament binding

Each `dragon_alleles` row SHALL belong to one gene and store a `dominance_rank`, a `frequency`, and a
**binding to one `filament_colors` row**. The binding SHALL be editable so an allele can be re-pointed
at a different filament without altering any genotype.

#### Scenario: Rebind an allele to a new filament

- **WHEN** an allele's `filament_color_id` is changed to a different available filament
- **THEN** the allele now resolves to the new color, and no `dragons.genotype` value is modified

### Requirement: Stage models hold geometry and role tags per (variant, stage)

The system SHALL store `dragon_models`, one per unique `(variant, stage)` where `stage ∈
{egg, baby, adult, winged}`, each holding the stage geometry (`stl_key` + rig `groups`, same shape as
`model_configs`) and a `role_tags` map from segment id to a role of that variant.

#### Scenario: One model per variant-stage

- **WHEN** a model already exists for `(cyber, baby)`
- **THEN** a second `(cyber, baby)` model is rejected by the uniqueness constraint, and segment ids in
  its `role_tags` map to roles defined on the `cyber` variant

### Requirement: A dragon is a persisted entity of variant, stage, and a diploid genotype

The system SHALL store `dragons`, each with a `variant`, a `stage` (default `egg`), and a `genotype`
stored as jsonb that maps each gene key to a **pair of stable allele ids** (diploid). Genotypes SHALL
reference alleles by id only — never by raw color — so the allele→filament binding is the single source
of a dragon's colors.

#### Scenario: Round-trip a dragon

- **WHEN** a dragon is inserted with a diploid genotype and read back
- **THEN** its variant, stage, and the per-gene allele-id pairs are returned unchanged, and none of the
  stored values is a color

#### Scenario: Genotype survives a filament change

- **WHEN** a filament bound to an allele in a dragon's genotype is discontinued and the allele is
  rebound to a replacement filament
- **THEN** the dragon's stored `genotype` is unchanged in value — the same gene→allele-id pairs (the
  color change is entirely in the allele→filament binding; jsonb need not preserve key order)

### Requirement: Access control split between authored definitions and owned dragons

The six admin-authored definition tables SHALL be readable by everyone and writable only by admins, so
that any visitor can read the variant, roles, genes, alleles, and stage model needed to render a
dragon. The `dragons` table SHALL be owner-scoped, so a user reads and writes only their own dragons.

#### Scenario: Public read of definitions, owner-scoped dragons

- **WHEN** any visitor loads a dragon
- **THEN** they can read the variant/roles/genes/alleles/model needed to render it, but can only read
  and write `dragons` rows they own
