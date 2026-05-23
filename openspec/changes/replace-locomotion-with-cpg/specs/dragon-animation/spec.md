## REMOVED Requirements

### Requirement: Rigid leg as a hard distance constraint on the cascade

**Reason:** The cascade waterfall and leg-length projection are removed. The CPG produces target joint angles directly; there is no candidate cascade pose that the projection clamps. Leg length is implied by the rig (studio data) and applied by the existing `applyLegBone` rendering; it is not an active solver constraint.

### Requirement: Iteration is bounded and falls back to strain-based stepping

**Reason:** Strain-based stepping is removed. Foot stepping is now driven entirely by limb oscillator phase. There is no iteration budget, no projection, no fallback.

### Requirement: Projection runs as a pure function over arrays

**Reason:** `projectLegConstraints` is deleted. The CPG core (`tickCpg`) is also a pure function, but its inputs and outputs differ; it is added as its own requirement below.

### Requirement: Stepping logic and foot state semantics are unchanged

**Reason:** Stepping logic and foot state shape both change. `STRAIN_THRESHOLD`, `computeStrain`, `footTargetWorld`, `STEP_DURATION` are all removed. The new phase-driven stepping is added as its own requirement below.

### Requirement: Rear hip participates in the strain/step state machine independently of the front hip

**Reason:** The strain/step state machine is removed. The CPG ticks all oscillators together each frame; each limb oscillator runs its own phase independent of any "state machine." Front and rear hip's limb oscillators remain independent under the new design, but the mechanism is different.

### Requirement: Diagnostics snapshot includes both hips and all four feet

**Reason:** The `HipSnapshot` shape (wantedYaw / appliedYaw / plantedYaw / targetYaw / strain) does not match the CPG state. The diagnostics shape is replaced; the new shape (`axialOscillators[]`, `limbOscillators[]`, `drive`, `steer`) is added as its own requirement below.

## ADDED Requirements

### Requirement: CPG produces target yaws and limb phases per frame

The locomotion system SHALL include a central pattern generator (CPG) in `app/game/locomotion/cpg.ts` that, given a per-frame `drive ∈ [0, 1]`, `steer ∈ [-1, 1]`, and time delta `dt`, produces a target yaw per axial oscillator and a current phase per limb oscillator. The CPG state SHALL evolve per the coupled phase-oscillator equations from Thandiackal et al. (2020):

```
dθ_i / dt  = 2π · ν_i + Σ_j w_ij · r_j · sin(θ_j − θ_i − φ_ij)
d²r_i / dt² = a · ((a / 4) · (R_i − r_i) − dr_i / dt)
```

Per-axial yaw output: `r_i · cos(θ_i)`. Per-limb output: `θ_i mod 2π`.

The CPG SHALL be implemented as a pure function. It SHALL NOT read or write three.js scene state, React state, or the diagnostics buffer directly.

#### Scenario: Pure-function call shape

- **WHEN** `tickCpg(state, network, drive, steer, dt)` is invoked
- **THEN** its inputs are plain values and arrays; its return is `{ state, axialYaws, limbPhases }`
- **AND** no three.js, no React, no diagnostics call occurs inside the function

#### Scenario: Zero drive freezes the network

- **WHEN** `drive = 0` is passed in every frame for a sequence of frames
- **THEN** all axial oscillator amplitudes relax toward 0 within a few amplitude time-constants
- **AND** axial yaw outputs converge to 0
- **AND** limb oscillator amplitudes also relax to 0; limb phases stop advancing (or advance at the zero-drive frequency, depending on ν₀)
- **AND** no foot transitions to swing

#### Scenario: Full drive produces a walking gait

- **WHEN** `drive = 1` and `steer = 0` are sustained
- **THEN** axial oscillators reach their target amplitudes
- **AND** limb oscillators step at the configured cadence (`ν_walk · drive`)
- **AND** limb phases form a diagonal-couplet pattern (front-left phase ≈ rear-right phase; front-right phase ≈ rear-left phase, offset by π)

