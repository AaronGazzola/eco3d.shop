# Locomotion — Turning via left/right differential CPG drive (delta)

## ADDED Requirements

### Requirement: CPG turn bias steers the body via left/right drive asymmetry

`stepCpg` SHALL accept an optional 8th parameter `turnBias: number` (default `0`), clamped to
`[-1, +1]`, that applies a **left/right multiplicative factor** to the per-oscillator drive used
for both the frequency term `νᵢ = driveᵢ · excitability · eᵢ` and the amplitude target
`Rᵢ = driveᵢ · P(driveᵢ, d_thᵢ)`.

**User-facing convention.** Positive `turnBias` SHALL steer the body toward its **own left** —
i.e. under the coupled drive + drag environment, the body's center-of-mass trajectory SHALL
curve left and lateral displacement SHALL be positive (left-positive: leftward in the body's
own frame). Negative `turnBias` SHALL steer the body right. `turnBias = 0` SHALL leave the
body swimming straight.

**Wiring.** With `tb = clamp(turnBias, -1, +1)`:

- axial oscillators `0 .. n-1` AND limb oscillators `LIMB_LF`, `LIMB_LH` SHALL have their
  drive multiplied by `leftFactor = 1 − max(0, -tb)` (weakened when `tb < 0`),
- axial oscillators `n .. 2n-1` AND limb oscillators `LIMB_RF`, `LIMB_RH` SHALL have their
  drive multiplied by `rightFactor = 1 − max(0, +tb)` (weakened when `tb > 0`).

The signs are calibrated empirically against the body's drift direction under the Ekeberg
muscle + drag pipeline so that the user-facing convention above holds. Note that the
side-to-CPG-index naming (`0..n-1` as "left" etc.) is internal CPG nomenclature; the
calibration owns the relationship between sign and turn direction.

The turn factor SHALL compose **multiplicatively** with the existing front/back factor
(`frontDrive` substitution for `frontSegments` rostral indices on each chain): the front
factor is applied first to choose the per-index base drive, and the turn factor is applied
second on top of it. When `turnBias = 0` the `driveArr` SHALL be bit-exactly equal to the
build that pre-existed this change, so prior recorded runs reproduce unchanged.

#### Scenario: turnBias = 0 reproduces the un-biased per-oscillator drive

- **GIVEN** any `CpgSpec` and any `(drive, frontDrive, frontSegments)`
- **WHEN** `stepCpg(state, spec, drive, exc, dt, frontDrive, frontSegments, 0)` is called
- **THEN** the internal per-oscillator drive each oscillator sees is identical to the same
  call without the `turnBias` argument (bit-exact, both sides multiplied by `1`)

#### Scenario: turnBias > 0 steers the body left

- **GIVEN** a 3D coupled run with drag on, drive ≈ paper-faithful (the gate script uses
  `DRIVE = 3.0`, `EXC = 0.15`, `GAIN = 12`), front segments off (`frontSegments = 0`), and
  `turnBias = +0.3`
- **WHEN** the run records ≥ 8 seconds
- **THEN** every axial oscillator in `n..2n-1` and limb oscillators `LIMB_RF`/`LIMB_RH`
  receive drive `drive · 0.7`; every axial oscillator in `0..n-1` and limb oscillators
  `LIMB_LF`/`LIMB_LH` receive `drive · 1.0`; the lateral COM displacement (left-positive,
  perpendicular to the body's initial forward) is `> +0.05` world units while the body
  continues to advance forward

#### Scenario: turnBias < 0 mirrors the steer to the other side

- **GIVEN** the same coupled run setup with `turnBias = -0.3` instead
- **THEN** the indices in `0..n-1` and `LIMB_LF`/`LIMB_LH` receive `drive · 0.7`, the indices
  in `n..2n-1` and `LIMB_RF`/`LIMB_RH` receive `drive · 1.0`, and the lateral COM displacement
  is `< -0.05` (rightward)

#### Scenario: Turn bias composes with front/back differential drive

- **GIVEN** `frontSegments = 2`, `frontDrive = 0.6`, `drive = 1.0`, `turnBias = +0.3`, axial
  size `n ≥ 3`
- **THEN** the axial oscillator at index `0` receives drive `1.0 · 0.6 · 1.0 = 0.6` (front
  factor first, left-side turn factor `1.0` second), the axial oscillator at index `n`
  receives `1.0 · 0.6 · 0.7 = 0.42` (front factor, right-side turn factor `0.7`), the axial
  oscillator at index `2` (past front) receives `1.0 · 1.0 · 1.0 = 1.0`, and the axial
  oscillator at index `n + 2` receives `1.0 · 1.0 · 0.7 = 0.7`

#### Scenario: turnBias clamps to ±1

- **WHEN** `stepCpg` is called with `turnBias` set to `2.5` (or `-2.5`)
- **THEN** the value used internally is `+1` (or `-1`) — the over-driven side stays at the
  global drive while the weakened side is driven to `0` — and `stepCpg` does not throw

### Requirement: Turn bias is exposed in the animate store

`animateStore` SHALL expose `turnBias: number` (default `0`) on `SimConfig`, included in
`DEFAULT_SIM_CONFIG` and `pickSimConfig` so it persists with the rest of the sim configuration,
with a `setTurnBias(v)` setter that clamps `v` to `[-1, +1]` before writing. Switching the
active tab to `'calibrate'` SHALL NOT reset `turnBias` — like `environmentEnabled`, it is a
persistent preference, not a mode.

#### Scenario: Turn bias persists across config save/load

- **GIVEN** the user moves the Turn bias slider to `+0.4` and saves the sim config
- **WHEN** the config is reloaded
- **THEN** `turnBias === 0.4`

#### Scenario: Setter clamps out-of-range input

- **WHEN** `setTurnBias(1.5)` is called
- **THEN** `turnBias === 1.0` (and analogously for `-1.5 → -1.0`)

### Requirement: Simulate sidebar exposes the turn bias control

The Simulate tab in `AnimateSidebar` SHALL render a **Turn bias** slider bound to `turnBias` /
`setTurnBias`, with range `[-1, +1]`, step `0.01`, default `0`, displayed value to 2 decimal
places, and a tip identifying it as the paper's left/right differential CPG drive (positive
curves the body toward its own left, negative toward its own right, zero off). The slider
SHALL be placed immediately after the existing Front drive slider so the front/back and
left/right asymmetry knobs sit together.

#### Scenario: Turn bias slider is present and live

- **GIVEN** the Simulate tab with a rig loaded and a coupled run active
- **WHEN** the user moves the Turn bias slider to `+0.3`
- **THEN** `turnBias` updates to `0.3` and the body's COM trajectory begins to curve toward
  the body's own left within the next few cycles (visible in the canvas)

### Requirement: __studio hook exposes a turn setter

The `window.__studio` observation hook SHALL expose `turn(bias: number)` that calls
`setTurnBias(bias)` on the animate store, mirroring the existing `front(segments, drive)` and
`tune(drive, exc)` entries, so headless tuning scripts and the user's console can drive
turning without going through the sidebar.

#### Scenario: __studio.turn drives the bias

- **GIVEN** a rig loaded in the studio
- **WHEN** the user runs `window.__studio.turn(0.5)` in the browser console
- **THEN** `turnBias === 0.5` and a subsequent `window.__studio.drive(true)` starts a coupled
  run that curves left
