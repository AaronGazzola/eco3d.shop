# Add the dragon genetics engine & render (Foundation B)

## Why

Foundation A (archived) stood up the data contract — variants, roles, genes, alleles, filament
bindings, stage models with `role_tags`, and the dragon entity with a diploid genotype — but stored
data renders nothing. B makes a stored dragon **visible**: resolve its diploid genotype to one colour
per role (real dominant/recessive expression), paint each model component by its role, and roll a
random dragon. This is the payoff that proves the whole representation works end to end, and the
dependency every later layer (breeding AZ-96, selection AZ-99) needs to *see* its results. No authoring
UI yet — that is C; B reads what A stores and seeds a small example to render against.

## What Changes

- **Phenotype engine** (pure functions, no DB): `resolveGenotype(genotype, genes, alleles, filaments)`
  → `Record<roleKey, hex>`. For each gene it picks the expressed allele by `dominance_rank` (higher
  wins; ties broken deterministically — no codominance/blends in v1, since a blend is not a printable
  filament), then resolves that allele's bound filament colour. `rollGenotype(genes, alleles)` draws a
  diploid pair per gene weighted by allele `frequency`.
- **Read-side loading**: actions + react-query hooks to load a `dragon_model` (geometry + `role_tags`)
  and its variant's genes/alleles/filaments, and a `dragons` row by id.
- **Render by role**: extend the static render so each physics/body group's segments are split by their
  `role_tags` role and each role-partition is painted its resolved colour; components with no role tag
  fall back to a neutral colour. Replaces the single per-`BodyGroup` colour for dragon rendering.
- **Minimal preview**: a route that loads a stage model, renders a dragon from a saved id or a freshly
  rolled genotype, and re-rolls on demand — exercising genotype → colours visually.
- **Seed script**: persist one example variant + roles + genes + alleles + a `(variant, stage)` model
  with `role_tags`, so there is a real dragon to render before C's authoring UIs exist.

Out of scope (→ C and the AZ-9x tickets): all admin authoring UIs, the orderability map, breeding,
growth, mutations, codominance/patterns, persisting rolled dragons as owned entities.

## Impact

- **Specs:** `dragon-genetics` — add engine/roll/render requirements.
- **Code:** new genetics module (`app/game/`), read actions/hooks, render change in
  `AnimatedModel.tsx` (role-split colouring), a minimal preview route, a seed script.
- **Reuses unchanged:** the A schema/types, `useStlSegments`, the existing group/segment render path.
