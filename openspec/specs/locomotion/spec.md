# locomotion Specification

## Purpose
TBD - created by archiving change add-fk-renderer-phase-a2. Update Purpose after archive.
## Requirements
### Requirement: Body spec is derived from the rig

The system SHALL build the locomotion body as a **3D chain of Rapier rigid bodies** from the node skeleton, using the nodes' full `x/y/z` (the authored 3D rest pose). A builder (`body3d.ts`) SHALL walk the axial chain `flattenSkeleton(buildSkeletonTree(groups))` (head → spine → tail; legs excluded) and produce:

- One **dynamic rigid body** per axial segment, placed at the segment's rest world transform (position from the node skeleton; orientation aligning the segment's local long axis toward the next node).
- A **capsule collider** per body, half-length from node spacing and radius from `STD_SEGMENT_WIDTH`. The collider's **mass SHALL be set to the group's `nodeWeight`** (default `DEFAULT_AXIAL_WEIGHT` for head/spine/tail) — never derived from mesh geometry. The engine SHALL derive the rotational inertia tensor from the capsule shape + that mass.
- For each non-head segment, a **revolute joint** to its parent, anchored at the shared node (`parent.nodeBack`), with axis = the segment's local up (yaw undulation) and angle **limits** `[−yawBackwardLimit, +yawForwardLimit]` from `effectiveAngleCaps`.
- The head segment is the free **root** body (no joint above it).

The mesh SHALL NOT feed any dynamics quantity (mass, inertia, collider size all come from `nodeWeight` + node geometry + `STD_SEGMENT_WIDTH`).

#### Scenario: One rigid body per axial segment, mass from nodeWeight

- **WHEN** the body is built for a rig whose chain is head → spine1 → spine2 → tail with no authored `nodeWeight`
- **THEN** four dynamic rigid bodies exist in head→tail order, each with mass `DEFAULT_AXIAL_WEIGHT`, and three revolute joints connect them

#### Scenario: Joint limits come from angle caps

- **WHEN** the body is built for a rig whose `spine1.angleCaps.yaw` is `0.5 rad`
- **THEN** the revolute joint feeding `spine1` has a yaw limit of `±0.5 rad` (the engine stops it at the cap)

#### Scenario: Mesh size does not affect the body

- **GIVEN** two rigs identical except one segment's mesh is scaled 2× larger
- **THEN** that segment's rigid-body mass, collider size, and inertia are identical between the two rigs

### Requirement: Per-node weight is authored in Calibrate

`BodyGroup` SHALL carry an optional `nodeWeight?: number` (kilograms) beside `angleCaps`. The Calibrate tab SHALL expose a per-chain-group weight control bound to `nodeWeight`, with the type default shown when no value is authored. `nodeWeight` SHALL persist in the saved model config exactly as `angleCaps` does (save/load through `sharedStore`).

The four leg groups SHALL be **ganged**: editing the weight of any leg group SHALL write the same `nodeWeight` to all four leg groups (left + right, fore + hind) so the legs always remain equal. Head, spine, and tail groups are authored independently of one another.

When a group has no authored `nodeWeight`, `buildBodySpec` SHALL substitute the documented type default (`DEFAULT_AXIAL_WEIGHT` for head/spine/tail, `DEFAULT_LEG_WEIGHT` for legs), so an un-authored rig is uniform by default.

#### Scenario: Weight slider authors and persists nodeWeight

- **GIVEN** the Calibrate tab with a rig loaded
- **WHEN** the user sets the spine1 weight slider to a value and saves the config
- **THEN** `spine1.nodeWeight` holds that value and reloading the config restores it

#### Scenario: Editing one leg sets all four legs

- **GIVEN** a rig with four leg groups
- **WHEN** the user changes the weight on one leg's control
- **THEN** all four leg groups' `nodeWeight` are set to the same value (legs stay equal)

#### Scenario: Un-authored groups fall back to uniform defaults

- **GIVEN** a saved config with no `nodeWeight` on any group
- **WHEN** the rig is loaded and `buildBodySpec` runs
- **THEN** all axial segments take `DEFAULT_AXIAL_WEIGHT` and all legs take `DEFAULT_LEG_WEIGHT` (uniform default, no migration required)

### Requirement: Manual pose state is the render source when not calibrating

The `animateStore` SHALL carry a `manualPose` field of shape `{ rootX: number; rootZ: number; rootYawRad: number; jointAnglesRad: Record<string, number> }` with setters that update individual fields and a `resetManualPose` action that returns all fields to zero / empty.

When `animateTab !== 'calibrate'`, `useLocomotion` SHALL on each frame:

- write `manualPose.rootX` to the bound root group's `position.x`,
- write `manualPose.rootZ` to the bound root group's `position.z`,
- write `manualPose.rootYawRad` (Y-axis) to the bound root group's `quaternion`,
- write each chain joint's pivot quaternion as `setFromAxisAngle(Y_AXIS, clamp(manualPose.jointAnglesRad[childGroupId] ?? 0, [-child.yawBackwardLimit, +child.yawForwardLimit]))`, and
- write the head pivot's quaternion to the identity.

