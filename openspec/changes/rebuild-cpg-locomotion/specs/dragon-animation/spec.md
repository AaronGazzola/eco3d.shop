## ADDED Requirements

### Requirement: CPG core is a pure function built from the verified reference

The locomotion system SHALL include a central pattern generator in
`app/game/locomotion/cpg.ts` implemented as pure functions that do not read or write
three.js scene state, React state, or the diagnostics buffer. Its state SHALL evolve per
the equations transcribed in `documentation/reference/locomotion-reference.md` (Knüsel et
al. 2020):

```
θ̇_i = 2π·ν_i + Σ_j r_j·w_ij·sin(θ_j − θ_i − φ_ij)
ṙ_i = a·(R_i − r_i)
ν_i = d_i·e_i
R_i = d_i·P(d_i, d_th),  P(d, d_th) = 1 / (1 + e^(b·(d − d_th)))
x_i = r_i·(1 + cos θ_i)
```

The amplitude equation SHALL be first-order. The output SHALL be `x_i = r_i·(1 + cos θ_i)`
(always ≥ 0). Proprioceptive feedback SHALL be omitted (`s_i = 0`) and drive random-walk
noise SHALL NOT be applied.

#### Scenario: Pure-function call shape

- **WHEN** `tickCpg(state, network, drive, dt)` is invoked
- **THEN** its inputs are plain values and arrays and its outputs are plain values/arrays
- **AND** no three.js, React, or diagnostics call occurs inside the function

#### Scenario: Zero drive relaxes the network to rest

- **WHEN** `drive = 0` is passed every frame for several amplitude time-constants
- **THEN** every oscillator amplitude `r_i` relaxes toward 0
- **AND** every segment's bend output converges to 0

#### Scenario: Output uses the verified one-sided form

- **WHEN** an oscillator has amplitude `r` and phase `θ`
- **THEN** its output equals `r·(1 + cos θ)` and is never negative

### Requirement: Each spine group has a left/right oscillator pair and bends by their difference

The network SHALL contain a **left** and a **right** axial oscillator for each spine group
in the body chain, held in antiphase by an intrasegmental coupling with phase bias `π`.
Each spine group's joint bend angle SHALL be `k·(x_left − x_right)`, applied as a **local**
rotation on that group's pivot (relative to its parent), where `k` scales the difference
to the group's cap. The bend SHALL NOT be applied as an absolute world-space yaw.

#### Scenario: Antiphase pair yields a signed bend centered on zero

- **WHEN** a spine group's left and right oscillators run antiphase at equal amplitude
- **THEN** `(x_left − x_right)` oscillates symmetrically about zero
- **AND** the group's local bend swings to both sides of its rest pose

#### Scenario: Bends do not accumulate down the chain

- **WHEN** every spine group bends at its per-segment amplitude
- **THEN** each group's local rotation is independent of its parent's accumulated rotation
- **AND** no segment exceeds its own cap regardless of chain length

### Requirement: CPG topology is derived from studio data

A `buildCpgNetwork(groups)` pure function SHALL derive the oscillator network from studio
config without per-rig hand-wiring. It SHALL produce: a left/right axial oscillator pair
per group in the body chain; one limb oscillator per hip socket that has a matching leg
group with a `nodeFoot`; rostrocaudal and caudorostral axial-neighbour couplings (stronger
head→tail than tail→head); intrasegmental left↔right couplings; and limb-to-girdle
couplings. Coupling weights and phase biases SHALL come from the reference's Table 2. The
function SHALL NOT mutate `groups` and SHALL return a fresh network. `findFrontHip`,
`findRearHip`, and `findLegsForHip` SHALL be used unchanged.

#### Scenario: Adding a spine segment adds an oscillator pair

- **WHEN** the rig gains one spine group in the chain
- **THEN** the network gains exactly one left/right axial oscillator pair

#### Scenario: Snake rig has no limb oscillators

- **WHEN** `buildCpgNetwork` runs on a rig with spine groups but no hip sockets
- **THEN** the network contains zero limb oscillators and the axial couplings are present

### Requirement: The whole body chain participates, including the tail

The body chain SHALL span head → spine → tail; tail groups SHALL receive oscillator pairs
and bend within their caps. No group between the head and the last tail group SHALL be
permanently locked at its rest pose during walking.

#### Scenario: Tail waves with the body

- **WHEN** the creature walks with a tail group present
- **THEN** the tail group's pivot bends over time within its `angleCap.yaw`
- **AND** it is not held at identity for the duration of walking

### Requirement: Drive is produced by the saturation mapping

Intrinsic frequency SHALL be `ν = d·e` and target amplitude `R = d·P(d, d_th)` using the
decreasing sigmoid `P`. The mapping SHALL NOT be a plain linear `R = d·R_max`.

#### Scenario: Raising drive speeds and enlarges the wave

- **WHEN** `drive` increases from a low to a higher value below the saturation threshold
- **THEN** oscillator frequency increases and target amplitude increases

#### Scenario: Zero drive holds the rest pose

- **WHEN** `drive = 0`
- **THEN** target amplitude is 0 and the creature does not walk

### Requirement: Control bearings come from a stable body frame, never the head

