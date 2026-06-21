# Design — Dragon orderability map

## Context

B's `resolveGenotype` already turns a diploid genotype into a `role → hex` phenotype: per gene it
expresses the higher-`dominance_rank` allele (tie → smaller `key`, no blend) and maps the gene's role
to the expressed allele's filament hex. C lets the owner author the genes/alleles/palette. What's
missing is a view over the *space* of outcomes: how many genuinely distinct dragons a variant can
produce and how many filament colours each needs, measured against `max_print_colors`.

## Goals / Non-Goals

**Goals:**
- Enumerate the distinct printable phenotypes for a variant and each one's distinct-colour count.
- Flag phenotypes whose colour count exceeds `max_print_colors`; summarise totals.
- Pure, testable enumeration; read-only UI.

**Non-Goals:**
- Preventing orders / gating rolls / mutating data — purely advisory analysis.
- Probabilities or rarity (frequency-weighted likelihood of each look) — this is about the *set* of
  possible looks, not their odds. Could be a later add.
- Many-to-many gene↔role, breeding, growth (deferred AZ-9x).
- Schema changes — none.

## Decisions

1. **Enumerate one expressed allele per gene (the homozygous representative), not full diploids.** A
   genotype's look is decided by its dominant allele; every allele *can* be the expressed one (pair it
   with itself), and no allele expresses a look its homozygote wouldn't. So the set of achievable looks
   is exactly the cartesian product over genes of `{that gene's alleles}`, each tuple resolved to a
   `role → hex` map. *Why not enumerate full diploid pairs and run `resolveGenotype`?* That's
   `C(n+1,2)` pairs per gene instead of `n`, all collapsing by dominance to the same look set — more
   work, identical output. We reuse the **same expression rule** (the expressed allele *is* the chosen
   allele here, since a homozygote expresses itself), so results match the render path exactly.

2. **Distinct = dedupe by the `role → hex` signature.** Two allele tuples that resolve to the same
   role→hex map are the same *look* (e.g. two alleles bound to the same filament). We key distinct
   phenotypes by a stable signature (roles sorted by key, `roleKey:hex` joined), so the count reflects
   visually distinct dragons, not raw allele combinations.

3. **Colour count = distinct hex values in the phenotype.** The printable-colour metric is the number
   of distinct filaments across roles — shared filaments across roles count once. Flag when
   `colourCount > max_print_colors`.

4. **`max_print_colors` null = no limit.** If a variant has no ceiling set, nothing is flagged; the UI
   says "no limit set" so the absence of flags isn't mistaken for "all fine".

5. **Enumeration guard.** Total combinations = product of allele counts. Cap at a constant (e.g.
   `MAX_ENUM = 5000`); if exceeded, stop and return a `capped: true` marker with the partial set and
   the would-be total, and the UI states the list was capped (no silent truncation, per CLAUDE.md).

6. **Pure function in the engine; read-only page.** The enumeration lives in
   `app/game/dragons.genetics.ts` (pure, no DB) so it's unit-checkable headlessly and reused anywhere.
   The page loads the variant's roles/genes/alleles/filaments (reusing the existing variant-bundle/
   genetics read path), runs the function client-side, and renders a table. Gated by `AdminGate`
   (forms layout — this is a table, not a canvas). No store needed (derived, read-only).

## Risks / Trade-offs

- **Combinatorial explosion** (many genes × many alleles) → Mitigation: the `MAX_ENUM` cap + explicit
  "capped" messaging; v1 variants are small (demo = 2^4 = 16). Revisit with pagination/grouping if real
  variants grow large.
- **"Distinct look" ignores rarity** → a phenotype that needs 6 colours might be astronomically
  unlikely yet still flagged. Accepted: the owner wants to know it's *possible*, not its odds; rarity
  is an explicit non-goal for now.
- **Colour count is per-look, not per-physical-print constraints** (e.g. multi-material limits beyond
  count) → out of scope; `max_print_colors` is the single agreed ceiling.

## Migration Plan

No data migration, no writes. Ship the engine function + route; rollback = remove them. Existing data
and the render path are untouched.

## Open Questions

None blocking. Possible later: frequency-weighted likelihood per look; a per-role colour breakdown;
exporting the map. All additive.
