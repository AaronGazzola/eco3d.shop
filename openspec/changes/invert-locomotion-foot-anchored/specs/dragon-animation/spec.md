## ADDED Requirements

### Requirement: Locomotion is driven by an internal intent state, not by the head joint

The dragon's animation runtime SHALL maintain an **intent state** (a single `{position, heading, velocity}` struct per creature) that steers toward `targetRef.current` each frame via a seek + arrival rule. Intent state SHALL be the sole consumer of attractor input within the solver pipeline. The head joint SHALL NOT directly chase the attractor; the head joint's motion SHALL be a consequence of the spine solve and the joint's local rotation toward the attractor, not a primary driver of body translation.

When `targetRef.current` is null or the intent's distance to the attractor is below a configured threshold, the intent SHALL be eligible for idle drift driven by `idleDriftAmplitude` and `idleDriftFrequency`. With `idleDriftAmplitude = 0` the intent SHALL hold still in the absence of a target.

Intent state SHALL be exposed to the debug overlay via a ref alongside `chainRef` and `limbStatesRef`.

#### Scenario: Attractor moves; intent steers toward it

- **WHEN** the user sets `targetRef.current` to a world point
- **THEN** the intent state's position translates toward that point each frame at up to `maxIntentSpeed`, decelerating within `arrivalRadius`

#### Scenario: Attractor cleared; intent does not chase a stale target

- **WHEN** the attractor was previously set and is then cleared
- **THEN** the intent state retains its current position, decays its velocity by `intentDamping`, and only moves further if idle drift is enabled

#### Scenario: Head joint does not pull the body

- **WHEN** the attractor sweeps quickly across the front of the dragon
- **THEN** the dragon's hip joints do not translate laterally before any foot has stepped; the head joint rotates within its angle constraint to gaze at the attractor, and the body waits for a foot-step to follow

### Requirement: Feet plant in world space via a per-foot state machine

Each leg SHALL maintain a per-foot state machine with exactly two states: **planted** and **swinging**. A foot's `plantPos` (world-anchored 3D position) SHALL NOT change while the foot is in the planted state. During the swinging state, the foot SHALL interpolate from `swingFrom` to `swingTo` along a parabolic arc with vertical lift `liftHeight × 4 × swingT × (1 − swingT)` over `swingDuration` seconds.

A planted foot SHALL transition to swinging when its drift from its desired position (`|plantPos.xz − footDesired.xz|`) exceeds `stepThreshold`. On transition, `swingFrom` SHALL be set to the current `plantPos`, `swingTo` SHALL be set to `footDesired + intent.velocity × predictionGain`, and `swingT` SHALL be reset to 0.

On swing completion (`swingT >= 1`), the foot SHALL replant: `plantPos = swingTo`, `plantState = 'planted'`, `swingT = 0`.

While planted, `limb.currentTarget` SHALL equal `plantPos`. While swinging, `limb.currentTarget` SHALL equal the current interpolated arc position.

#### Scenario: Planted foot remains world-anchored across frames

- **WHEN** a foot is in the planted state and the body's intent is moving
- **THEN** the foot's `plantPos` is identical across consecutive frames until a step is triggered

#### Scenario: Step triggered when drift exceeds threshold

- **WHEN** a planted foot's desired position has drifted more than `stepThreshold` from its `plantPos`
- **THEN** the foot transitions to swinging with `swingTo` predicted ahead by `intent.velocity × predictionGain`

#### Scenario: Swing arc has vertical lift

- **WHEN** a foot is in the swinging state at `swingT = 0.5`
- **THEN** the foot's position has a vertical offset of `liftHeight` above the linear XZ interpolation between `swingFrom` and `swingTo`

#### Scenario: Foot replants at end of swing

- **WHEN** a foot's `swingT` reaches or exceeds 1
- **THEN** `plantPos` is set to `swingTo`, `plantState` is set to `'planted'`, and subsequent frames hold the foot still at the new world position until the next step trigger

### Requirement: Hip joints are positioned from the planted feet

