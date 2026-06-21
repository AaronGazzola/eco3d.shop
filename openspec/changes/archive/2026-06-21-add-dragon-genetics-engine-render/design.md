# Design — Dragon genetics engine & render (Foundation B)

## Context

A stores the data; nothing is drawn. The renderer (`AnimatedModel.tsx`) colours per **`BodyGroup`** —
`MergedGroupMesh` merges a group's segments into one mesh with `group.color`. The printable components
are STL **segments** (`seg-N`); A's `dragon_models.role_tags` maps each `seg-N` → a role key. B turns
`genotype → per-role colour` and paints components by role.

## Decisions

1. **Phenotype engine is pure + DB-free.** `resolveGenotype` and `rollGenotype` take plain data
   (genotype, genes, alleles, filaments) and return plain data (a `roleKey → hex` map; a `Genotype`).
   Pure so it is trivially testable and reusable by C/breeding later without a render or a client.

2. **Expression = highest `dominance_rank` wins.** For a gene's diploid pair, the expressed allele is
   the one with the greater `dominance_rank`; its bound filament colour is the role's colour. This is
   the Mendelian dominant/recessive behaviour, driven entirely by A's stored rank.

3. **Ties break deterministically; no codominance in v1.** Equal `dominance_rank` → pick the allele
   with the lexicographically smaller `key` (stable, reproducible). A blended/codominant colour is
   deliberately excluded: the expressed colour must be a single real filament to stay printable.
   Codominance/patterns (roan, spotting) are a later thread, not a v1 guess.

4. **Roll is per-gene, diploid, frequency-weighted.** `rollGenotype` draws **two independent** alleles
   per gene, each weighted by `frequency`, so homozygotes and heterozygotes both arise naturally. Only
   the normal allele set is used — mutation (AZ-98) layers on later. Randomness is fine here (app
   runtime, not the workflow sandbox).

5. **Render: split each group by role, not a rewrite.** Keep the body/group structure (physics owns
   it). Within a group, partition its segments by their `role_tags` role and render one merged mesh per
   role-partition with that role's resolved colour. Untagged segments fall back to a neutral colour so
   a partly-tagged or un-tagged model still renders. This is the smallest change to `MergedGroupMesh`'s
   call sites that achieves per-role colour.

6. **Static preview, no physics.** B renders a **posed** dragon to show colours — the locomotion
   rig/animation is unrelated to genetics and stays out. The preview loads a `(variant, stage)` model,
   builds segments via `useStlSegments`, and renders role-coloured.

7. **Read live from Supabase; seed via script.** The read hooks load real rows. Because C's authoring
   UIs do not exist yet, a seed script writes one example variant/roles/genes/alleles/model so there is
   something real to render. The seed is the fixture; C later replaces manual seeding.

8. **Rolled dragons are not persisted in B.** Rolling generates an in-memory genotype to render.
   Saving a rolled dragon as an owned `dragons` row needs an authed user and is a game-flow concern —
   the table already supports it (proven in A); wiring the save UI is deferred.

## Open questions

None blocking. Deferred: codominance/pattern expression (later thread), persisting/owning rolled
dragons (game flow), and whether the preview lives under `/game` or admin (cosmetic — start minimal).

## Phenotype resolution sketch

```
resolveGenotype(genotype, genes, alleles, filaments):
  for each gene g:
    [idA, idB] = genotype[g.key]
    a, b       = alleles[idA], alleles[idB]
    expressed  = a.dominance_rank > b.dominance_rank ? a
               : b.dominance_rank > a.dominance_rank ? b
               : (a.key <= b.key ? a : b)            # deterministic tie-break
    out[g.role_key] = filaments[expressed.filament_color_id].hex
  return out                                          # { roleKey: hex }
```