When `animateTab === 'calibrate'`, the existing rest-pose-plus-calibrating-group behavior is preserved verbatim: every chain group's pivot is set to identity *except* the calibrating group, which receives the calibration yaw + pitch quaternion.

#### Scenario: Moving the root x slider translates the rendered body

- **GIVEN** `animateTab === 'simulate'` and the rig is loaded
- **WHEN** `manualPose.rootX` is set to `2`
- **THEN** the root group bound by `rootRef` has `position.x === 2` after the next frame

#### Scenario: A joint slider past the cap clamps the rendered joint

- **GIVEN** `animateTab === 'simulate'` and `spine1.yawForwardLimit === 0.5`
- **WHEN** `manualPose.jointAnglesRad['spine1-id']` is set to `1.2`
- **THEN** the spine1 pivot's quaternion equals `setFromAxisAngle(Y_AXIS, 0.5)` (the clamped value), not `1.2`

#### Scenario: Calibration overrides manual pose for the calibrating group only

- **GIVEN** `animateTab === 'calibrate'`, `calibratingGroupId === 'spine2-id'`, and `manualPose.jointAnglesRad` is `{ 'spine1-id': 0.3, 'spine2-id': 0.4 }`
- **WHEN** the next frame runs
- **THEN** `spine1`'s pivot is the identity, `spine2`'s pivot reflects the calibration yaw + pitch, and `manualPose` is not consulted for either

### Requirement: AnimatedModel's outer group binds the root ref

`AnimateScene` SHALL create a `useRef<THREE.Group | null>` and pass it as `rootRef` to `AnimatedModel`. `AnimatedModel` SHALL bind the passed `rootRef` to its outermost `<group>` (the one wrapping `ChainNode` and the top-level non-chain children).

When `rootRef` is undefined, `AnimatedModel` SHALL render without binding any ref (forward-compatible with callers that do not drive root pose).

#### Scenario: Mounted model exposes its root via the passed ref

- **GIVEN** `AnimateScene` is mounted with a non-empty rig
- **WHEN** the canvas finishes its first commit
- **THEN** `rootRef.current` is a `THREE.Group` instance whose name path roots the model

### Requirement: Legs render under their attached spine's pivot

In `AnimatedModel`, leg groups (`type === 'leg-left' | 'leg-right'`) SHALL render as children of their attached spine's `ChainNode` inner offset group (the same group that holds the spine's `GroupBody` and downstream chain children).

A leg whose `attachedToSpineId` does not resolve to a chain group SHALL render at the model root and `console.error` with the leg's `id` and the unresolved `attachedToSpineId`. The render does not throw.

A leg SHALL still register its `<group>` ref in `pivotsRef` so the Calibrate path can rotate it around its hip node.

#### Scenario: A leg attached to spine2 rotates with spine2

- **GIVEN** `legA.attachedToSpineId === 'spine2-id'`
- **WHEN** `manualPose.jointAnglesRad['spine2-id']` is set so spine2's pivot rotates by `0.3` rad
- **THEN** `legA`'s world transform reflects the same `0.3` rad rotation around spine1's `nodeBack` (the canonical joint between spine1 and spine2)

#### Scenario: A leg with a missing parent renders at the root with a console error

- **GIVEN** `legB.attachedToSpineId === 'gone-id'` and no group has `id === 'gone-id'`
- **WHEN** the model mounts
- **THEN** `legB` renders as a child of the model root, `console.error` is called once with `legB.id` and `'gone-id'`, and no exception is thrown

### Requirement: Simulate sidebar exposes manual pose sliders

The Simulate tab in `AnimateSidebar` SHALL render:

- one slider for `manualPose.rootX` with range `[-5, 5]`,
- one slider for `manualPose.rootZ` with range `[-5, 5]`,
- one slider for `manualPose.rootYawRad` with range `[-π, π]`,
- one slider per chain joint (head excluded), in head→tail order, bound to `manualPose.jointAnglesRad[childGroupId]` with a fixed range of `[-π/2, +π/2]` so the user can drag past the joint's cap and visually verify the render-side clamp, and
- a **Reset pose** button that invokes `resetManualPose`.

The Simulate tab SHALL NOT render Run / Pause, Perturb, Reset (the solver one), Record, or diagnostic readouts in this change.

#### Scenario: Joint slider count matches chain joint count

- **GIVEN** the rig has 5 chain groups (head + 3 spines + tail)
- **WHEN** the Simulate tab renders
- **THEN** the tab contains 4 joint sliders (one per chain joint) plus the 3 root sliders and the Reset pose button

#### Scenario: Reset pose clears all fields

- **GIVEN** `manualPose` has non-zero values in every field
- **WHEN** the user clicks **Reset pose**
- **THEN** `manualPose.rootX`, `rootZ`, `rootYawRad` are `0` and `jointAnglesRad` is `{}`

