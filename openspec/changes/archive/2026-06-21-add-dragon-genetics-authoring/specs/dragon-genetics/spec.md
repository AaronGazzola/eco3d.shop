# Dragon genetics — admin authoring (delta)

## ADDED Requirements

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