`drive`, the turning signal, and the stride forward direction SHALL be computed from a
stable body reference frame (the root/tail-end segment's world forward), NOT from the head
pivot's live forward vector.

#### Scenario: Bearing source is the stable frame

- **WHEN** the head is mid-swing during walking
- **THEN** the computed body-forward used for drive/turning/stride does not flip with the
  head's swing
- **AND** the steering signal remains smooth across consecutive frames

### Requirement: Turning is produced by differential drive

Turning toward the attractor SHALL be achieved by biasing the drive across the body (e.g.
left vs right oscillators), not by adding a constant yaw offset to every segment's output.

#### Scenario: Off-axis attractor curves the body

- **WHEN** the attractor lies off the creature's heading by more than a small deadband
- **THEN** a left/right drive asymmetry is applied that curves the body toward the attractor
- **AND** no uniform per-segment yaw bias is added to achieve the turn

### Requirement: Attractor maps to drive and turning

`useLocomotion` SHALL convert the world-space attractor into a `drive ∈ [0, 1]` and a
turning signal per frame, using the stable body frame for distance and bearing. When the
attractor is `null` or within the close radius, `drive = 0`. Tuning constants SHALL be
exported from `app/game/locomotion/cpg.ts`.

#### Scenario: No or near attractor stops the creature

- **WHEN** the attractor is null, or its distance is below the close radius
- **THEN** `drive = 0` and the creature does not translate

#### Scenario: Far off-axis attractor walks and turns

- **WHEN** the attractor is far and off the heading
- **THEN** `drive` rises toward 1 and a turning bias curves the body toward it

### Requirement: Foot stepping is driven by limb oscillator phase

Each foot's stance/swing SHALL be determined by the sign of `sin(θ)` of its limb
oscillator: `sin(θ) ≥ 0` is stance (foot held at its planted world position); `sin(θ) < 0`
is swing (foot interpolates along an arc with vertical lift). On stance→swing the next
planted position SHALL be `hip_socket_world + rotate(rest_offset, hip_world_yaw) +
stride_forward · body_forward`, where `body_forward` is the stable frame. On swing→stance
the foot is planted at its current swing position. There SHALL be no strain calculation.
Default gait SHALL be a diagonal trot via baked initial limb phases.

#### Scenario: Stance foot stays put

- **WHEN** a foot's limb oscillator has `sin(θ) ≥ 0` across consecutive frames
- **THEN** the foot's rendered world position equals its planted position each frame
- **AND** the foot never teleports

#### Scenario: Swing foot lifts and lands forward

- **WHEN** a foot enters the swing band
- **THEN** it interpolates from its previous planted position toward the next, rising and
  falling through the lift height
- **AND** the next planted position is offset forward along the stable body-forward

#### Scenario: Four-leg rig trots diagonally

- **WHEN** the rig has front and rear hips each with left and right legs
- **THEN** the limb initial phases form a diagonal couplet (front-left with rear-right;
  front-right with rear-left, offset by π)

### Requirement: Studio angle caps clamp every applied joint angle

Every joint angle written to a pivot — axial bend and leg rotation — SHALL be clamped to
the group's `effectiveAngleCaps`. Code SHALL NOT hard-code numeric joint limits, raise,
override, or substitute saved caps. A frame MAY clamp tighter but never wider.

#### Scenario: Tuned cap is respected

- **WHEN** a spine group's `angleCaps.yaw` is tuned smaller than default
- **THEN** that group's applied bend is clamped to the tuned value regardless of CPG output

#### Scenario: Default cap used when unset

- **WHEN** a group has no saved `angleCaps`
- **THEN** the clamp uses `defaultAngleCapsFor(group)` via `effectiveAngleCaps`

### Requirement: Node config, angle-cap authoring, and leg rendering are preserved

This change SHALL NOT modify the node-position config, the `BodyGroup`/`AngleCaps` schema,
node authoring (`app/admin/group/*`), or angle-cap authoring (`CalibrateTab`,
`LimitSlider`, and the calibration code path). The single-bone leg IK `applyLegBone` SHALL
continue to rotate the leg mesh around its hip socket to point at the foot's world
position, clamped to the leg group's caps; its observable behavior changes only via how
the foot world position is decided.

#### Scenario: Calibration still works after the rebuild

- **WHEN** the user enters the calibrate tab and adjusts a group's yaw/pitch
- **THEN** that group rotates as before and the saved cap authoring is unaffected

#### Scenario: Leg IK path unchanged

- **WHEN** a foot world position is provided
- **THEN** `applyLegBone` points the leg at it and clamps to the leg's `angleCaps`

### Requirement: Diagnostics snapshot reflects the rebuilt CPG state

`FrameSnapshot` in `app/game/locomotion/diagnostics.ts` SHALL expose the rebuilt state:
per-axial-group left/right oscillator phase and amplitude and the applied bend; per-limb
oscillator phase, amplitude, stance/swing, and planted/world foot position; and top-level
`drive` and the turning signal. The recording, playback scrubber, copy buttons, and
time-scale slider SHALL continue to function.

#### Scenario: Snapshot carries new state

- **WHEN** a frame is recorded
- **THEN** the snapshot contains `drive`, the turning signal, per-axial-group oscillator
  state, and per-limb foot state
- **AND** playback reproduces the recorded pose

### Requirement: A manual drive control exists for staged verification

The animate studio SHALL provide a manual `drive` control (slider) so the body wave, gait,
and forward translation can be verified without attractor coupling. When the attractor
path is active, it provides `drive`; the manual control is for development/verification.

#### Scenario: Manual drive moves the creature without an attractor

- **WHEN** no attractor is set and the manual drive slider is raised
- **THEN** the creature's body wave and gait respond to the slider value
