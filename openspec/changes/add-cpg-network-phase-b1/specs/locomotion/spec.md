## ADDED Requirements

### Requirement: CPG axial double-chain network

The system SHALL provide a central pattern generator at `app/game/locomotion/cpg.ts` modelling the axial double chain from Knüsel et al. (2020) §2–§3. For a `BodySpec` with `N` axial chain segments it SHALL maintain `2N` oscillators — a left oscillator per segment (indices `0..N-1`) and a right oscillator per segment (indices `N..2N-1`) — each with a phase `θ` and amplitude `r`.

`stepCpg(state, spec, drive, excitability, dt)` SHALL integrate, per oscillator `i`, the phase equation `θ̇ᵢ = 2π·νᵢ + Σⱼ rⱼ·wᵢⱼ·sin(θⱼ − θᵢ − φᵢⱼ)` and the amplitude equation `ṙᵢ = a·(Rᵢ − rᵢ)` (the proprioceptive feedback term is omitted — `s=0`), with `νᵢ = drive·excitability·eᵢ`, `Rᵢ = drive·P(drive, d_thᵢ)`, and `P(d, d_th) = 1/(1 + e^(b·(d − d_th)))`. Constants: `a=5`, `b=500`, axial excitability `eᵢ=1.1`, axial saturation threshold `d_thᵢ=3`. Integration SHALL use a fixed 2 ms sub-step with frame `dt` clamped to 50 ms; phases SHALL be kept finite (wrapped mod 2π).

`oscillatorOutput(state, i)` SHALL return `rᵢ·(1 + cos θᵢ)` (one-sided, ≥ 0). `signedActivation(state, k)` SHALL return `oscillatorOutput(left k) − oscillatorOutput(right k)` for segment `k`.

#### Scenario: Oscillator count matches the axial chain

- **WHEN** `initCpgState(spec)` is called for a `BodySpec` with `N` axial segments
- **THEN** the state holds `2N` phases and `2N` amplitudes, all amplitudes starting at 0 (or a documented small seed)

#### Scenario: Output is one-sided and amplitude tracks drive

- **GIVEN** a CPG stepped with `drive=1.0`, `excitability=1.0`, below the axial saturation threshold
- **WHEN** it is stepped until amplitudes converge
- **THEN** each `oscillatorOutput` stays ≥ 0 and each amplitude `r` approaches `drive·P(drive,3) ≈ drive` (since `P≈1` for `drive ≪ 3`)

#### Scenario: Drive above the saturation threshold collapses amplitude

- **GIVEN** the CPG stepped with `drive` well above `d_th = 3`
- **WHEN** amplitudes converge
- **THEN** each target amplitude `R = drive·P(drive,3)` is driven toward 0 (the saturation sigmoid `P → 0`)

### Requirement: Length-weighted intersegmental phase bias

The intersegmental couplings SHALL use a length-weighted phase bias: for the head→tail coupling between adjacent segments `k` and `k+1` (same chain side), `φ = (lengthₖ / Σ lengths) · 2π · BODY_WAVES` with strength `w=5`; the tail→head coupling SHALL use `−φ` with strength `w=1`. The intrasegmental left↔right coupling SHALL use `w=10, φ=π` (antiphase). `BODY_WAVES` SHALL be a single named constant (default `1.58`).

When all segments are equal length, the per-interval bias SHALL reduce to a uniform value and the total head→tail lag SHALL equal `2π·BODY_WAVES` (matching the paper's uniform `±0.415` rad at `N=25`, `BODY_WAVES≈1.58`).

#### Scenario: Equal segments give uniform bias

- **GIVEN** a `BodySpec` whose axial segments are all equal length
- **WHEN** `buildCpgSpec` builds the couplings
- **THEN** every head→tail intersegmental bias is equal and their sum across the chain equals `2π·BODY_WAVES` within floating-point tolerance

#### Scenario: Unequal segments weight bias by length

- **GIVEN** a `BodySpec` where segment A is twice the length of segment B
- **WHEN** `buildCpgSpec` builds the couplings
- **THEN** the head→tail bias across segment A is twice that across segment B, and the total across the chain still equals `2π·BODY_WAVES`

### Requirement: CPG preview runs without driving the body

`animateStore` SHALL expose `cpgDrive` (default `1.0`), `cpgExcitability` (default `1.0`), `cpgRunning` (default `false`), and `cpgRecording` (default `false`) with setters. While `cpgRunning` is true and the active tab is Simulate (not calibrating), `useLocomotion` SHALL step the CPG each frame using `cpgDrive` and `cpgExcitability`. The CPG step SHALL NOT write to any body pivot or the root group — the rendered rig stays at its manual/rest pose throughout B1.

Switching the active tab to Calibrate SHALL set `cpgRunning` and `cpgRecording` to `false`.

#### Scenario: Running the CPG leaves the body at rest

- **GIVEN** the Simulate tab with a rig loaded and `cpgRunning` true
- **WHEN** several frames elapse
- **THEN** the CPG state advances (phases increase) but every chain pivot and the root group remain at their manual/rest transforms

### Requirement: CPG space-time capture

`diagnostics.ts` SHALL provide `buildCpgCaptureSpec(spec)` and `buildCpgSample(t, state, spec)`, and `serializeCapture` (or a CPG-specific serializer) SHALL emit a **space-time** section: one row per segment (head at top, tail at bottom), columns advancing in time, each cell a glyph chosen by the sign and magnitude of that segment's signed activation. The capture SHALL also include a per-segment phase snapshot (showing head→tail phase lag) and the measured fundamental frequency of segment 0 (from its signed-activation zero crossings).

While `cpgRecording` is true and the CPG is running, `useLocomotion` SHALL append a CPG sample at ~50 ms intervals. On the falling edge of `cpgRecording`, it SHALL serialize the buffer and POST it to `/api/diagnostics`, writing the returned path to `lastCapturePath`.

#### Scenario: A traveling wave reads as diagonal stripes

- **GIVEN** the CPG has been run and recorded for a few seconds at `drive=1.0`
- **WHEN** the capture is written and read
- **THEN** the space-time section shows bands of one sign progressing monotonically from the head row toward the tail row across columns (a head→tail traveling wave), and the per-segment phase snapshot shows lag increasing monotonically head→tail

#### Scenario: Measured frequency matches drive × excitability × e

- **GIVEN** a recorded CPG run at `drive=d`, `excitability=1.0`, axial `e=1.1`
- **THEN** the reported fundamental frequency is within tolerance of `ν = d·1.0·1.1` Hz

### Requirement: Simulate sidebar exposes CPG controls

The Simulate tab in `AnimateSidebar` SHALL render a **CPG (Phase B1)** section containing: a **drive** slider (range `0–2`, bound to `cpgDrive`), an **excitability** slider (range `0–2`, default `1.0`, bound to `cpgExcitability`), a **Run / Pause CPG** toggle bound to `cpgRunning`, and a **Record / Stop** toggle bound to `cpgRecording` with the last capture path shown beneath it. These controls are additive and SHALL NOT remove the existing A-phase solver controls.

#### Scenario: CPG controls are present and live

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user moves the drive slider and clicks Run CPG
- **THEN** `cpgDrive` updates and the CPG begins stepping (verifiable by a subsequent capture), with the solver controls still present