The two spine joints that own hip nodes (the front hip joint and the rear hip joint, identified via the studio's `nodeHipLeft` / `nodeHipRight` placements) SHALL have their world positions computed each frame as the midpoint of their respective foot pair (in XZ), lifted by `bodyHeight` on Y. Hip joint positions SHALL NOT be computed by chain-pull from the head; they SHALL be derived solely from foot positions.

Each leg's `limb.anchor` SHALL be set to the corresponding hip joint position. The hip-offset rotation math (used by the head-driven solver) SHALL NOT be applied when computing `limb.anchor` in the foot-anchored model.

The indices of the front and rear hip joints in `chain.joints` SHALL be derived from studio data via `modelConfigToCreatureConfig`. They SHALL NOT be hardcoded.

#### Scenario: Hip joint position from feet midpoint

- **WHEN** the front-left foot is at world position FL and the front-right foot is at FR
- **THEN** the front hip joint's position is `(midpoint(FL, FR).x, midpoint(FL, FR).y + bodyHeight, midpoint(FL, FR).z)`

#### Scenario: Hip indices derived from studio data

- **WHEN** the studio config has the front hips on spine group index 2 and rear hips on index 5
- **THEN** `hipJointFrontIndex` and `hipJointBackIndex` derived in `modelConfigToCreatureConfig` correspond to those spine joints, regardless of the specific indices

#### Scenario: Different rig — same code path

- **WHEN** the studio config is replaced with one whose hip joints sit on different spine indices and whose spine has a different total joint count
- **THEN** the solver pipeline runs unmodified; hip joints derive from the new indices; the dragon animates correctly without code changes

### Requirement: Spine solves in three sections with two hip anchors

The spine SHALL be solved in three sections each frame, in order:

1. **Mid-spine** — joints strictly between the front hip joint and the rear hip joint SHALL be resolved by a dual-anchor FABRIK iteration that pins both endpoints. Distance constraints (`segmentLengths`) and per-joint angle constraints SHALL be enforced.
2. **Head section** — joints from `hipJointFrontIndex` outward to joint 0 SHALL be resolved by a one-anchored FABRIK pass anchored at the front hip joint. The head joint (joint 0) SHALL be biased toward the attractor by rotating its angle relative to its parent within its `angleConstraint` toward the attractor direction.
3. **Tail section** — joints from `hipJointBackIndex` outward to the last joint SHALL be resolved by a one-anchored chain resolve (no explicit target) anchored at the rear hip joint. Distance and angle constraints alone produce the trailing tail.

`Chain3D` SHALL gain a `resolveDualAnchor(startAnchor, endAnchor, iterations?)` method for the mid-spine solve. The existing `resolve(target)` method SHALL be preserved unchanged.

After all three sections are solved, every consecutive pair of joints SHALL satisfy `|joints[i+1] − joints[i]| ≈ segmentLengths[i]` (within numerical tolerance), and every joint's bend relative to its parent SHALL be within `angleConstraint`.

#### Scenario: Mid-spine pinned at both hips

- **WHEN** the dual-anchor solve runs with `joints[hipJointFrontIndex]` and `joints[hipJointBackIndex]` as anchors
- **THEN** after the solve, both anchors are at their input positions and every intermediate joint is at the configured segment length from its neighbor

#### Scenario: Head joint gazes at attractor

- **WHEN** the attractor is to the right of the dragon's current heading
- **THEN** the head joint rotates clockwise (within `angleConstraint`) relative to its parent so that the head points toward the attractor, while the front hip joint's position is unchanged

#### Scenario: Tail trails behind

- **WHEN** the rear hip joint moves forward as a foot replants
- **THEN** the tail joints follow the rear hip via distance + angle constraints alone, producing a trailing tail without an explicit tail target

#### Scenario: All sections preserve angle constraints

- **WHEN** the full per-frame spine solve completes
- **THEN** no joint's bend relative to its parent exceeds `angleConstraint`

### Requirement: Renderer reads joint and anchor Y components

`app/game/AnimatedModel.tsx` SHALL position spine-chain groups using `joint.y` for their `position.y` and SHALL position leg groups using `limb.anchor.y` for their `position.y`. The leg-group rotation calculation SHALL account for the vertical difference between `limb.anchor` and `limb.currentTarget` so the leg visibly tracks the foot through swing arcs.

The renderer SHALL continue to read only the three buckets from the simulation: `chain.joints[i]`, `limb.anchor`, `limb.currentTarget`. No additional simulation state SHALL be read by the renderer.

#### Scenario: Spine groups lift with hip joints

- **WHEN** `bodyHeight` is increased and hip joints rise accordingly
- **THEN** the rendered spine groups visibly lift; the dragon's body sits higher above the ground plane

#### Scenario: Leg visibly arcs through swing

- **WHEN** a foot is in the swinging state with `swingT = 0.5` and `liftHeight = 1`
- **THEN** the rendered leg's foot end is positioned with a visible vertical offset above the ground plane

#### Scenario: Three-bucket contract preserved

- **WHEN** the renderer is inspected for inputs from the simulation
- **THEN** the only simulation refs read are `chainRef` (for `joints`) and `limbStatesRef` (for `anchor` and `currentTarget`)

### Requirement: Debug overlay surfaces foot-anchored mechanics

`app/studio/AnimationDebugOverlay.tsx` SHALL render five additional debug gizmos, each gated by an independent toggle in `useStudioStore.overlayToggles`:

- **`footState`** — a small letter label ("P" or "S") near each foot's gizmo indicating planted or swinging state.
- **`stepRing`** — a ring on the ground plane centered on each foot's `plantPos` at radius `stepThreshold`.
- **`swingArc`** — a dashed parabolic curve from `swingFrom` to `swingTo` while a foot is in the swinging state.
- **`intent`** — a marker at `intent.position` with an arrow along `intent.heading`. Distinct color from the head-target arrow.
- **`hipDerivation`** — a faint line segment from each hip joint to the midpoint of its foot pair.

All five toggles SHALL default to `true` and SHALL be included in the store's `partialize` so user preferences persist across reload. Overlay primitives SHALL use `depthTest={false}` and `raycast={null}` consistent with the Slice 0 overlay conventions.

#### Scenario: Foot state badge shows planted vs swinging

- **WHEN** the front-left foot is in the swinging state and the front-right foot is in the planted state
- **THEN** the overlay renders "S" near the front-left foot and "P" near the front-right foot

#### Scenario: Step ring shows trigger threshold

- **WHEN** a foot is planted and `stepThreshold` is `2.0`
- **THEN** a ring of radius `2.0` is rendered on the ground around the foot's `plantPos`

#### Scenario: Intent marker is independent of the head-target arrow

- **WHEN** the intent has translated toward the attractor but is not yet at the attractor
- **THEN** the overlay renders a marker at the intent's current position (not at the attractor) with an arrow showing `intent.heading`

#### Scenario: Toggles default on and persist across reload

- **WHEN** the user disables `swingArc` and reloads the page
- **THEN** on the next render of step 3, the swing arc remains hidden

### Requirement: Animation panel exposes intent and foot-stepping controls

The Animate step's panel (`app/studio/StepAnimate.tsx`) SHALL surface the locomotion-model controls under the existing Intrinsic / Extrinsic tab structure:

- **Extrinsic → Feet** SHALL contain exactly the following controls: Step Threshold (`stepThreshold`), Swing Duration (`swingDuration`), Lift Height (`liftHeight`), Prediction Gain (`predictionGain`). The previously-present Foot Angle Offset and Step Smoothing sliders SHALL be absent — their underlying fields (`limbAngleOffset`, `stepSmoothing`) SHALL be removed from `AnimationConfig`.
- **Extrinsic → Head / Target** SHALL contain: Wander Radius (`wanderRadius`), Wander Speed (`wanderSpeed`), Max Speed (`maxSpeed`), Arrival Radius (`arrivalRadius`), Idle Drift Amplitude (`idleDriftAmplitude`), Idle Drift Frequency (`idleDriftFrequency`), the Show Attractor checkbox, and the left-click hint. The Arrival Radius slider replaces the previously-present Follow Distance slider; its underlying field is renamed from `followDistance` to `arrivalRadius`. Wander Radius, Wander Speed, and Max Speed retain their previous bindings and labels — their effect on the dragon now flows through the intent state rather than the head joint directly.
- **Extrinsic → Body** SHALL be a new subsection containing a Body Height slider (`bodyHeight`).

All sliders SHALL bind to `AnimationConfig` fields via the existing `setAnimationField` setter. Ranges and step sizes SHALL follow the conventions established by neighboring sliders.

The overlay-toggle row at the top of the panel SHALL include the five new toggles (Foot State, Step Ring, Swing Arc, Intent, Hip Derivation) in addition to the five existing toggles.

#### Scenario: Feet subsection contains only the foot-stepping controls

- **WHEN** the user activates the Extrinsic tab
- **THEN** the Feet subsection contains exactly the Step Threshold, Swing Duration, Lift Height, and Prediction Gain sliders, and no Foot Angle Offset or Step Smoothing slider is rendered

#### Scenario: Head / Target subsection contains the intent controls

- **WHEN** the user activates the Extrinsic tab
- **THEN** the Head / Target subsection contains the Wander Radius, Wander Speed, Max Speed, Arrival Radius, Idle Drift Amplitude, and Idle Drift Frequency sliders, the Show Attractor checkbox, and the left-click hint

#### Scenario: New Body subsection appears in Extrinsic

- **WHEN** the user activates the Extrinsic tab
- **THEN** a Body subsection is rendered containing the Body Height slider, in addition to the Feet and Head / Target subsections

#### Scenario: Lift Height affects swing arc

- **WHEN** the user moves the Lift Height slider from 0.5 to 2.0
- **THEN** the rendered swing arc visibly rises higher above the ground

#### Scenario: Overlay toggle row includes new toggles

- **WHEN** the user opens step 3
- **THEN** the overlay-toggle row contains the existing five toggles plus the five new toggles (Foot State, Step Ring, Swing Arc, Intent, Hip Derivation)

### Requirement: Persistence migrates and prunes `AnimationConfig` fields

When `useStudioStore` hydrates a previously-persisted `AnimationConfig`, it SHALL apply the following migration before reading any field:

1. If `followDistance` is present and `arrivalRadius` is not, seed `arrivalRadius` from `followDistance`.
2. Drop `followDistance`, `limbAngleOffset`, and `stepSmoothing` from the hydrated state.

Subsequent reads, writes, and serializations SHALL use `arrivalRadius` and SHALL NOT reference the dropped fields. `AnimationConfig` SHALL NOT declare the dropped fields as members.

#### Scenario: Persisted `followDistance` migrates to `arrivalRadius`

- **WHEN** a previously-persisted store contains `followDistance: 4.5` and no `arrivalRadius`
- **THEN** after hydration `arrivalRadius` equals `4.5` and `followDistance` is no longer present

#### Scenario: Persisted obsolete fields are dropped

- **WHEN** a previously-persisted store contains `limbAngleOffset: 0.2` and `stepSmoothing: 0.3`
- **THEN** after hydration the `AnimationConfig` state contains neither field

## MODIFIED Requirements

### Requirement: Studio animation panel uses Intrinsic / Extrinsic tabs

The studio's Animate step (`app/studio/StepAnimate.tsx`) SHALL present its controls under two top-level tabs: **Intrinsic** (how the body relates to itself) and **Extrinsic** (how the body engages with the world). A flat list of controls without this tab structure SHALL NOT be considered conformant.

The default active tab on first render SHALL be **Extrinsic**.

The **Intrinsic** tab SHALL contain the Stiffness control (bound to `animationConfig.angleConstraint`) and SHALL begin with a read-only skeleton-shape summary derived from step 1 / step 2 data. The summary SHALL display at least: spine joint count, total spine length, and leg count. The summary SHALL have no edit affordance.

The **Extrinsic** tab SHALL contain three subsections:

- **Feet**: Step Threshold (`stepThreshold`), Swing Duration (`swingDuration`), Lift Height (`liftHeight`), Prediction Gain (`predictionGain`).
- **Head / Target**: Wander Radius (`wanderRadius`), Wander Speed (`wanderSpeed`), Max Speed (`maxSpeed`), Arrival Radius (`arrivalRadius`), Idle Drift Amplitude (`idleDriftAmplitude`), Idle Drift Frequency (`idleDriftFrequency`), the Show Attractor checkbox (`showAttractor`), and the "Left-click the floor to set a target" hint.
- **Body**: Body Height (`bodyHeight`).

Retained controls SHALL bind to the same `useStudioStore` field as before. Where the underlying simulation field's meaning has shifted (e.g. Wander Radius, Wander Speed, Max Speed now flow through the intent state rather than driving the head joint directly), labels and bindings SHALL be preserved.

#### Scenario: Tab shell renders

- **WHEN** a user opens studio step 3 with at least one body group placed
- **THEN** the panel renders an overlay toggle row, a tab switcher offering Intrinsic and Extrinsic, and a tab body for the active tab, with no other top-level controls outside this structure

#### Scenario: Extrinsic tab has three subsections

- **WHEN** the user activates the Extrinsic tab
- **THEN** the tab body contains a Feet subsection, a Head / Target subsection, and a Body subsection, in that order

#### Scenario: Feet subsection contains only the foot-stepping controls

- **WHEN** the user activates the Extrinsic tab
- **THEN** the Feet subsection contains exactly the Step Threshold, Swing Duration, Lift Height, and Prediction Gain sliders, and no Foot Angle Offset or Step Smoothing slider is rendered

#### Scenario: Head / Target subsection contains the intent controls

- **WHEN** the user activates the Extrinsic tab
- **THEN** the Head / Target subsection contains the Wander Radius, Wander Speed, Max Speed, Arrival Radius, Idle Drift Amplitude, and Idle Drift Frequency sliders, the Show Attractor checkbox, and the left-click hint, and no Follow Distance slider is rendered

### Requirement: Overlay toggle state persists across reloads

`useStudioStore` SHALL expose an `overlayToggles` slice of type `OverlayToggles` (booleans: `joints`, `bones`, `hips`, `footTargets`, `headTarget`, `footState`, `stepRing`, `swingArc`, `intent`, `hipDerivation`) with a `setOverlayToggle(key, value)` setter. All toggles SHALL default to `true`. `overlayToggles` SHALL be included in the store's `partialize` allowlist so the user's preferences survive page reload.

#### Scenario: All toggles default to true on a fresh store

- **WHEN** the user opens step 3 for the first time with no persisted state for `overlayToggles`
- **THEN** every overlay gizmo — including the five new ones — is visible

#### Scenario: New overlay preference survives reload

- **WHEN** the user disables the `swingArc` overlay and reloads the page
- **THEN** on the next render of step 3, the `swingArc` overlay is still disabled
