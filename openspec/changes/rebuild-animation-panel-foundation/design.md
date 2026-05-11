## Context

Today's studio Animate step (`app/studio/StepAnimate.tsx`) is a flat list of eight global sliders against a viewport that shows the dragon animating with no visual feedback. The user has no way to see where the joints are, where the foot targets sit, or where the head is aimed — tuning is guess-and-check.

The canonical animation design (`documentation/animation_design.md`) replaces this with a constraint-based procedural system whose iteration loop depends on two surfaces working together:

1. A **viewport** that draws joints, anchors, targets, and (eventually) constraint states over the dragon, so the user can see what the parameters are doing.
2. A **panel** split into **Intrinsic** (how the body relates to itself) and **Extrinsic** (how the body engages with the world) tabs, so the user has the right mental model when reaching for a control.

Every later slice — foot stepping rework (Slice 2), head behavior rework (Slice 3), per-node tuning (Slice 4), full-3D body (Slice 5), pluggable constraint kinds (Slice 6), environmental reactivity (Slice 7) — adds gizmos to an established overlay system and adds controls to established tab sections. The roadmap in `animation_design.md` § 7 makes the viewport-visualization requirement explicit per slice: "Without the visualization, the slice doesn't ship."

This change is the foundational slice. It establishes the shape later slices depend on, while changing no motion at all.

Constraints:

- The runtime animation system is locked. No edits to `app/game/animations/**` (solver, director, behaviors, blend, types, constants), `app/game/chain3d.ts`, `app/game/fabrik3d.ts`, `app/game/useCreature.ts`, or `app/game/AnimatedModel.tsx`.
- The skeleton's shape is owned by step 1 (segment selection) and step 2 (node placement). The Animate panel reads that data; it never edits it.
- The renderer ↔ skeleton contract from `documentation/skeleton_to_model_mapping.md` is preserved. The overlay reads the same `chainRef` / `limbStatesRef` the renderer already reads. No new writers to rig state.
- Existing tuned values in `useStudioStore.animationConfig` must survive the rebuild — the sliders relocate, but their bindings, ranges, and effects are identical.

## Goals / Non-Goals

**Goals:**

- Replace the flat slider list in `StepAnimate.tsx` with a tab shell (`Intrinsic` | `Extrinsic`) sitting under a row of overlay toggles.
- Add a debug overlay drawn over the existing translucent dragon: spine joint dots, bone lines between consecutive joints, hip-anchor gizmos, foot current+desired markers, and a head-to-target arrow. Each toggleable independently.
- Show the step 1 / step 2 skeleton-shape data (joint count, total spine length, leg count) as read-only context in the Intrinsic tab, so the boundary with the editor steps is structurally visible.
- Preserve every existing control's behavior exactly. The eight sliders relocate; nothing else changes about them.
- Establish a `chainRef` / `limbStatesRef` / `targetRef` consumer surface that later slices' gizmos (foot-state badges, step-trigger rings, swing-arc previews, anticipation arrows, idle-drift targets, clickable joint dots) can plug into without re-architecting.

**Non-Goals:**

- No foot-planting state machine, swing arc, or per-foot tuning (Slice 2).
- No head anticipation, arrival smoothing, idle drift, or gaze separation (Slice 3).
- No per-node intrinsic sliders, no clickable joint dots, no node-detail card, no per-node color coding on the joint overlay (Slice 4).
- No renderer changes (`AnimatedModel.tsx` untouched). The overlay is a separate component rendering its own primitives over the existing model — it does not modify how the model itself is drawn.
- No new constraint kinds, no spring-damper, no look-ahead (Slice 5 / 6).
- No edits to step 1 (segment editor), step 2 (node editor), or the data they produce.
- No new database fields, no new dependencies, no schema changes.
- No motion behavior changes — the dragon animates identically before and after this change.

## Decisions

### 1. Overlay is a sibling of the renderer, not a fork

The overlay is a new R3F component (`AnimationDebugOverlay`) mounted alongside `<AnimatedModel>` inside `AnimateContent` (`app/studio/StudioScene.tsx`). It reads the same `chainRef` / `limbStatesRef` / `targetRef` the renderer uses. It does not modify `AnimatedModel.tsx` and does not alter the rig.

**Why over "render gizmos inside AnimatedModel"**: the renderer's job is locking BodyGroups to joint pairs. Adding debug primitives there mixes concerns and risks regressing the model rendering. A separate sibling component is purely additive and trivially deletable per overlay if the design changes.

