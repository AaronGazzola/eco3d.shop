## ADDED Requirements

### Requirement: Studio animation panel uses Intrinsic / Extrinsic tabs

The studio's Animate step (`app/studio/StepAnimate.tsx`) SHALL present its controls under two top-level tabs: **Intrinsic** (how the body relates to itself) and **Extrinsic** (how the body engages with the world). A flat list of controls without this tab structure SHALL NOT be considered conformant.

The default active tab on first render SHALL be **Extrinsic**.

The **Intrinsic** tab SHALL contain the Stiffness control (bound to `animationConfig.angleConstraint`) and SHALL begin with a read-only skeleton-shape summary derived from step 1 / step 2 data. The summary SHALL display at least: spine joint count, total spine length, and leg count. The summary SHALL have no edit affordance.

The **Extrinsic** tab SHALL contain two subsections:
- **Feet**: Foot Angle Offset (`limbAngleOffset`), Step Threshold (`stepThreshold`), Step Smoothing (`stepSmoothing`).
- **Head / Target**: Wander Radius (`wanderRadius`), Wander Speed (`wanderSpeed`), Max Speed (`maxSpeed`), Follow Distance (`followDistance`), the Show Attractor checkbox (`showAttractor`), and the "Left-click the floor to set a target" hint.

Every control SHALL bind to the same `useStudioStore` field, with the same range, step, and effect on the live preview as before this change.

#### Scenario: Tab shell renders

- **WHEN** a user opens studio step 3 with at least one body group placed
- **THEN** the panel renders an overlay toggle row, a tab switcher offering Intrinsic and Extrinsic, and a tab body for the active tab, with no other top-level controls outside this structure

#### Scenario: Default tab is Extrinsic

- **WHEN** the user opens step 3 for the first time after this change
- **THEN** the Extrinsic tab is active and its Feet + Head / Target subsections are visible

#### Scenario: Stiffness lives in Intrinsic

- **WHEN** the user activates the Intrinsic tab
- **THEN** the Stiffness slider is rendered and adjusting it produces the same effect on the live dragon as before this change

#### Scenario: Feet subsection contains the foot controls

- **WHEN** the user activates the Extrinsic tab
- **THEN** the Feet subsection contains exactly the Foot Angle Offset, Step Threshold, and Step Smoothing sliders, each bound to the same `animationConfig` field as before

#### Scenario: Head / Target subsection contains the world controls

- **WHEN** the user activates the Extrinsic tab
- **THEN** the Head / Target subsection contains the Wander Radius, Wander Speed, Max Speed, Follow Distance sliders, the Show Attractor checkbox, and the left-click hint

#### Scenario: Skeleton-shape summary is read-only

- **WHEN** the Intrinsic tab is active
- **THEN** the skeleton-shape summary at the top of the tab displays spine joint count, total spine length, and leg count as labeled text with no inputs, buttons, or edit affordances

### Requirement: Studio animation viewport renders a toggleable debug overlay

The studio's Animate viewport SHALL render an `AnimationDebugOverlay` component that draws procedural debug primitives over the existing `AnimatedModel`. The overlay SHALL read live solver state from the same `chainRef` / `limbStatesRef` / `targetRef` the renderer consumes; the overlay SHALL NOT instantiate its own solver, director, or chain.

The overlay SHALL draw, each gated by its own toggle in `useStudioStore.overlayToggles`:

- **joints** — a dot at every position in `chain.joints`.
- **bones** — a line segment between each consecutive joint pair.
- **hips** — a gizmo at every `limb.anchor`.
- **footTargets** — a solid marker at every `limb.currentTarget` and a ghost marker at every `limb.desiredTarget`.
- **headTarget** — an arrow from `chain.joints[0]` to `targetRef.current`.

Overlay primitives SHALL render on top of the translucent dragon mesh (depth-disabled or equivalent) so joints inside the body are visible. Overlay primitives SHALL NOT intercept pointer events (the floor click-target plane and any other interaction SHALL continue to receive events unobstructed).

