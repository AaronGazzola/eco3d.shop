# Dragon genetics — engine & render (delta)

## ADDED Requirements

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
