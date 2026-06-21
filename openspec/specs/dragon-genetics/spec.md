# dragon-genetics Specification

## Purpose
TBD - created by archiving change add-dragon-genetics-data-model. Update Purpose after archive.
## Requirements
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

### Requirement: Genotype resolves to one color per role by dominance

The system SHALL resolve a dragon's diploid genotype to a phenotype — a map from role key to a single
filament color — by selecting, for each gene, the allele of the pair with the greater `dominance_rank`
and taking that allele's bound filament color.

#### Scenario: Dominant allele is expressed

- **WHEN** a gene's allele pair has ranks 2 (red) and 1 (dark)
- **THEN** the gene's role resolves to the red filament's color, and the dark allele is carried but not
  shown

### Requirement: Ties break deterministically with no codominant blend

When a gene's two alleles share the same `dominance_rank`, the system SHALL express the allele with the
lexicographically smaller `key` and SHALL resolve the role to that single allele's filament color — it
SHALL NOT blend or average the two colors.

#### Scenario: Equal-rank pair picks one real filament

- **WHEN** a gene's allele pair has equal `dominance_rank`
- **THEN** exactly one of the two alleles' filament colors is used (the smaller-key allele), never a
  mixed or averaged color

### Requirement: Random genotype roll is diploid and frequency-weighted

The system SHALL produce a random genotype by drawing, for each gene, two independent alleles weighted
by allele `frequency`, using only the gene's normal allele set.

#### Scenario: Roll yields a valid diploid genotype

- **WHEN** a random dragon is rolled for a variant
- **THEN** every gene of that variant has a pair of allele ids drawn from its own alleles, and higher-
  frequency alleles appear more often across many rolls

### Requirement: Components are rendered by their role color

The renderer SHALL paint each model component (segment) with the resolved color of the role assigned to
it by the model's `role_tags`; components without a role tag SHALL fall back to a neutral color. All
components sharing a role SHALL show the same color.

#### Scenario: A role's components all share its color

- **WHEN** a dragon is rendered and several segments are tagged `dorsal`
- **THEN** every `dorsal` segment shows the dorsal gene's resolved color, and a segment with no role tag
  shows the neutral fallback

### Requirement: The same genotype expresses consistently across stages

For a given genotype, the system SHALL produce the same per-role colors regardless of which stage model
is rendered, so a dragon looks consistent as it grows.

#### Scenario: Egg and adult share role colors

- **WHEN** the same genotype is rendered on the `egg` model and the `adult` model of a variant
- **THEN** each role present in both models resolves to the same color in both

### Requirement: Admins can manage the colour/filament palette

The admin UI SHALL let an admin list, add, and edit `filament_colors` rows (a colour, given by its hex,
and the filament that produces it). These rows are the palette that alleles bind to.

#### Scenario: Add and edit a palette colour

- **WHEN** an admin adds a colour with its hex/filament and later edits it
- **THEN** the row persists and the change is reflected wherever that colour is shown or bound

### Requirement: Admins can author a variant's genetics

The admin UI SHALL let an admin create and edit a `dragon_variants` row (key, name, `max_print_colors`)
and manage its `dragon_roles`, its `dragon_genes` (each bound to one of the variant's roles), and each
gene's `dragon_alleles` (key, name, `dominance_rank`, `frequency`, and the bound filament).

#### Scenario: Author a complete variant

- **WHEN** an admin creates a variant and adds roles, genes bound to those roles, and alleles bound to
  filaments
- **THEN** the rows persist and the resulting genes/alleles are usable by the render engine to resolve a
  genotype for that variant

### Requirement: Authoring is restricted to admins

Every write in the authoring UI SHALL be gated: the page content is shown only to admins
(`useIsStudioAdmin`) and each mutating action SHALL verify the caller is an admin before writing.

#### Scenario: Non-admin cannot author

- **WHEN** a non-admin opens the authoring section or a write action is invoked without an admin session
- **THEN** the UI does not render the editor and the action refuses the write

### Requirement: Authoring edits are reflected in rendering

Changes made through the authoring UI SHALL take effect in the render path on reload, so editing an
allele's dominance, frequency, or filament binding changes the colours a dragon of that variant resolves
to.

#### Scenario: Edited dominance changes the rendered colour

- **WHEN** an admin raises a recessive allele's `dominance_rank` above its partner and the variant is
  re-rendered
- **THEN** the previously hidden allele's colour is now the one expressed for that role

### Requirement: Admins can create a stage model for a variant

The admin UI SHALL let an admin create a `dragon_models` row for a `(variant, stage)` pair by sourcing
geometry from an existing `model_config` (its `stl_key`, rig `groups`, and `model_rotation` are copied
onto the new model). Creation is restricted to admins.

#### Scenario: Create a model from a saved configuration

- **WHEN** an admin picks a variant, a stage, and a saved `model_config`, and confirms creation
- **THEN** a `dragon_models` row is persisted for that `(variant, stage)` carrying the configuration's
  `stl_key`, `groups`, and `model_rotation`, and it appears in the variant's list of stage models

#### Scenario: Non-admin cannot create a model

- **WHEN** a model-creation action is invoked without an admin session
- **THEN** the action refuses the write and no row is created

### Requirement: Admins can tag a model's segments to roles

The admin UI SHALL render a model's geometry as selectable 3D segments and let an admin assign one or
more selected segments to one of the variant's roles, building a `role_tags` map of `segmentId →
roleKey`. Untagged segments SHALL be visually distinct from tagged ones, and each role SHALL have a
distinct colour in the canvas so coverage is visible.

#### Scenario: Assign segments to a role

- **WHEN** an admin selects one or more segments and assigns them to a role
- **THEN** those segments are recorded as tagged to that role and painted that role's colour

#### Scenario: Re-tag a segment to a different role

- **WHEN** an admin assigns an already-tagged segment to a different role
- **THEN** the segment's role in the map is replaced with the new role

#### Scenario: Untag a segment

- **WHEN** an admin removes a segment's tag
- **THEN** the segment no longer appears in `role_tags` and renders as untagged

### Requirement: Tagging is persisted and reflected in rendering

The admin UI SHALL persist the edited `role_tags` to the `dragon_models` row through an admin-gated
action, and the saved tags SHALL be used by the render path so the model paints each role's resolved
colour.

#### Scenario: Saved tags drive the rendered colours

- **WHEN** an admin saves a model's `role_tags` and the variant is re-rendered
- **THEN** each tagged segment is painted the colour its role resolves to for the rendered genotype

#### Scenario: Edits replace prior tags on reload

- **WHEN** an admin reopens a previously saved model
- **THEN** the canvas shows the persisted `role_tags` as the starting state for further editing

