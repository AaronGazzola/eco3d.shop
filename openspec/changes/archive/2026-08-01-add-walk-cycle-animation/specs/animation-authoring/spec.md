## ADDED Requirements

### Requirement: Animate studio reuses the studio frame

The `/admin/animate` route SHALL compose `AdminFrame` with a `StudioCanvas`-based scene and a collapsible `AnimateSidebar`, structurally matching the other studio steps. The scene SHALL render `AnimatedDragon` for the rig currently loaded in the shared store (`segments`, `groups`, `modelRotation`). A page-local `animateStore` SHALL hold only view, playback, and authoring state (selected cycle, selected keyframe, playing, speed, scrub phase) — no physics/sim config.

#### Scenario: Animate page renders the loaded rig animated

- **WHEN** an admin opens `/admin/animate` with a rig loaded
- **THEN** the 3D scene renders that rig via `AnimatedDragon` inside the shared studio frame with the collapsible sidebar

### Requirement: Transport and keyframe editing

The sidebar SHALL provide transport controls (play/pause, a speed control, and a scrub over the cycle phase) and a keyframe list for the active cycle supporting add, delete, reorder, and selecting the keyframe being edited. Pausing and scrubbing SHALL show the interpolated pose at the scrubbed phase.

#### Scenario: Scrub shows the interpolated pose

- **WHEN** playback is paused and the phase is scrubbed
- **THEN** the rendered dragon shows the runtime pose for that phase

#### Scenario: Editing a keyframe

- **WHEN** an admin adds or selects a keyframe and edits it
- **THEN** subsequent playback reflects the edited keyframe

### Requirement: Per-joint pose editor

The sidebar SHALL expose a per-joint pose editor ordered head → each spine → its attached legs → tail, with one yaw control and one pitch control per joint that write the selected keyframe's joint offset for that group. Each control SHALL span a fixed range wide enough to author any pose the author judges realistic. The editor SHALL NOT read or modify `angleCaps`.

#### Scenario: Joint control spans the full authoring range

- **WHEN** an admin drags a joint's yaw control to its extreme
- **THEN** the authored value reaches the control's fixed limit, and no stored `angleCaps` value is read or written

### Requirement: Cycles persist to dragon_models.animations

The studio SHALL save authored cycles to a JSON `animations` column on the loaded `dragon_models` row, as a map `{ [cycleName]: Cycle }`. The save action SHALL write only `animations` (never `groups` or `role_tags`), validate admin auth, and reload SHALL restore the saved cycle for editing and playback.

#### Scenario: Save and reload a cycle

- **WHEN** an admin authors the `walk` cycle for a rig and saves, then reloads the rig
- **THEN** `dragon_models.animations.walk` holds the authored cycle, `groups` and `role_tags` are unchanged, and the studio replays the saved walk

### Requirement: Animate is step 3 of the studio stepper

The `/admin/animate` route SHALL be reachable as step 3 "Animate" in the studio stepper, after Pick and Group.

#### Scenario: Stepper navigates to Animate

- **WHEN** a rig has groups and the admin advances the stepper
- **THEN** step 3 "Animate" navigates to `/admin/animate`
