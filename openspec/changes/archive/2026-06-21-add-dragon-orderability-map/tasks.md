# Tasks — Dragon orderability map

## 1. Engine: phenotype enumeration

- [x] 1.1 In `app/game/dragons.genetics.ts`, add a pure `enumeratePhenotypes(genes, roles, alleles,
  filaments, opts?)` that builds the cartesian product of one allele per gene, resolves each tuple to a
  `role → hex` map (same expression as `resolveGenotype`: the chosen allele is the expressed one;
  map gene→role→filament hex), dedupes by a stable `role → hex` signature, and returns each distinct
  phenotype with its `colorCount` (distinct hex values). Throw + `console.error` on missing
  filament/role references (no fallbacks), consistent with `resolveGenotype`.
- [x] 1.2 Bound the enumeration: accept `opts.maxEnum` (default e.g. 5000); compute the total product
  first, and if it exceeds the bound return `{ phenotypes: <partial>, capped: true, total }`; otherwise
  `{ phenotypes, capped: false, total }`. Add a small helper to classify a phenotype against a
  `max_print_colors | null` ceiling (over-limit boolean; null → never over).

## 2. Types + read path

- [x] 2.1 `app/admin/dragons/[variantId]/orderability/page.types.ts`: export the result types
  (`PhenotypeRow { roleHex: Record<string,string>; colorCount: number; overLimit: boolean }`,
  `OrderabilityResult { rows; capped; total; maxPrintColors: number | null; overLimitCount }`),
  constructed from `@/app/game/dragons.types`.
- [x] 2.2 `app/admin/dragons/[variantId]/orderability/page.actions.ts`: a read action that loads the
  variant + its roles/genes/alleles/filaments (reuse the same queries as the variant editor's
  `getVariantGeneticsAction`). No writes.

## 3. Hooks

- [x] 3.1 `app/admin/dragons/[variantId]/orderability/page.hooks.tsx`: a react-query query keyed
  `['orderability', variantId]` that loads the bundle and computes the `OrderabilityResult` via the
  engine function (in the `queryFn` or a `useMemo` over the bundle). Loading/error in the hook.

## 4. Read-only UI

- [x] 4.1 `app/admin/dragons/[variantId]/orderability/page.tsx` (`AdminGate`, forms layout): a summary
  line (total distinct phenotypes, over-limit count, the `max_print_colors` value or "no limit set",
  and a "capped" note when applicable) and a table — one row per distinct phenotype showing its role
  swatches/hexes, its colour count, and an over-limit flag. Loading skeleton on the data-dependent
  table only. Read-only (no mutations).
- [x] 4.2 Add a link from the variant editor (`app/admin/dragons/[variantId]/page.tsx`) to the
  orderability view, alongside the existing "Stage models" link.

## 5. Verification

- [x] 5.1 Headless engine check `scripts/check-dragon-orderability.ts` (no DB): construct a small
  in-memory variant (mirroring the demo: 4 genes × 2 alleles, distinct filaments) and assert the
  distinct-phenotype count and a known over-limit case against a chosen `max_print_colors`. Exits
  non-zero on mismatch. Run with `npx tsx scripts/check-dragon-orderability.ts`.
- [x] 5.2 As an admin, open `/admin/dragons/<demo>/orderability` and confirm the table lists the demo's
  distinct phenotypes with colour counts, and that lowering the demo's `max_print_colors` flags the
  expected rows.

## 6. Documentation + validation

- [x] 6.1 Update `documentation/dragon-genetics.md`: orderability map landed (read-only analysis;
  enumerates distinct looks vs `max_print_colors`); note it completes the AZ-102 authoring set.
- [x] 6.2 `npx tsc --noEmit` + `npx eslint app/admin/dragons app/game/dragons.genetics.ts` pass; the
  headless check passes; `npx openspec validate add-dragon-orderability-map --strict` passes.