The overlay SHALL NOT write to `chain.joints`, `limb.anchor`, or `limb.currentTarget`. It SHALL NOT modify `AnimatedModel.tsx` or alter the rig.

#### Scenario: All overlays render with defaults

- **WHEN** the user opens step 3 with a complete skeleton and a freshly initialized store
- **THEN** every joint dot, bone line, hip gizmo, foot current+desired marker, and the head-target arrow are visible over the translucent dragon

#### Scenario: Toggling an overlay hides only that gizmo

- **WHEN** the user toggles `joints` off
- **THEN** joint dots disappear and bones, hips, foot markers, and the head-target arrow remain visible

#### Scenario: Overlay shows skeleton through the body

- **WHEN** a spine joint sits behind the translucent dragon mesh from the camera's viewpoint
- **THEN** the corresponding joint dot is still rendered visibly (not occluded by the dragon)

#### Scenario: Overlay does not block pointer events

- **WHEN** the user left-clicks the floor through a region occupied by an overlay gizmo
- **THEN** the click sets the head target as if no gizmo were present

#### Scenario: Overlay reads live solver state

- **WHEN** the dragon is animating and the overlay is mounted
- **THEN** each overlay primitive's position updates every frame from the solver's refs without React re-renders during animation

### Requirement: Overlay toggle state persists across reloads

`useStudioStore` SHALL expose an `overlayToggles` slice of type `OverlayToggles` (booleans: `joints`, `bones`, `hips`, `footTargets`, `headTarget`) with a `setOverlayToggle(key, value)` setter. All toggles SHALL default to `true`. `overlayToggles` SHALL be included in the store's `partialize` allowlist so the user's preferences survive page reload.

#### Scenario: Toggle preference survives reload

- **WHEN** the user disables the `bones` overlay and reloads the page
- **THEN** on the next render of step 3, the `bones` overlay is still disabled

#### Scenario: All toggles default to true on a fresh store

- **WHEN** the user opens step 3 for the first time with no persisted state for `overlayToggles`
- **THEN** every overlay gizmo is visible

### Requirement: Animation panel does not edit skeleton shape

The studio Animate step SHALL NOT provide any control that edits the data owned by step 1 (`SegmentData`, `BodyGroup.segmentIds`, `BodyGroup.type`, `BodyGroup.attachedToSpineId`) or step 2 (`BodyGroup.nodeFront`, `nodeBack`, `nodeHipLeft`, `nodeHipRight`, `nodeFoot`, `modelRotation`). The skeleton-shape summary in the Intrinsic tab SHALL be read-only and SHALL NOT include inputs, drag handles, or buttons that mutate any of those fields.

#### Scenario: No skeleton-edit affordance in the panel

- **WHEN** the panel is inspected for inputs that bind to `groups[*].nodeFront/nodeBack/nodeHip*/nodeFoot`, `groups[*].segmentIds`, `groups[*].type`, `groups[*].attachedToSpineId`, `segments`, or `modelRotation`
- **THEN** no such inputs exist in `StepAnimate.tsx` or any component it renders

#### Scenario: Step 1 and step 2 behavior unchanged

- **WHEN** the user navigates back to step 1 or step 2 after this change ships
- **THEN** both steps render and behave identically to before this change, including segment selection, sphere selection, group creation, node placement, and model rotation

### Requirement: Existing animation config is preserved

Existing values stored in `useStudioStore.animationConfig` and `useStudioStore.showAttractor` SHALL remain valid across this change. The control bindings, ranges, step sizes, and the resulting effect on the live dragon SHALL be identical before and after the rebuild for every relocated control. No `animationConfig` field SHALL be renamed or removed by this change.

#### Scenario: Tuned values survive the rebuild

- **WHEN** the user has previously tuned `maxSpeed` and `followDistance` and the studio app updates to include this change
- **THEN** the persisted values continue to drive the live dragon and the corresponding sliders in the Head / Target subsection reflect those values

#### Scenario: No motion regression

- **WHEN** the dragon animates in studio step 3 before and after this change with the same persisted `animationConfig`
- **THEN** the motion is visually identical; only the debug overlay differs