### Requirement: Animate store carries simulation and recording state

The `animateStore` SHALL expose:

- `simRunning: boolean` — default `false`
- `simResetSignal: number` — default `0`, incremented by `requestSimReset`
- `simKickSignal: number` — default `0`, incremented by `requestSimKick`
- `simDiagnostics: { kineticEnergy: number; comDriftFromStart: number; comX: number; comZ: number }` — default all zeros
- `simRecording: boolean` — default `false`
- `lastCapturePath: string | null` — default `null`

with setters `setSimRunning(running)`, `requestSimReset()`, `requestSimKick()`, `setSimDiagnostics(d)`, `setSimRecording(recording)`, and `setLastCapturePath(path)`.

Switching the active tab to `'calibrate'` SHALL set `simRunning` to `false` and `simRecording` to `false` in the same transition.

Calling `setSimRecording(true)` SHALL also clear `lastCapturePath` to `null` so the previously written path is not mistaken for the new recording.

#### Scenario: Recording start clears the last capture path

- **GIVEN** `lastCapturePath === 'documentation/diagnostics/capture-2026-05-28T12-00-00-000Z.md'`
- **WHEN** `setSimRecording(true)` is called
- **THEN** `simRecording` is `true` and `lastCapturePath` is `null`

#### Scenario: Switching to Calibrate stops the sim and any recording

- **GIVEN** `animateTab === 'simulate'`, `simRunning === true`, `simRecording === true`
- **WHEN** `setAnimateTab('calibrate')` is called
- **THEN** `animateTab === 'calibrate'`, `simRunning === false`, and `simRecording === false`

### Requirement: useLocomotion drives the rendered scene from solver state while running

When `simRunning` is `true` and a non-null `BodySpec` resolves from the current rig, `useLocomotion` SHALL each frame:

1. Step the solver via `stepSolver(state, spec, dt)`.
2. Write `state.rootX` to the bound root group's `position.x`, `state.rootZ` to `position.z`, and `setFromAxisAngle(Y_AXIS, state.rootHeadingY)` to the root group's `quaternion`.
3. Write each chain joint's pivot quaternion as `setFromAxisAngle(Y_AXIS, state.jointAngles[i])` — *unclamped*, because A3 has no caps (the visual gate observes whether the solver naturally stays in its rest configuration with zero forces).
4. Hold the head pivot's quaternion at the identity.
5. Reset every leg's local `quaternion` to identity and `position` to `(0, 0, 0)`, the same A2 rule.

When `simRunning` is `false`, the A2 manual-pose path SHALL render the scene unchanged (sliders drive root + chain pivots, identity for the head, identity for legs).

#### Scenario: Rising edge of simRunning initializes solver state from manualPose

- **GIVEN** `simRunning === false`, `manualPose.rootX === 1.0`, `manualPose.rootYawRad === 0.5`, `manualPose.jointAnglesRad['spine1-id'] === 0.3`
- **WHEN** `setSimRunning(true)` is called and one frame is rendered
- **THEN** the solver state was initialized with `rootX === 1.0`, `rootHeadingY === 0.5`, and the joint angle for `spine1-id` set to `0.3` before the first `stepSolver` call; all rates start at zero

#### Scenario: Falling edge of simRunning returns rendering to manual pose

- **GIVEN** the solver is running with `state.rootX === 3.5` while `manualPose.rootX === 0`
- **WHEN** `setSimRunning(false)` is called and one frame is rendered
- **THEN** the bound root group's `position.x` is `0` (back to the manual-pose path), not `3.5`

### Requirement: Solver diagnostics push to the store every 100 ms

While the solver is running, `useLocomotion` SHALL accumulate frame `dt` into a diagnostics timer; whenever the accumulator passes `0.1` seconds it SHALL invoke `setSimDiagnostics({ kineticEnergy, comX, comZ, comDriftFromStart, maxJointFracOfCap })` with values derived from the current solver state and the COM at the most recent solver-start moment, then subtract `0.1` from the accumulator.

`maxJointFracOfCap` SHALL be the maximum over all joints of `|jointAngle| / cap`, where `cap` is `yawForwardLimit` for non-negative angles and `yawBackwardLimit` for negative angles.

When `simRunning` becomes `false`, the diagnostics push SHALL stop until the solver runs again, but the last-pushed values SHALL remain in the store.

#### Scenario: Cap fraction reflects an over-cap transient then settles

- **GIVEN** the solver is running and the body has been perturbed
- **WHEN** the chain swings such that a joint momentarily exceeds its cap, then settles
- **THEN** `simDiagnostics.maxJointFracOfCap` rises above `1.0` during the transient and returns to `≤ 1.0` once the body comes to rest

### Requirement: Record/Stop captures a solver run

