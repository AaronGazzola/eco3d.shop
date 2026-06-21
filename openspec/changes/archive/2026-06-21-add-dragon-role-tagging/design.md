# Design — Dragon role tagging (3D model creation + segment→role tagging)

## Context

Foundation A defines `dragon_models` (one per `variant × stage`: `stl_key`, `groups`, `role_tags`,
`model_rotation`); B's `PosedDragon` reads it and paints each segment by `role_tags[segmentId] →
roleKey → resolved hex`; C authors the roles/genes/alleles. Today the only `dragon_models` row is
written by `scripts/seed-dragon-genetics.ts`, which borrows the newest `model_configs` row's geometry
and maps rig-group *types* (`spine→dorsal`, `head→head`, …) to roles. There is no UI to make or edit a
model, and rig-group type is a crude proxy for "region".

The studio already has the machinery this tool needs: `StudioCanvas` (the r3f canvas + camera),
`useStlLoader` (fetch STL from R2 → rotate/scale/translate → detect connected components into
`SegmentData[]` with stable `seg-${i}` ids), and click-to-select segment interaction (`GroupScene`).
`AdminFrame` (scene + right sidebar) is the right shell here because this is a canvas tool.

## Goals / Non-Goals

**Goals:**
- Create a `dragon_models` row for a `(variant, stage)` by sourcing geometry from a saved
  `model_config` (stl_key + groups + model_rotation).
- Visually tag segments to a variant's roles and persist `role_tags`; reflect changes in B's render.
- Edit an existing model's tags; delete a model.

**Non-Goals:**
- Building rig groups from scratch in this tool (the pick→group studio already does that; we source
  from its output). No new segment-detection or grouping logic.
- `max_print_colors` enforcement / orderability (the next change, `add-dragon-orderability-map`).
- Many-to-many gene↔role, breeding, growth (deferred AZ-9x).
- Any schema/migration change — `dragon_models` already exists.

## Decisions

1. **Geometry comes from an existing `model_config`, not a fresh build.** Creating a model = pick a
   `(variant, stage)` + pick a saved `model_config`; we copy its `stl_key`, `groups`, and
   `model_rotation` onto the new `dragon_models` row. *Why:* the seed already proves this path, it
   reuses the entire pick/group studio investment, and it guarantees the detected `seg-${i}` ids the
   tagging UI sees are the same ids the render path will detect (same STL + same loader pipeline →
   deterministic segment order). *Alternative considered:* a from-scratch STL+grouping flow inside this
   tool — rejected as a near-duplicate of `/admin/group` and out of scope.

2. **Stable segment ids are load-bearing.** `role_tags` keys are `seg-${i}` ids assigned by
   `useStlLoader`'s connected-component detection. They are deterministic for a given STL, so a model
   tagged here renders correctly later **as long as it keeps the same `stl_key`**. We therefore freeze
   `stl_key` on a saved model (re-sourcing geometry = make a new model), and store `groups` alongside
   so the render path and any future rig use share one geometry contract. *Risk mitigation below.*

3. **Gate with `AdminGate`, reusing the same retractable sidebar as the studio, not `AdminFrame`.**
   `AdminFrame` wraps its sidebar in `SidebarShell` — the studio's Pick/Group/Animate stepper plus a
   background STL hydration (`useEnsureStlLoaded`) bound to the studio's persisted store — which is
   irrelevant here and would fire a stray STL load. So this change adds a `sidebar` mode to the
   `AdminGate` from Foundation C that uses the **same shadcn `Sidebar` primitives the other admin UI
   uses** (`SidebarProvider` + `SidebarInset` for the scene + offcanvas `Sidebar side="right"` +
   `SidebarTrigger`), minus `SidebarShell`. This gives the tool the studio's retractable, mobile-aware
   sidebar (collapses to a sheet on small screens) without the studio stepper. The canvas reuses
   `StudioCanvas`.

4. **Tagging model: click-select → assign to active role.** The sidebar lists the variant's roles
   (each with a generated colour); one role is "active". Clicking segments in the canvas toggles them
   into a pending selection; "Assign to <role>" writes `role_tags[segId] = roleKey` for each; clicking
   a tagged segment with a different active role re-tags it; an "Untag" action removes keys. Segments
   paint their role's colour (untagged = neutral grey), so coverage is visible at a glance. This
   mirrors `GroupScene`'s selection UX without its node/sphere/leg-attachment complexity.

5. **Local draft state in zustand; persistence in react-query.** `role_tags` is edited as a local
   `Record<string,string>` draft (zustand, no `persist`) plus an active-role pointer; a "Save" mutation
   writes it via an admin-gated action, react-query invalidates the model query. Loading/error in
   hooks, per CLAUDE.md. *Why a draft instead of write-per-click:* tagging is many rapid edits; batching
   into one save avoids a write per segment and lets the author cancel.

6. **Writes are admin-gated in the action.** Every mutating action calls `checkIsAdminAction()` before
   the query (defence in depth over RLS), throws + `console.error` on failure, no fallbacks — same
   pattern as Foundation C.

## Risks / Trade-offs

- **Segment-id drift if the STL changes** → Because ids are detection-order indices, replacing the STL
  geometry behind an existing `stl_key` would silently mis-map tags. Mitigation: treat `stl_key` as
  immutable on a saved model; re-tagging against new geometry means creating a new model. Documented in
  `dragon-genetics.md`.
- **`model_configs` is the geometry source of truth** → if no config exists, a model can't be created.
  Mitigation: the creator surfaces "author a model in the studio first" (same precondition the seed
  has). Acceptable — the studio is the established geometry pipeline.
- **Large meshes** → the existing batched-render path in the studio handles this; reusing
  `StudioCanvas`/`useStlLoader` inherits whatever perf work already exists (and AZ-34 tracks the known
  mount cost separately).

## Migration Plan

No data migration. Ship the routes; the seed-written `demo` model keeps working (its `role_tags` are
already valid). Rollback = remove the routes; no schema or data effects. The seed script is retained
as a convenience but documented as superseded for authoring.

## Open Questions

None blocking. Possible later polish (not this change): an inline genotype-roll colour preview in the
tagging canvas (B's `resolveGenotype`), and reorder/rename of roles from this tool (today done in C).
