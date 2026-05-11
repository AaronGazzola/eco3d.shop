## 1. Overlay state in the store

- [x] 1.1 Add `OverlayToggles` type to `app/studio/page.types.ts` with boolean fields: `joints`, `bones`, `hips`, `footTargets`, `headTarget`.
- [x] 1.2 Add `overlayToggles: OverlayToggles` and `setOverlayToggle: (key: keyof OverlayToggles, value: boolean) => void` to `StudioStore` in `app/studio/page.stores.ts`.
- [x] 1.3 Default all five overlays to `true` so the first time the user opens step 3 after this slice, the skeleton is visible.
- [x] 1.4 Add `overlayToggles` to the `partialize` allowlist so the user's preferences survive reload.

## 2. Debug overlay component

- [x] 2.1 Create `app/studio/AnimationDebugOverlay.tsx`. It is a Three Fiber component (no DOM), takes `chainRef`, `limbStatesRef`, and `targetRef` as props, and reads `overlayToggles` from `useStudioStore`.
- [x] 2.2 Inside a `useFrame`, sync mesh positions from the live solver refs each frame (no React re-renders during animation — instance positions are mutated directly, the same pattern `AnimatedModel` uses).
- [x] 2.3 Render joint dots as a small instanced mesh sized to the spine joint count. Visible only when `overlayToggles.joints` is true. Color: a single contrasting hue (e.g. cyan); no per-joint variation yet (reserved for Slice 4).
- [x] 2.4 Render bone lines as a `LineSegments` with two endpoints per consecutive joint pair. Visible only when `overlayToggles.bones` is true.
- [x] 2.5 Render hip-anchor gizmos: one small mesh per limb at `limb.anchor`. Visible only when `overlayToggles.hips` is true.
- [x] 2.6 Render foot markers: a solid sphere per limb at `limb.currentTarget`, plus a ghost ring (or wireframe sphere) at `limb.desiredTarget`. Both gated on `overlayToggles.footTargets`.
- [x] 2.7 Render the head-target arrow as a `Line` from `chain.joints[0]` to `targetRef.current`. Visible only when `overlayToggles.headTarget` is true.
- [x] 2.8 Use `renderOrder` or `depthTest={false}` on overlay materials so the gizmos are not occluded by the translucent dragon mesh — the user needs to see joints through the body.
- [x] 2.9 Size all overlay primitives proportionally to a scene-level constant (e.g. `OVERLAY_DOT_RADIUS = 0.08`) so they read at the studio's current camera distance without obscuring the model.

## 3. Mount the overlay in the Animate viewport

- [x] 3.1 In `app/studio/StudioScene.tsx`, update `AnimateContent` so `useCreature`'s returned `chainRef` and `limbStatesRef` are accessible to the overlay. Today `AnimatedModel` calls `useCreature` internally — lift that call into `AnimateContent` (or wrap so the refs are exposed) without changing what `AnimatedModel` receives.
- [x] 3.2 Render `<AnimationDebugOverlay chainRef={chainRef} limbStatesRef={limbStatesRef} targetRef={targetRef} />` alongside `<AnimatedModel>` inside `AnimateContent`. Mount order: dragon first, overlay second, so the overlay draws over the model.
- [x] 3.3 Verify the dragon still animates identically — the overlay is purely additive.

## 4. Skeleton-shape summary (read-only)

- [x] 4.1 In `StepAnimate.tsx`, compute a small summary from `useStudioStore` state already available: spine joint count (derived from head + spine + tail groups), total spine length (sum of node-to-node distances), leg count (count of `leg-left` + `leg-right` groups).
- [x] 4.2 Render the summary as plain text rows (label + value) — no inputs, no edit affordance. Visual style: muted, lower contrast than control rows, so it reads as context.
- [x] 4.3 Place the summary at the top of the **Intrinsic** tab body, above the stiffness slider.

## 5. Panel rebuild — shell

- [x] 5.1 Rewrite `app/studio/StepAnimate.tsx` body around the new layout: overlay toggle row → tab switcher (`Intrinsic` | `Extrinsic`) → tab body. Keep the file co-located in `app/studio/` per the project's file-organization rules.
- [x] 5.2 Use existing primitives (`SliderField`, `SectionTitle`, `Divider`) from `app/game/ConfigPanel.primitives` for tab body rows. Use a Shadcn `Tabs` component for the tab switcher; if not present, build a minimal styled toggle button pair.
- [x] 5.3 Local component state holds the active tab (`'intrinsic' | 'extrinsic'`); default to `'extrinsic'` since that's where the most-used controls land.
- [x] 5.4 Render the overlay toggle row at the top: five labeled checkboxes (Joints, Bones, Hips, Foot Targets, Head Target) bound to `overlayToggles` via `setOverlayToggle`. Compact horizontal layout; do not duplicate the entire row's styling for every checkbox — extract a small `OverlayToggleRow` subcomponent within the same file if it improves readability.

## 6. Panel rebuild — Intrinsic tab

- [x] 6.1 Below the skeleton-shape summary, render the existing Stiffness slider with its current binding (`angleConstraint` ↔ `(1 - v) * (Math.PI / 2)`).
- [x] 6.2 Place a `Divider` between the summary and the slider.
- [x] 6.3 No other controls. The tab is intentionally sparse — Slice 4 fills it in.

## 7. Panel rebuild — Extrinsic tab

- [x] 7.1 Add a `SectionTitle "Feet"` block containing: Foot Angle Offset, Step Threshold, Step Smoothing — sliders identical to today (same binding, range, step).
- [x] 7.2 Add a `Divider`, then a `SectionTitle "Head / Target"` block containing: Wander Radius, Wander Speed, Max Speed, Follow Distance — sliders identical to today.
- [x] 7.3 Below the four sliders in Head / Target, render the existing **Show attractor** checkbox (bound to `showAttractor`) and the **Left-click the floor to set a target** hint text.
- [x] 7.4 Confirm every previous slider is reachable in the new layout. No control is dropped.

## 8. Verification

- [ ] 8.1 Studio step 3 renders. The dragon animates identically to before this change (no motion regression).
- [ ] 8.2 With all overlay toggles on, every spine joint, every bone segment, every hip anchor, every foot target (current + desired), and the head-target arrow are visible over the dragon.
- [ ] 8.3 Toggling any overlay checkbox immediately hides / shows the corresponding gizmo without affecting motion or any other overlay.
- [ ] 8.4 The Intrinsic tab shows the read-only summary plus the Stiffness slider, and adjusting Stiffness has the same effect on the live dragon as before.
- [ ] 8.5 The Extrinsic tab shows the Feet and Head / Target subsections, and every slider in both subsections has the same effect as before this change.
- [ ] 8.6 Step 1 and step 2 are unchanged: open the studio, complete steps 1 and 2 with a fresh model, and confirm those flows are visually and behaviorally identical to before.
- [ ] 8.7 The overlay-toggle preferences and the existing `animationConfig` survive a page reload.
- [x] 8.8 `npx tsc --noEmit` passes.

## 9. Validate the OpenSpec change

- [ ] 9.1 Run `openspec validate rebuild-animation-panel-foundation --strict` and resolve any reported issues.
- [ ] 9.2 Run `openspec status --change rebuild-animation-panel-foundation` and confirm all artifacts are `done`.