The Simulate sidebar SHALL expose a **Record / Stop** toggle. When `simRecording` is `true` and the solver is running, `useLocomotion` SHALL append a `CaptureSample` (built by `buildSample(t, state, spec, baseCom)`) to an in-memory buffer at a target rate of one sample per 50 ms of solver time, where `baseCom` is captured at the moment `simRecording` rose to `true` and `t` is solver time elapsed since that moment.

On the falling edge of `simRecording`, `useLocomotion` SHALL invoke `serializeCapture(buildCaptureSpec(spec), subsampleSamples(buffer, 160))`, POST the resulting markdown to `/api/diagnostics`, and on a successful response set `lastCapturePath` to the returned path. On any non-2xx response or thrown error, `useLocomotion` SHALL log the error via `console.error` and set `lastCapturePath` to `'failed — see console'`.

Recording while the solver is paused SHALL not push samples but SHALL NOT clear the buffer; resuming the solver continues the same recording with `t` continuing from where it left off in solver-time.

#### Scenario: A complete capture writes a markdown file

- **GIVEN** `simRunning === true`, a kick has fired, the user clicks Record, runs for 2 seconds of solver time, then clicks Stop
- **WHEN** the POST to `/api/diagnostics` returns `200` with `{ path: 'documentation/diagnostics/capture-X.md' }`
- **THEN** `lastCapturePath === 'documentation/diagnostics/capture-X.md'` and the file exists with at least one `## scalars` row whose `rootX` is close to `1.0`

### Requirement: Simulate sidebar exposes solver controls

The Simulate tab in `AnimateSidebar` SHALL render, above the existing manual-pose sliders and Reset pose button:

- a **Run / Pause** toggle button bound to `simRunning`,
- a **Reset** button bound to `requestSimReset`,
- a **Kick translation** button bound to `requestSimKick`,
- a **Kick joints** button bound to `requestSimPerturb`,
- a **Record / Stop** toggle button bound to `simRecording` with the path of the last successful capture displayed beneath it when set,
- a diagnostics readout panel showing `simDiagnostics.kineticEnergy` (exponential, 2 sig figs), `simDiagnostics.comDriftFromStart` (exponential, 2 sig figs), and `simDiagnostics.maxJointFracOfCap` (percentage, 0 decimals).

While `simRunning` is `true`, the manual pose sliders SHALL be visibly disabled (reduced opacity and `pointer-events: none`) so the user cannot edit fields the solver is currently overwriting; the **Reset pose** button SHALL also be disabled. The solver-control buttons remain enabled.

#### Scenario: Kick joints button is present and excites the chain

- **GIVEN** the Simulate tab is open, a rig loaded, and the solver running
- **WHEN** the user clicks **Kick joints**
- **THEN** the chain visibly whips and then settles, and the `Max joint / cap` readout rises during the transient before returning toward or below 100%

#### Scenario: Pose sliders disable while running

- **GIVEN** the Simulate tab is open with a rig loaded
- **WHEN** the user clicks Run
- **THEN** the manual pose sliders and the Reset pose button visibly dim and stop accepting input; Run / Pause, Reset, Kick translation, Kick joints, and Record / Stop remain active

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

### Requirement: Ekeberg axial muscle torque

The system SHALL provide an Ekeberg virtual-muscle model at `app/game/locomotion/muscles.ts`. For an axial joint with physical angle `φ`, angular rate `φ̇`, and segment muscle activations `Mˡ`, `Mʳ`, the joint torque SHALL be:

`T = α·(Mˡ − Mʳ) − β·(Mˡ + Mʳ + γ)·φ − δ·φ̇`

with constants from reference Table 5 (simulation column): `α=0.4`, `β=1.2`, `γ=0.2`, `δ=0.1`. A per-segment activation delay of `DELAY_MS=10` SHALL sit between the supplied activation input and the `Mˡ/Mʳ` used in the torque (a ring buffer of recent inputs).

#### Scenario: Pure active term with zero joint angle

- **GIVEN** a joint at `φ=0`, `φ̇=0`, with `Mˡ=2`, `Mʳ=0` (after the delay)
- **THEN** the torque equals `α·(2−0) = 0.8` N·m (only the active term contributes; the stiffness term is zero at `φ=0`)

#### Scenario: Stiffness term restores toward zero

- **GIVEN** a joint at `φ>0` with both activations driven to 0 (`Mˡ=Mʳ=0`)
- **THEN** the torque is `−β·γ·φ − δ·φ̇` — a negative (restoring) torque proportional to the angle, i.e. a spring pulling the joint back toward 0

### Requirement: Muscle test mode drives the body from a test sinusoid

`animateStore` SHALL expose `muscleTestRunning` (default `false`), `muscleTestFreq` (default `0.8` Hz), `muscleTestAmplitude` (default `1.0`), and `muscleTestPhasePerSeg` (default `0`) with setters. The muscle module SHALL provide a test activation source producing, per segment `k`, an antiphase one-sided pair `Mˡ = amp·(1+cos(ωt − k·phasePerSeg))` and `Mʳ = amp·(1+cos(ωt − k·phasePerSeg + π))`, `ω = 2π·freq`.