### Requirement: CPG topology is built from studio data

A `buildCpgNetwork(groups)` pure function SHALL derive the oscillator network from the studio config without per-rig hand-wiring. It SHALL produce:

- One axial oscillator per body group returned by `buildCascadeChain(groups)`.
- One limb oscillator per hip socket (`nodeHipLeft` or `nodeHipRight`) on a hip-bearing spine group, when a matching `leg-left` / `leg-right` group exists with a `nodeFoot` placement. `findFrontHip`, `findRearHip`, and `findLegsForHip` (existing helpers) SHALL be used unchanged.
- Axial-neighbour couplings: adjacency in the cascade chain.
- Limb-to-girdle couplings: each limb oscillator coupled to the axial oscillator of its owning hip-bearing spine group.
- Limb gait offsets: initial phases baked into limb oscillators per a diagonal-trot pattern when four limbs exist (`front-left = 0`, `front-right = π`, `rear-left = π`, `rear-right = 0`). For other limb counts, phases SHALL be distributed evenly around the phase circle.

The function SHALL NOT mutate the input `groups` array and SHALL return a fresh network object.

#### Scenario: Two-hip lizard produces a 4-limb diagonal-trot network

- **WHEN** `buildCpgNetwork(groups)` is called on a rig with front and rear hips, both with left+right legs
- **THEN** the returned network contains 4 limb oscillators
- **AND** their initial phases are `[0, π, π, 0]` for `[front-left, front-right, rear-left, rear-right]`

#### Scenario: Snake (no legs) produces an axial-only network

- **WHEN** `buildCpgNetwork(groups)` is called on a rig with spine groups but no hip sockets
- **THEN** the returned network contains zero limb oscillators
- **AND** the axial-neighbour couplings are present per chain adjacency

#### Scenario: Number of axial oscillators matches chain length

- **WHEN** `buildCpgNetwork(groups)` is called
- **THEN** the count of axial oscillators in the returned network equals `buildCascadeChain(groups).length`

### Requirement: Attractor maps to drive and steer

`useLocomotion` SHALL convert the world-space attractor into `drive` and `steer` per frame:

```
distance     = |attractor_xz − head_xz|
signedAngle  = signedAngleBetween(head_forward_xz, attractor_dir_xz)   ∈ [-π, π]
drive  = clamp((distance − close_radius) / drive_falloff, 0, 1)
steer  = clamp(signedAngle / steer_falloff, -1, 1)
```

`close_radius`, `drive_falloff`, and `steer_falloff` SHALL be exported constants in `app/game/locomotion/cpg.ts` (or imported from there into `useLocomotion`). When the attractor is `null`, `drive = 0` and `steer = 0`.

#### Scenario: No attractor stops the creature

- **WHEN** the attractor is null
- **THEN** `drive = 0` and `steer = 0` are passed to `tickCpg`
- **AND** the creature settles into a non-walking pose

#### Scenario: Close attractor stops the creature

- **WHEN** the attractor's distance to the head is less than `close_radius`
- **THEN** `drive = 0`
- **AND** the creature stops walking but may still rotate its head via the cosmetic head-gaze overlay

#### Scenario: Far off-axis attractor turns and walks

- **WHEN** the attractor is at distance > `drive_falloff + close_radius` and signed angle exceeds `steer_falloff`
- **THEN** `drive = 1` and `steer` saturates to ±1 with the sign matching the turn direction
- **AND** the creature walks while curving toward the attractor

### Requirement: Steer is applied as a static yaw bias on top of CPG output

For each axial oscillator output `r_i · cos(θ_i)`, the final target yaw written to the cascade pivot SHALL be:

```
final_yaw = clamp(r_i · cos(θ_i) + steer · steer_scale, -capYaw, +capYaw)
```

