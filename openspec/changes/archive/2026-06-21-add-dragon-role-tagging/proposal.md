# Add dragon role tagging — 3D model creation + segment→role tagging

## Why

Foundation C lets an admin author a variant's genetics (roles, genes, alleles, palette) through
forms, but the one thing those genes paint — a `(variant, stage)` model's `role_tags` (which 3D
segments belong to which role) — still only exists because `scripts/seed-dragon-genetics.ts`
hand-builds it by borrowing a `model_configs` row and mapping rig-group types to roles. There is no
way to create a `dragon_models` row or to assign segments to roles visually. This is the 3D authoring
piece the owner most wants: open a `(variant, stage)`, see the geometry, click segments, and tag them
to that variant's roles.

## What Changes

- **New admin 3D tool** under `app/admin/dragons/` for `dragon_models`: list a variant's stage models,
  create one for a `(variant, stage)`, open it, and delete it.
- **Model creation sources geometry from an existing `model_config`** — picking a saved studio
  configuration supplies `stl_key`, rig `groups`, and `model_rotation` for the new `dragon_models` row
  (mirroring what the seed already does), so this change reuses the existing pick/group studio pipeline
  rather than rebuilding segment grouping.
- **3D role-tagging canvas**: load the model's STL into detected segments (reuse `useStlLoader` /
  `StudioCanvas`), render them, click to select one or many, and assign the selection to one of the
  variant's roles. A role legend shows each role's colour; tagged segments paint that colour; untagged
  segments stay neutral. Persists to `dragon_models.role_tags` (`{ segmentId: roleKey }`).
- **Replaces the seed's hand-built `role_tags`** as the real authoring path; the seed stays as a
  convenience for the `demo` variant.
- Gated by **`AdminGate`** (a new full-bleed mode of C's gate), not the studio's `AdminFrame` — the
  latter's `SidebarShell` carries the Pick/Group/Animate stepper + a stray STL hydration that don't
  belong here. The canvas itself reuses `StudioCanvas`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dragon-genetics`: add requirements for authoring `(variant, stage)` models and tagging their
  segments to roles (creation, visual tagging, persistence to `role_tags`, and the round-trip into the
  render path).

## Impact

- **Specs:** `dragon-genetics` — add model-creation + role-tagging requirements.
- **Code:** new route(s) under `app/admin/dragons/` (a models list/creator + a `[modelId]` tagging
  canvas) with `page.actions.ts` / `page.hooks.tsx` / `page.stores.ts` / `page.types.ts`; reuses
  `app/admin/_lib` (`AdminFrame`, `StudioCanvas`, `useStlLoader`, segment detection) and the
  `model_configs` table as a geometry source.
- **Data:** writes `dragon_models` (`variant_id`, `stage`, `stl_key`, `groups`, `role_tags`,
  `model_rotation`). No schema change — table already exists from Foundation A; RLS is admin-write.
- **Reuses unchanged:** A's schema/RLS, B's `PosedDragon` render-by-role + `/game/dragons/[variantKey]`
  preview, C's roles/genes authoring.