When `muscleTestRunning` is true (Simulate tab, not calibrating, `bodySpec` present), `useLocomotion` SHALL seed solver state from the manual pose on the rising edge, then each frame compute the test activations → Ekeberg torques (per joint, using the current joint angle/rate) → `stepSolver(state, spec, dt, torques)`, and write the resulting joint angles and root pose to the rig. Joint caps SHALL remain enforced by the A4 penalty limit stops (no hard clamp).

Switching to Calibrate SHALL set `muscleTestRunning` to false.

#### Scenario: A driven joint oscillates and then springs back

- **GIVEN** the muscle test running with `amplitude=1.0`, `freq=0.8`, `phasePerSeg=0`
- **WHEN** the user watches one axial joint, then clicks Pause (activations → 0)
- **THEN** while running the joint traces a bounded oscillation, and after Pause the muscle stiffness + damping return it toward 0 and hold it there (the restoring force absent in A4)

#### Scenario: Capture records the driven motion

- **GIVEN** the muscle test running and a Record→Stop cycle
- **THEN** a capture is written whose per-joint angle rows show the sinusoidal drive bounded by the joint caps, and whose KE is non-zero while driven

### Requirement: Simulate sidebar exposes the muscle test

The Simulate tab in `AnimateSidebar` SHALL render a **Muscle test (Phase B2)** section: a **Run / Pause** toggle bound to `muscleTestRunning`, a **frequency** slider (bound to `muscleTestFreq`), an **amplitude** slider (bound to `muscleTestAmplitude`), and a **phase / segment** slider (bound to `muscleTestPhasePerSeg`). Recording reuses the existing Record/Stop control and capture path. These controls are additive to the A-phase solver controls and the B1 CPG controls.

#### Scenario: Muscle test controls are present

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user clicks Run on the Muscle test block
- **THEN** the body begins to flex under muscle torque, with the solver, CPG, and muscle-test controls all present

### Requirement: Coupled CPG → muscle → body drive

`useLocomotion` SHALL provide a coupled driving mode that, each frame while active (Simulate tab, not calibrating, `bodySpec` present): (1) steps the CPG via `stepCpg(cpgState, cpgSpec, drive, excitability, dt)`; (2) for each axial joint `i`, reads the mapped CPG segment `k`'s left/right oscillator outputs as muscle activations, passes them through the per-segment 10 ms activation delay, and computes the Ekeberg torque using the current solver joint angle and rate; (3) steps the body via `stepSolver(state, spec, dt, jointTorques)`; (4) writes the resulting joint angles and root pose to the rig. The CPG and body SHALL be separate integrators sharing the frame clock; the CPG SHALL NOT read body state.

A joint-to-CPG-segment map SHALL be built once per `bodySpec` and SHALL satisfy: the number of axial joints equals the number of CPG segments minus one (the head segment carries no parent joint). This relationship SHALL be asserted so an indexing mismatch fails loudly.

#### Scenario: Coupled run produces a travelling body undulation