where `capYaw = effectiveAngleCaps(group).yaw` for the group corresponding to that axial oscillator, and `steer_scale` is an exported constant. The steer bias is applied per-segment but uses the *same* `steer` value across all axial oscillators (no per-segment steer modulation in this change).

#### Scenario: Zero steer leaves CPG output unchanged

- **WHEN** `steer = 0`
- **THEN** `final_yaw = clamp(r_i · cos(θ_i), -capYaw, +capYaw)`

#### Scenario: Steer biases all axial segments equally

- **WHEN** `steer = 0.5` is sustained
- **THEN** every axial segment's yaw output has the same additive bias `0.5 · steer_scale`
- **AND** each segment's output is clamped to its own `angleCap.yaw`

### Requirement: Foot stepping is driven entirely by limb oscillator phase

Each foot's stance/swing state SHALL be determined by the sign of `sin(θ)` of its limb oscillator:

- `sin(θ) ≥ 0`: stance. Foot is at its recorded planted world position. No motion.
- `sin(θ) < 0`: swing. Foot interpolates from `planted_prev` to `planted_next` along an arc with vertical lift `LIFT_HEIGHT · sin(swing_band_fraction · π)`.

On a stance → swing transition (one frame where prior `sin(θ) ≥ 0` and current `sin(θ) < 0`), the next planted position SHALL be computed as:

```
planted_next_xz = hip_socket_world_xz + rotate2D(rest_offset_xz, hip_yaw_world) + stride_forward · body_forward_xz
```

On a swing → stance transition, the foot is registered as planted at its current swing-interpolated position; that becomes the new `planted_xz`.

`STRAIN_THRESHOLD`, `computeStrain`, `footTargetWorld`, `STEP_DURATION` SHALL NOT exist. Stepping is a pure consequence of phase, not of a separate strain trigger.

#### Scenario: Stance foot does not move

- **WHEN** a foot's limb oscillator has `sin(θ) ≥ 0` for consecutive frames
- **THEN** the foot's rendered world position equals its `planted_xz` (with `restY` for Y) on every frame
- **AND** no marker writes a different position

#### Scenario: Swing foot lifts and translates along an arc

- **WHEN** a foot's limb oscillator transitions from `sin(θ) ≥ 0` to `sin(θ) < 0`
- **THEN** on subsequent frames during the swing band, the foot's XZ position interpolates from `planted_prev` to `planted_next`
- **AND** the foot's Y position rises and falls through `LIFT_HEIGHT · sin(f · π)` where `f` is the swing-band fraction in `[0, 1]`

#### Scenario: Step lands at next planted position on swing→stance

- **WHEN** the limb oscillator returns to `sin(θ) ≥ 0` after a swing band
- **THEN** the foot's recorded `planted_xz` equals the swing-final XZ position (which approximates `planted_next` from the prior stance→swing transition, within numerical tolerance for the arc interpolation endpoint)

### Requirement: Studio angle caps clamp CPG yaw output

The final yaw written to each axial pivot SHALL be clamped to `[-effectiveAngleCaps(group).yaw, +effectiveAngleCaps(group).yaw]`. The CPG amplitude `R_i` parameter MAY be set proportionally to the cap (or the clamp may be applied at output time), but in either case the final per-frame target yaw delivered to the pivot SHALL respect the studio cap. Code SHALL NOT use hardcoded numeric joint limits; SHALL NOT override saved caps; SHALL NOT widen a joint's range beyond its saved cap.

#### Scenario: Tuned cap is respected

- **WHEN** the user tunes a spine segment's `angleCaps.yaw` smaller than the default
- **THEN** the final pivot yaw for that segment is clamped to the tuned value, regardless of what the CPG output requested

#### Scenario: Default cap is used when no saved value

- **WHEN** a `BodyGroup` has no saved `angleCaps`
- **THEN** the clamp uses `defaultAngleCapsFor(group).yaw` via `effectiveAngleCaps`, identical to the value used elsewhere

### Requirement: applyLegBone and applyHipLegs are unchanged

