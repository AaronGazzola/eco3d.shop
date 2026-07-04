## ADDED Requirements

### Requirement: Shareable config link applies config and view from query params

The animate page (`/admin/animate`) SHALL read query params on load and apply them: `tab=simulate` selects the Simulate tab; `sim=<base64>` decodes a base64-encoded `SimConfig` JSON and applies it through the existing `applySimConfig` path (unknown or missing keys ignored); `t=<seconds>` runs the simulation deterministically to that sim-time and then freezes; `overlay=<comma-separated names>` enables the named overlays. The Simulate sidebar SHALL provide a **Copy link** action that builds this URL from the current config and view state.

#### Scenario: Config link applies a full config on load

- **WHEN** the page loads with `?tab=simulate&sim=<base64 of a SimConfig>`
- **THEN** the Simulate tab is active and every field present in the decoded config is applied to the running sim config

#### Scenario: Freeze-at-time from the link

- **WHEN** the page loads with `?t=2.5`
- **THEN** the simulation advances deterministically to sim-time 2.5 s and halts there in a frozen state

#### Scenario: Malformed config degrades safely

- **WHEN** the `sim` param decodes to JSON containing unknown keys or omits known keys
- **THEN** known keys are applied, unknown keys are ignored, and no error is thrown

#### Scenario: Copy link round-trips the current state

- **WHEN** the user clicks **Copy link** after tuning the config and enabling overlays
- **THEN** the copied URL, when opened, reproduces the same config, selected tab, and overlays

### Requirement: Freeze-frame, step, seek and slow-motion playback

The studio SHALL expose deterministic playback controls in the Simulate sidebar and on `window.__studio`: pause/play, step ±1 frame, seek to a sim-time, and a speed multiplier in the range 0.1×–1×. Stepping SHALL advance the existing fixed `1/120` s pipeline by whole ticks via a single stepping primitive, decoupled from wall-clock frame time, so a given sim-time yields the same frame across reloads and headless runs.

#### Scenario: Pause freezes on the current frame

- **WHEN** the user pauses a running sim
- **THEN** the rendered body holds its exact current transforms and the sim does not advance until resumed

#### Scenario: Single-frame step

- **WHEN** the user clicks step +1 while frozen
- **THEN** the sim advances exactly one `1/120` s tick and re-freezes

#### Scenario: Deterministic seek

- **WHEN** `window.__studio.seek(2.0)` is called
- **THEN** the sim is reset and replayed to sim-time 2.0 s, producing the same frame as a live run reaching 2.0 s

#### Scenario: Slow-motion playback

- **WHEN** the speed multiplier is set to 0.25× and the sim is played
- **THEN** the sim advances at one quarter of real-time while stepping the same fixed ticks

### Requirement: Headless harness can drive freeze and overlays

`window.__studio` SHALL provide methods to control playback and overlays for headless capture: at minimum `pause()`, `play()`, `step(n)`, `seek(t)`, `speed(x)`, `setOverlays(names)`, `isolateLimb(id)`, and `copyLink()`/`buildLink()`. These SHALL operate on the same view state as the sidebar controls.

#### Scenario: Harness freezes and enables an overlay

- **WHEN** the observe script calls `__studio.seek(1.5)` then `__studio.setOverlays(["wave"])`
- **THEN** the sim is frozen at 1.5 s with the wave overlay drawn, ready for screenshot capture

### Requirement: Wave/phase overlay

An overlay named `wave` SHALL draw, per girdle, the measured body-wave phase and a marker at the foot's maximum-forward reach, derived from the existing measured-reach signal in the locomotion loop. The overlay SHALL be read-only and SHALL be toggleable from the sidebar and via `overlay=wave`.

#### Scenario: Wave overlay shows max-forward reach

- **WHEN** the `wave` overlay is enabled during a walk
- **THEN** each girdle shows its current measured phase and a marker indicating where the foot reaches maximum-forward, with no change to body motion

### Requirement: Stance/swing leg coloring and limb isolation

An overlay named `stance` SHALL color each leg green while it is gripping or in its power stroke and red while it is swinging, using the loop's existing grip-window classification. An `isolateLimb(id)` option SHALL dim the opacity of all segments and legs except the selected limb. Both SHALL be read-only and toggleable from the sidebar and via query param. Toggling an overlay off SHALL restore original materials.

#### Scenario: Legs colored by stance phase

- **WHEN** the `stance` overlay is enabled during a walk
- **THEN** a leg in its grip/power-stroke window renders green and a swinging leg renders red

#### Scenario: Isolate one limb

- **WHEN** `isolateLimb("FL")` is set
- **THEN** the front-left limb renders at full opacity and all other segments and legs render dimmed

#### Scenario: Overlay restore on toggle off

- **WHEN** the `stance` overlay is toggled off
- **THEN** all leg materials return to their original appearance

### Requirement: Observation tooling does not alter physics

All playback controls and overlays SHALL be read-only with respect to the simulation: they SHALL NOT modify any rigid body, joint, motor, CPG state, or muscle parameter. Enabling or disabling any overlay, or pausing/stepping/seeking, SHALL NOT change the trajectory the sim would otherwise produce for a given config and sim-time.

#### Scenario: Overlays do not perturb the trajectory

- **WHEN** the same config is run to the same sim-time once with overlays on and once with overlays off
- **THEN** the body transforms at that sim-time are identical
