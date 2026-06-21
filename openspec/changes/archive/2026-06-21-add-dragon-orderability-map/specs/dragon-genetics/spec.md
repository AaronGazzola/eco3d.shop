# Dragon genetics — orderability map (delta)

## ADDED Requirements

### Requirement: Enumerate a variant's distinct printable phenotypes

The system SHALL compute, for a variant, the set of distinct phenotypes it can produce — every
combination of one expressed allele per gene, resolved to a `role → hex` map using the same dominance
expression as the render path, deduped so two combinations that resolve to the same `role → hex` map
count as one phenotype. For each distinct phenotype the system SHALL report the number of distinct
filament colours it uses.

#### Scenario: Distinct looks are enumerated with their colour counts

- **WHEN** the orderability analysis runs for a variant with authored genes, alleles, and filament
  bindings
- **THEN** it returns each distinct `role → hex` phenotype once, with the count of distinct filament
  colours that phenotype requires

#### Scenario: Phenotypes sharing a filament across roles count fewer colours

- **WHEN** a phenotype binds two roles to the same filament colour
- **THEN** that shared colour is counted once in the phenotype's distinct-colour count

### Requirement: Flag phenotypes that exceed the print-colour ceiling

The analysis SHALL flag every enumerated phenotype whose distinct-colour count exceeds the variant's
`max_print_colors`, and SHALL summarise how many of the variant's distinct phenotypes are over the
limit. When `max_print_colors` is not set, the analysis SHALL flag nothing and SHALL indicate that no
limit is set rather than implying all phenotypes are within budget.

#### Scenario: Over-budget phenotype is flagged

- **WHEN** a variant's `max_print_colors` is 4 and an enumerated phenotype needs 5 distinct colours
- **THEN** that phenotype is flagged as over the limit and counted in the over-limit summary

#### Scenario: No ceiling set

- **WHEN** a variant has no `max_print_colors`
- **THEN** no phenotype is flagged and the analysis indicates that no limit is set

### Requirement: Bounded enumeration

The analysis SHALL bound the number of phenotypes it enumerates; when a variant's combinations exceed
the bound, it SHALL stop at the bound and report that the enumeration was capped (rather than silently
truncating), including the total it would have produced.

#### Scenario: Very large variant is capped, not silently truncated

- **WHEN** a variant's allele combinations exceed the enumeration bound
- **THEN** the analysis returns a capped result marked as capped, with the would-be total reported

### Requirement: Orderability map is a read-only admin view

The admin UI SHALL present the orderability analysis for a variant as a read-only view (a table of
distinct phenotypes with colour counts and over-limit flags, plus the summary), gated to admins, with
no writes and no schema change.

#### Scenario: Admin views the orderability map

- **WHEN** an admin opens a variant's orderability view
- **THEN** the distinct phenotypes, their colour counts, the over-limit flags, and the summary are
  shown, and nothing is written