The leg-mesh rendering helpers `applyLegBone` and `applyHipLegs` SHALL retain their current bodies (modulo formatting). The mesh continues to be rotated around its hip socket to point at the foot's current world position, with the leg group's `angleCaps.yaw` / `angleCaps.yawBack` clamping. The change in observable behavior comes from how the foot's world position is decided (now: phase-driven), not from any change in leg rendering.

#### Scenario: applyLegBone code path unchanged

- **WHEN** the change is applied
- **THEN** `app/game/locomotion/useLocomotion.ts`'s `applyLegBone` and `applyHipLegs` function bodies match their pre-change form (modulo formatting and any signature changes from removing the `enableLegBoneRotation` flag if present)

### Requirement: Diagnostics snapshot reflects CPG state

`FrameSnapshot` (in `app/game/locomotion/diagnostics.ts`) SHALL be restructured to expose CPG state. Required fields:

- Retained: `t`, `attractor`, `modelRotation`, `chain`, `pivots`.
- Added: `drive: number`, `steer: number`.
- Added: `axialOscillators: { id: string; name: string; phase: number; amplitude: number; intrinsicFrequency: number; outputYaw: number }[]`.
- Added: `limbOscillators: { id: string; hipId: string; side: 'left' | 'right'; phase: number; amplitude: number; stanceOrSwing: 'stance' | 'swing'; plantedX: number; plantedY: number; plantedZ: number }[]`.
- Removed: `cascadeOutRaw`, `cascadeOut`, `caps`, `desiredHeadYaw`, the previous `frontHip` / `rearHip` `HipSnapshot` fields, the previous `FootSnapshot` fields related to strain and rest offsets.

#### Scenario: Snapshot contains CPG state

- **WHEN** a snapshot is recorded
- **THEN** `snap.drive` and `snap.steer` reflect the current frame's control inputs
- **AND** `snap.axialOscillators` contains one entry per cascade-chain member
- **AND** `snap.limbOscillators` contains one entry per attached leg

#### Scenario: Snapshot no longer contains removed fields

- **WHEN** TypeScript compiles
- **THEN** `FrameSnapshot` does not export `cascadeOutRaw`, `cascadeOut`, `caps`, or `desiredHeadYaw`
- **AND** no code references those removed fields

### Requirement: Strain-line and wanted-cascade-ghost overlays are removed

The studio Animate scene SHALL NOT include a "wanted-cascade ghost" or "foot strain line" overlay. The `app/admin/animate/animateStore.ts` SHALL NOT contain `overlays` state or the related setters. The `app/admin/animate/AnimateScene.tsx` SHALL NOT contain `WantedCascadeStick`, `StrainLines`, or `writeWantedSkeleton`. The `app/admin/animate/AnimateSidebar.tsx` SHALL NOT contain a "Scene overlays" section.

#### Scenario: Overlay components are deleted

- **WHEN** the codebase is grepped for `WantedCascadeStick`, `StrainLines`, `writeWantedSkeleton`, `showWantedCascade`, `showStrainLines`, `setShowWantedCascade`, `setShowStrainLines`
- **THEN** no occurrences exist

### Requirement: Locomotion documentation lives in a single file

`documentation/locomotion.md` SHALL be the only documentation file describing the locomotion design. `documentation/animation_design.md` and `documentation/animation_references.md` SHALL NOT exist. The doc SHALL contain (in order): rules, model equations, topology, inputs/outputs, studio mapping, attractor mapping, foot stepping, parameter table, and a single reference citation (Thandiackal et al. 2020).

#### Scenario: Deprecated docs are absent

- **WHEN** the `documentation/` directory is listed
- **THEN** `animation_design.md` and `animation_references.md` do not exist

#### Scenario: Locomotion doc is the single source of truth

- **WHEN** the `documentation/` directory is searched for files describing locomotion or animation design
- **THEN** only `locomotion.md` matches
