# Add dragon orderability map — printable phenotypes vs max_print_colors

## Why

A variant's genetics can describe more distinct *looks* than are practical to 3D-print: each look needs
one filament per distinct colour, and a print has a real ceiling (`dragon_variants.max_print_colors`).
Today nothing tells the owner how many colours a given dragon will actually need or which genetic
outcomes blow past the limit — so a variant can be authored that rolls dragons no one can print. This
change adds a read-only analysis that enumerates the distinct printable phenotypes for a variant and
flags the ones that exceed `max_print_colors`, so the owner can judge printability while authoring.

## What Changes

- **New pure engine function** (`app/game/dragons.genetics.ts`): given a variant's genes, roles,
  alleles, and filaments, enumerate the **distinct phenotypes** — every combination of one expressed
  allele per gene (dominance means a genotype's look equals its dominant allele's, and every allele is
  expressible when homozygous), resolved to a `role → hex` map and deduped by that map — and report,
  per phenotype, the **distinct filament-colour count**.
- **New read-only admin view** under `app/admin/dragons/[variantId]/orderability/`: a table of the
  variant's distinct phenotypes with their colour counts, **flagging any whose colour count exceeds the
  variant's `max_print_colors`**, plus a summary (total distinct phenotypes, how many are over the
  limit). Linked from the variant editor. Read-only — no writes, no schema change.
- **Enumeration guard**: when the cartesian product of allele counts is very large, cap the
  enumeration and surface that it was capped (no silent truncation), so the page never hangs.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dragon-genetics`: add requirements for enumerating a variant's distinct printable phenotypes and
  flagging those that exceed `max_print_colors`.

## Impact

- **Specs:** `dragon-genetics` — add orderability-analysis requirements.
- **Code:** a pure function in `app/game/dragons.genetics.ts`; a new read-only route
  `app/admin/dragons/[variantId]/orderability/` (`page.tsx` / `page.actions.ts` / `page.hooks.tsx` /
  `page.types.ts`); a link from the variant editor; an optional headless engine check under `scripts/`.
- **Reuses unchanged:** B's `resolveGenotype` dominance/expression rules, A's schema, C's authored
  roles/genes/alleles/palette. No migration, no writes.