**Alternative considered**: a DOM-based overlay (SVG over the canvas). Rejected — depth, occlusion, and camera transforms make 3D-aware gizmos vastly easier in-scene, and the canvas already has the camera state.

### 2. Solver refs are lifted to `AnimateContent`

Today `useCreature` is called *inside* `AnimatedModel`, so the refs aren't accessible to siblings. This slice lifts the `useCreature` call up one level (into `AnimateContent` or a small wrapper) and passes `chainRef` / `limbStatesRef` as props into `AnimatedModel` — preserving its existing prop surface — while making the same refs available to `AnimationDebugOverlay`.

The lift is a small mechanical change. `AnimatedModel`'s props grow to accept `chainRef` and `limbStatesRef` as optional refs (with a default that reproduces today's behavior of calling `useCreature` internally), so the home page's `HatchingDragon` and `HomeScene` paths are unaffected.

**Alternative considered**: have the overlay call `useCreature` itself with the same config. Rejected — that would instantiate a *second* solver+director, doubling the per-frame cost and producing two different rig states.

**Alternative considered**: expose a global zustand store of the live solver state. Rejected — per-frame state has no business in a state store; refs are the right primitive.

### 3. Overlay primitives use depth-disabled materials

Each overlay gizmo's material runs with `depthTest={false}` and a high `renderOrder` so the dragon's translucent mesh doesn't occlude joints. The user needs to see the skeleton through the body to learn anything from it.

**Why over occlusion-aware rendering**: a depth-correct gizmo behind a translucent surface still reads as faint, defeating the point of the overlay. The accepted trade-off is that overlay primitives never sort relative to the dragon — they're always on top — which matches what every other 3D editor's debug overlay does (Blender, Unity, three.js Inspector).

### 4. One toggle per overlay kind, persisted per user

Each overlay gizmo has its own boolean in a single `overlayToggles` store slice: `joints`, `bones`, `hips`, `footTargets`, `headTarget`. All default to `true`. Persisted via the existing `useStudioStore` `partialize` so the user's preferences survive reload.

**Why per-kind toggles over a single show-all switch**: as the overlay grows in later slices (state badges, step rings, swing arcs, anticipation arrows, idle-drift targets, look-at vector, per-node color coding), the user needs to declutter without losing the gizmos they're actively tuning against. The per-kind toggle is the unit later slices will append to.

**Why defaulting to all-on**: the slice's purpose is making the animation legible. Hiding the overlay by default would defeat that. The user can hide individual overlays if they're distracting.

### 5. Tabs: Intrinsic vs Extrinsic, default to Extrinsic

The tab vocabulary comes straight from `animation_design.md` § 5. **Intrinsic** is for how the body relates to itself (stiffness today; per-node stiffness/damping/catch-up later). **Extrinsic** is for how the body engages with the world (foot params, head/target params, attractor today; foot state, head anticipation, idle drift, external forces later).

Default tab on mount is **Extrinsic** — that's where the most-used controls land today (seven of the eight existing sliders), and where the user will be tuning most often through Slices 2–3.

**Why two top-level tabs instead of a longer accordion**: an accordion that shows every section at once will inflate as later slices add controls. Two tabs scale by adding sections *inside* the relevant tab without growing the panel's vertical footprint. The Intrinsic / Extrinsic split is also the most important conceptual distinction in the new design — surfacing it as the top-level switch reinforces the mental model every time the user opens the panel.

### 6. Skeleton-shape summary is presentational, not a form

The Intrinsic tab opens with a read-only summary of the data step 1 / step 2 own: joint count (from head + spine + tail groups), total spine length (sum of consecutive node-to-node distances), leg count (`leg-left` + `leg-right` groups). No inputs, no edit affordance. Styled as muted label/value rows.

**Why include the summary at all**: it makes the boundary structurally visible. The user sees the skeleton's shape in the Intrinsic tab and learns by interface convention that those values belong to a different step. When Slice 4 adds editable per-node intrinsics (stiffness, damping per joint), they appear *below* the summary, reinforcing "shape is read-only, dynamics are editable."

**Alternative considered**: link back to step 2 with a "Edit skeleton ↗" button. Rejected for this slice — the studio sidebar already exposes step navigation; adding an in-panel jump is redundant. Can be added later if user testing shows it.