- **GIVEN** a rig loaded, coupled mode active, `drive≈1.0`, `excitability=1.0`
- **WHEN** the pipeline runs for a few seconds
- **THEN** the body bends in a head→tail travelling wave (each joint's angle oscillates, with phase lag accumulating head→tail), and with no environment it undulates roughly in place (no sustained net translation)

#### Scenario: Body wave corresponds to the CPG wave

- **WHEN** a coupled run is captured
- **THEN** the per-joint body-angle progression matches the CPG signed-activation progression head→tail (same direction of travel), with the body lagging the command by the muscle/body response

#### Scenario: Joint/segment count mismatch fails loudly

- **GIVEN** a `bodySpec` whose axial joint count does not equal CPG segment count − 1
- **THEN** building the coupled map throws (or `console.error`s and refuses to drive) rather than silently mis-indexing

### Requirement: Single active simulation mode

The animate store SHALL ensure at most one body-driving simulation mode is active at a time among: passive (A-phase Run), muscle test (B2), and coupled CPG drive (B3); plus the no-body CPG preview (B1). Enabling the coupled run SHALL disable the muscle test and the passive run. Switching to Calibrate SHALL disable all of them.

#### Scenario: Enabling coupled run disables the muscle test

- **GIVEN** the B2 muscle test is running
- **WHEN** the user starts the B3 coupled CPG drive
- **THEN** the muscle test stops and only the coupled pipeline drives the body

### Requirement: Combined body + CPG capture for a coupled run

A capture taken during a coupled run SHALL contain both the body section (per-joint angle rows, KE, COM drift, `maxJointFracOfCap`, node polyline, ASCII top-down) and the CPG space-time section (segment × time signed activation), so the commanded wave and the resulting body shape can be read side by side.

#### Scenario: Coupled capture shows both sections

- **WHEN** a coupled run is recorded and stopped
- **THEN** the written capture file contains both the body scalars/joints/shape sections and the CPG space-time section for the same run

### Requirement: Simulate sidebar exposes the coupled CPG drive

The Simulate tab SHALL render a **CPG drive (Phase B3)** control: a Run/Pause toggle for the coupled pipeline, reusing the B1 `drive` and `excitability` sliders and the existing Record/Stop + capture path. It SHALL be visually distinct from, and mutually exclusive with, the passive run, the B1 CPG preview, and the B2 muscle test.

#### Scenario: Coupled run control is present and exclusive

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user clicks Run on the CPG drive (Phase B3) control
- **THEN** the body undulates under CPG drive and the other driving modes are not simultaneously active

### Requirement: Anisotropic resistive-force environment

The system SHALL provide a 3D anisotropic resistive drag (`environment.ts`) applied as **external forces on the Rapier bodies**. For each axial body with world COM velocity `v`, segment long-axis unit `t̂` (from the body's orientation), length `L`, and angular velocity `ω`:

```
v_∥ = (v · t̂) · t̂          (along-body)
v_⊥ = v − v_∥              (perpendicular plane — a 3-vector)
F   = −L · (C_n · v_⊥ + C_t · v_∥)
τ   = −L · C_ω · ω
```

`F` SHALL be added at the body COM and `τ` as an external torque, each step before `world.step()`. Constants `C_n`/`C_t`/`C_ω` (`DRAG_NORMAL/TANGENT/ANGULAR`) are documented and re-confirmed at the 3D gate; the anisotropy ratio `C_n / C_t` SHALL be preserved at ≥ ~10:1. The drag is purely velocity-dependent (zero at rest) and dissipative.

#### Scenario: Stationary body has zero drag

- **GIVEN** all bodies at rest
- **THEN** the drag contributes zero force and zero torque

#### Scenario: Sideways drag exceeds along-axis drag

- **GIVEN** a body moving at unit speed perpendicular to its long axis vs along it
- **THEN** the perpendicular drag force magnitude is `C_n / C_t` (≥ ~10) times the along-axis magnitude

### Requirement: Environment toggle in the store

`animateStore` SHALL expose `environmentEnabled: boolean` (default `false`) and `setEnvironmentEnabled(v)`. The toggle SHALL be independent of the four run modes (A-phase / CPG preview / muscle test / coupled): flipping it while any mode is running SHALL take effect on the next frame's `stepSolver` call.

Switching the active tab to Calibrate SHALL NOT reset `environmentEnabled` — the environment is a persistent preference, not a mode.

#### Scenario: Toggle persists across mode switches

- **GIVEN** `environmentEnabled = true` and the user switches between A-phase Run, muscle test, and coupled modes
- **THEN** the environment stays on in each mode (the user does not need to re-enable it per mode)

### Requirement: Emergent forward translation under coupled drive

When the coupled drive runs in the 3D Rapier world with the drag environment on (default `cpgDrive = 2.0`, `cpgExcitability = 0.09`, gain 12, gravity off), the body SHALL translate **head-first**. The CPG → Ekeberg torque pipeline (with the non-reversed `jointToCpgSegment = segmentIndex` mapping) drives the revolute joints into a head→tail travelling wave; the 3D drag converts it to a head-leading push. Over a recording of at least 3 seconds, the body's center-of-mass displacement projected on the snout (head-forward) axis SHALL be positive and grow monotonically. Absolute speed is a deferred tuning concern (AZ-33); direction + monotonicity are the gate, reproducing the planar swimming result in 3D.

#### Scenario: 3D coupled drive swims forward, head-first

- **GIVEN** the 3D body with coupled drive running and drag on
- **WHEN** the user records ≥ 3 seconds
- **THEN** the snout-projected COM motion increases monotonically (head leading, not tail-first)

#### Scenario: Drag off → no net translation

- **GIVEN** the 3D coupled drive with drag off
- **THEN** the body undulates without net forward COM translation (internal torques alone cannot translate the COM)

### Requirement: Sidebar exposes the environment toggle

The Simulate tab in `AnimateSidebar` SHALL render an **Environment (Phase C)** block (visually placed at the top of the tab, above the A-phase controls) with a single toggle button bound to `environmentEnabled` and a one-line hint identifying the drag coefficients. When the environment is on, the toggle SHALL be visually distinct from its off state.

#### Scenario: Environment toggle is present and live

- **GIVEN** the Simulate tab with a rig loaded
- **WHEN** the user clicks the Environment toggle
- **THEN** `environmentEnabled` updates and the change is reflected in the next frame's solver step

### Requirement: CPG output maps to joints in head→tail spatial order

In the coupled drive, each body joint SHALL be driven by the CPG segment that matches its own position along the body, so the CPG's head→tail traveling wave lands on the body in head→tail order. `jointToCpgSegment[i]` SHALL equal `bodySpec.joints[i].segmentIndex` (the joint's child axial segment), NOT a reversed index. A reversed mapping (`n - 1 - segmentIndex`) feeds the head→tail wave onto the body tail→head, which makes the body swim **backward** (tail-first) under the drag — the pre-existing Phase B3/C defect this change corrects.

#### Scenario: Forward swim requires the non-reversed mapping

- **GIVEN** the coupled CPG→muscle→body→drag pipeline on a uniform body
- **WHEN** `jointToCpgSegment[i] = segmentIndex` (head→tail)
- **THEN** the body's center of mass drifts head-first (forward)

#### Scenario: Reversed mapping swims backward

- **GIVEN** the same pipeline with `jointToCpgSegment[i] = n - 1 - segmentIndex`
- **THEN** the body's center of mass drifts tail-first (backward), reproducing the prior defect (verified headless in `scripts/locomotion-drag-direction.ts`)

### Requirement: Deterministic fixed-step physics world

The system SHALL run one `RAPIER.World` at a **fixed timestep**, stepped a whole number of fixed substeps per frame with accumulated `dt` clamped, so that a given run reproduces its diagnostic capture on the same machine/build. World gravity SHALL depend on the coupled mode: `(0, 0, 0)` in **swim** mode (neutral-buoyancy water) and `(0, −9.81, 0)` in **land** mode. `RAPIER.init()` SHALL complete before the world is built; the frame loop SHALL no-op until the world and rig are ready. No nondeterministic inputs (`Math.random`, wall-clock time) SHALL enter the step loop.

#### Scenario: World steps at a fixed timestep

- **GIVEN** a built 3D body
- **WHEN** the simulation runs for frames of varying real `dt`
- **THEN** the world advances in fixed-size substeps (frame-rate-independent), and two identical runs produce matching captures on the same machine

#### Scenario: Loop is inert until ready

- **GIVEN** `RAPIER.init()` has not resolved or no rig is loaded
- **THEN** the frame loop performs no stepping and does not throw

#### Scenario: Gravity follows the mode

- **GIVEN** the coupled handle is built
- **WHEN** the mode is `swim`
- **THEN** world gravity is `(0, 0, 0)`
- **WHEN** the mode is `land`
- **THEN** world gravity is `(0, −9.81, 0)` and a static ground plane is present

### Requirement: Controller torque drives the engine revolute joints

Each step, for each axial joint the system SHALL read the joint angle `φᵢ` and rate `φ̇ᵢ` from the engine, run the unchanged `stepCpg → oscillatorOutput·CPG_TO_MUSCLE_GAIN → 10 ms delay → ekebergTorque(mL, mR, φᵢ, φ̇ᵢ)` pipeline, and apply the resulting torque `τᵢ` as an **internal joint torque** (`+τᵢ·axis` to the child body, `−τᵢ·axis` to the parent). Because the torque is internal (equal and opposite), it SHALL NOT translate the body's center of mass on its own. The render path SHALL be driven from engine transforms: root frame from the head body's world pose, each chain pivot's local yaw from its revolute joint angle.

#### Scenario: Internal torque cannot move the COM

- **GIVEN** the coupled torque applied with drag off
- **THEN** the body's center of mass does not translate (only its shape changes)

#### Scenario: Render follows the engine

- **WHEN** the engine advances the body
- **THEN** the rig's root frame and per-joint pivot yaws are written from the corresponding Rapier body/joint transforms each frame

### Requirement: No forced planar projection

The system SHALL NOT apply any per-step override of body position or orientation (no "planar projection" that snaps height, zeroes out-of-plane velocity, or strips pitch/roll). The 3D body's pose SHALL be the integrated result of the physics alone. The swim SHALL remain usable without such an override: over a coupled swim run of at least 10 s with the drag environment on, the body SHALL stay bounded and roughly in-plane (no float-off or tumble) and SHALL still translate forward head-first (per the existing forward-translation requirement).

#### Scenario: Swim is stable with no projection

- **GIVEN** a coupled swim run with the drag environment on and no planar projection in the loop
- **WHEN** it runs for at least 10 s
- **THEN** the body translates forward head-first, vertical COM drift stays small, and maximum body tilt stays bounded (no float-off, no tumble)

#### Scenario: No projection code path exists

- **WHEN** the coupled step loop runs in either mode
- **THEN** no function snaps body height, zeroes out-of-plane velocity, or strips pitch/roll, and no "planar lock" control is exposed

### Requirement: Axial muscle torque acts about the segment-local bend axis

Each axial revolute joint's axis SHALL be the **child segment's local up** — world-up with its along-segment component removed (perpendicular to the segment, a principal axis of the capsule) — stored in the body's local frame so it follows the segment when the segment later pitches. For a horizontal segment this equals world-up. The joint-angle readback SHALL project the relative rotation onto this axis.

#### Scenario: Bend axis is perpendicular to the segment

- **GIVEN** a segment whose rest forward is tilted off horizontal (from the rig's node heights)
- **THEN** its joint's bend axis is perpendicular to that forward (not fixed world-up), and the muscle torque bends the joint within the segment's own plane

### Requirement: Coupled mode selects swim or land

The animate store SHALL carry a `coupledMode: 'swim' | 'land'` (default `'swim'`), exposed in the Simulate sidebar and on the `window.__studio` hook. Changing the mode while a coupled run is active SHALL free and rebuild the coupled handle (new world, gravity, body). There SHALL be no hardcoded gravity/ground flag in the build path; the mode is the single switch.

#### Scenario: Mode toggle rebuilds the world

- **GIVEN** a coupled run in `swim` mode
- **WHEN** the user switches to `land`
- **THEN** the coupled handle is rebuilt with gravity on and a ground plane, and the body falls onto the ground

#### Scenario: Default is swim

- **GIVEN** a freshly loaded studio
- **THEN** `coupledMode` is `'swim'` (gravity off, no ground plane)

### Requirement: Legs are built from the hip socket and nodeFoot

In **land** mode the body builder SHALL create one physics capsule per leg group, spanning the parent girdle's hip socket (`nodeHipLeft` for `leg-left`, `nodeHipRight` for `leg-right`) to the leg group's `nodeFoot`, with mass from the leg's authored `nodeWeight` and a foot contact collider with friction. It SHALL NOT use `nodeFront`/`nodeBack` for legs (those are undefined on the rig). The hip joint SHALL be a **rigid (fixed)** joint in this phase (standing only — no actuation). In swim mode legs remain non-physical passengers.

#### Scenario: Leg geometry comes from socket → nodeFoot

- **GIVEN** a rig whose legs carry `nodeFoot` and whose girdles carry `nodeHipLeft/Right`
- **WHEN** the body is built in land mode
- **THEN** each leg is a capsule from its girdle hip socket to its `nodeFoot`, and no leg references `nodeFront`/`nodeBack`

### Requirement: Body stands on its legs under gravity

In **land** mode the system SHALL place a static ground plane just below the lowest foot, render each leg from its physics body transform, and the body SHALL settle and rest on its feet: vertical COM SHALL stop dropping (no fall-through), maximum body tilt SHALL stay small (≤ ~5° at rest), and kinetic energy SHALL decay toward rest. Switching back to swim mode SHALL still swim forward with no regression.

#### Scenario: Dragon stands at rest

- **GIVEN** land mode with no muscle drive (or low drive)
- **WHEN** the simulation runs to settle
- **THEN** the body drops a small amount onto its feet and rests: COM height stabilizes, tilt stays ≤ ~5°, kinetic energy decays toward zero, and no segment clips through the floor

#### Scenario: Swim unregressed after land

- **GIVEN** a run was in land mode
- **WHEN** the mode is switched back to swim and the coupled drive runs
- **THEN** the body swims forward head-first as before (forward-translation requirement still met)

### Requirement: Four limb oscillators with faithful parameters

The CPG SHALL include four single limb oscillators (left-fore, right-fore, left-hind, right-hind)
appended to the axial double chain, with per-limb excitability (fore `e=0.8`, hind `e=0.5`) and limb
saturation threshold (`d_th≈1.27`) per the reference.

#### Scenario: Limb oscillators present and parameterised

- **WHEN** the CPG spec is built for a rig with four legs
- **THEN** four limb oscillators exist with fore/hind excitability `0.8`/`0.5` and limb threshold
  `1.27`, distinct from the axial `1.1`/`3`

### Requirement: Diagonal-trot gait emerges from interlimb couplings

The four limb oscillators SHALL be coupled by the reference Table 2 interlimb weights (lateral `w=10`,
rostrocaudal `w=3`, caudorostral `w=30`, all `φ=π`) such that a diagonal-trot phase relationship
emerges without per-limb phases being set by hand.

#### Scenario: Diagonal pairs lock in antiphase

- **WHEN** the limb oscillators run with the Table 2 interlimb couplings
- **THEN** left-fore + right-hind settle in phase, antiphase to right-fore + left-hind (the diagonal
  trot), with the hind legs leading

### Requirement: Limb↔axial coupling pulls the trunk toward a standing wave

Each limb SHALL couple to its girdle axial segment (limb→axial `w=30, φ=4`; axial→limb `w=2.5, φ=−4`)
so that active limbs shift the axial rhythm toward a standing wave.

#### Scenario: Trunk wave responds to active limbs

- **WHEN** the limbs are active and coupled to the girdle segments
- **THEN** the axial head→tail phase lag shifts toward a standing wave relative to the swimming
  traveling wave

### Requirement: Limbs saturate before the axis

Because limbs have lower excitability and a lower saturation threshold, raising the drive SHALL drive
the limb amplitudes to zero before the axial amplitudes.

#### Scenario: Limbs fold first at high drive

- **WHEN** the descending drive is raised past the limb saturation threshold (≈1.27) but below the
  axial one (3)
- **THEN** the limb oscillator amplitudes collapse toward zero while the axial oscillators keep
  oscillating

