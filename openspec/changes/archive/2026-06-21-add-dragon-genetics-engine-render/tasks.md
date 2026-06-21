## 1. Phenotype engine (pure)

- [x] 1.1 Add `app/game/dragons.genetics.ts` with `resolveGenotype(genotype, genes, alleles, filaments)
  → Record<roleKey, hex>`: per gene, express the higher-`dominance_rank` allele; tie → smaller `key`;
  resolve its `filament_color_id` to a hex. Throw (console.error) if a referenced allele/filament is
  missing — no fallback.
- [x] 1.2 Add `rollGenotype(genes, alleles) → Genotype`: per gene, draw two independent alleles weighted
  by `frequency`; return `{ [geneKey]: [alleleId, alleleId] }`.
- [x] 1.3 Unit-style check (a throwaway `tsx` script, no DB): a known genotype resolves to expected
  colors; a tie resolves to the smaller-key allele and never a blend; rolls are valid + frequency-
  weighted over many draws.

## 2. Read-side data loading

- [x] 2.1 Add actions (`*.actions.ts`, Supabase server client, `auth.getUser()` first per CLAUDE.md) to
  load: a `dragon_model` by `(variant, stage)` incl. `role_tags`; a variant's genes + alleles +
  referenced filament colors; and a `dragons` row by id.
- [x] 2.2 Add react-query hooks (`*.hooks.tsx`) wrapping those actions for the preview route.

## 3. Render by role

- [x] 3.1 Generalize the dragon render path in `app/game/AnimatedModel.tsx` so a group's segments are
  partitioned by their `role_tags` role and each partition renders a merged mesh in that role's resolved
  color; untagged segments use a neutral fallback color. Pass a `phenotype` (roleKey→hex) + `roleTags`
  into the render; keep the existing per-`BodyGroup` color path for the locomotion studio unchanged.
- [x] 3.2 `npx tsc --noEmit` + `npx eslint` pass; the locomotion studio render is visually unaffected.

## 4. Minimal preview route

- [x] 4.1 Add a route (e.g. `app/game/dragons/[id]/page.tsx`) that loads a stage model + a dragon (by id
  or a rolled genotype), resolves the phenotype, and renders the role-colored dragon. Full page UI with
  loading skeletons only on the data-dependent content (per CLAUDE.md).
- [x] 4.2 Add a "Roll random" control that re-rolls the genotype and re-renders (in-memory; not
  persisted in this change).

## 5. Seed script

- [x] 5.1 Add `scripts/seed-dragon-genetics.ts` (run `doppler run -- npx tsx ...`) that persists one
  example variant + roles + genes + alleles + a `(variant, stage)` model with a `role_tags` map keyed to
  that model's real `seg-N` ids, so the preview has a real dragon to render. Idempotent (upsert by key).

## 6. Verification

- [x] 6.1 Seed, then load the preview and confirm: the dragon renders with per-role colors; "Roll
  random" changes colors; a dominant allele's color shows over its recessive partner.
- [x] 6.2 Confirm consistent expression across stages: render the same genotype on two stage models of
  the seeded variant and confirm shared roles resolve to the same colors.

## 7. Documentation + validation

- [x] 7.1 Update `documentation/dragon-genetics.md`: B landed — engine functions, render-by-role, the
  preview route, and the seed script.
- [x] 7.2 `npx openspec validate add-dragon-genetics-engine-render --strict` passes.