### 7. Existing controls relocate verbatim

The eight sliders + the attractor toggle + the left-click hint move into the new layout with zero changes to their bindings, ranges, steps, or `setAnimationField` calls:

- **Intrinsic tab → Stiffness** — the existing `angleConstraint` slider, same `(1 - v) * (Math.PI / 2)` mapping.
- **Extrinsic tab → Feet** subsection — Foot Angle Offset, Step Threshold, Step Smoothing.
- **Extrinsic tab → Head / Target** subsection — Wander Radius, Wander Speed, Max Speed, Follow Distance, Show Attractor checkbox, the "Left-click the floor to set a target" hint.

The grouping into Feet / Head-Target subsections is the only semantic change, and it's a reorganization not a rename.

**Why preserve bindings exactly**: zero risk to existing tuned configs and zero coupling between this slice and the eventual rework of the controls themselves. Slice 2 will replace `stepThreshold` / `stepSmoothing` with per-foot equivalents — that's its problem, not this slice's.

## Risks / Trade-offs

- **Risk**: Lifting `useCreature` out of `AnimatedModel` accidentally changes the home-page rendering path. → Mitigation: make `AnimatedModel`'s new `chainRef` / `limbStatesRef` props optional; when omitted (the home-page path), it falls back to calling `useCreature` internally exactly as today. Only the studio's `AnimateContent` opts into the lifted variant.
- **Risk**: Depth-disabled overlay materials cause overdraw in busy scenes. → Acceptable trade-off — the overlay primitives are few (one instanced mesh for joints, one `LineSegments` for bones, a handful of small meshes for hips and foot markers), and the studio scene contains exactly one dragon. Overdraw cost is negligible.
- **Risk**: Overlay primitives picked up by the click-plane raycast (the invisible plane that catches floor clicks for setting `targetRef`). → Mitigation: every overlay primitive sets `raycast={null}` (or equivalent) so it never intercepts pointer events.
- **Trade-off**: Five overlay toggles add five booleans to the persisted store. → Acceptable — they're a tiny addition to `useStudioStore.partialize` and bound to grow with later slices anyway.
- **Trade-off**: Default-all-on overlays might feel cluttered to a user opening step 3 for the first time after this slice. → Acceptable — clutter on first view is the cost of making the system immediately legible; the user can toggle individual overlays off in seconds.
- **Trade-off**: The Intrinsic tab is sparse (one slider + a summary). → Intentional — leaving the tab visibly empty signals "more is coming here" and prevents the temptation to backfill with controls that should live in Slice 4.

## Migration Plan

Order of operations. Each step keeps the studio runnable.

1. **Type + store additions.** Add `OverlayToggles` to `app/studio/page.types.ts`; add `overlayToggles` + `setOverlayToggle` to `useStudioStore`; add to `partialize`. No UI change yet.
2. **Lift `useCreature` to `AnimateContent`.** Add optional `chainRef` / `limbStatesRef` props to `AnimatedModel`; have `AnimateContent` call `useCreature` and pass the refs down. Verify home-page rendering path unchanged (`AnimatedModel` without the new props still works as before).
3. **Build `AnimationDebugOverlay`.** New component reading the lifted refs + `overlayToggles`. Mount in `AnimateContent` alongside `<AnimatedModel>`. Visually confirm joints, bones, hips, foot markers, and head-target arrow appear over the dragon and toggle correctly.
4. **Rebuild `StepAnimate.tsx`.** Overlay toggle row at top → tab switcher → tab bodies. Move existing controls into their new locations. Render the skeleton-shape summary at the top of the Intrinsic tab.
5. **Verify.** Dragon motion unchanged; every slider effects the live preview as before; reload preserves both `animationConfig` and `overlayToggles`; steps 1 and 2 untouched.

Rollback: each step is a single commit. The lift in step 2 is the only mechanical change to existing files outside the studio's animate path, and `AnimatedModel`'s prop signature stays backward-compatible so the home page can't regress from it.

## Open Questions

None blocking. Two deferred to follow-up slices:

- Should the overlay also include the click-plane target marker (separate from the head-target arrow)? Deferred to Slice 3, where idle-drift target and look-at vector arrive together.
- Should the skeleton-shape summary include per-region detail (head/spine/tail joint counts split out)? Deferred until Slice 4 introduces region presets — at which point the summary becomes a region selector.
