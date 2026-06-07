# Locomotion — Phase D3 terrestrial walking (delta)

## ADDED Requirements

### Requirement: Four hips wired into the body

The body builder SHALL, when invoked in walk mode, construct one dynamic thigh body and one
revolute hip joint per `leg-left` / `leg-right` group. The hip joint SHALL anchor at the
girdle spine body's hip node (`nodeHipLeft` for `leg-left`, `nodeHipRight` for `leg-right`) with
world-up axis, `setLimits(-yawBack, +yawForward)` from the leg's `angleCaps`, and motor model
`ForceBased`.

#### Scenario: Rig with four legs produces four hips

- **WHEN** `buildBody3D` runs in walk mode on a rig with both fore and hind legs (`leg-left` +
  `leg-right` attached to each girdle)
- **THEN** the resulting `Body3D` contains four additional dynamic thigh bodies and four hip
  joints, each `joint.contactsEnabled` is true, each hip joint has `setLimits` derived from its
  leg's `angleCaps`, and each hip's `MotorModel` is `ForceBased`

### Requirement: Walk-mode controller drives all four hips from the CPG

The coupled-running controller SHALL, when in walk mode, call
`configureMotorPosition(phaseToTarget(limbPhase(state, spec, i), capStance_i, capSwing_i),
kStiff, delta)` on each of the four hip joints every timestep, with `i ∈ {LIMB_LF, LIMB_RF,
LIMB_LH, LIMB_RH}`.

#### Scenario: Hip motor targets follow their limb oscillator

- **WHEN** walk mode runs with the CPG advancing
- **THEN** at every timestep each hip joint receives a target equal to `phaseToTarget(...)` of
  its limb oscillator's wrapped phase

### Requirement: Gravity and ground in walk mode

The walk-mode Rapier world SHALL be constructed with gravity vector `(0, -9.81, 0)` and a static
ground body whose collider is a thin horizontal cuboid positioned just below the rig's lowest
rest height. Swim mode SHALL continue to use zero gravity and no ground.

#### Scenario: Walk world has gravity and ground

- **WHEN** the coupled controller enters walk mode
- **THEN** the Rapier world's gravity is `(0, -9.81, 0)` and exactly one fixed ground body exists
  with a horizontal collider plane intersecting the world below the rig

#### Scenario: Swim world remains unchanged

- **WHEN** the coupled controller is in swim mode
- **THEN** the Rapier world's gravity is `(0, 0, 0)` and no ground body exists

### Requirement: Planar projection disabled in walk mode

The walk-mode coupled loop SHALL NOT call `planarProject` on the body. The walk mode SHALL allow
out-of-plane (vertical) motion of every body so the rig can lift, drop, and contact the ground.

#### Scenario: Walk allows vertical motion

- **WHEN** walk mode runs for any duration with gravity enabled
- **THEN** the rig's COM Y coordinate is allowed to change (the planar projection is not applied)

### Requirement: Walk-mode toggle in the studio

The animate store SHALL expose `coupledMode: 'swim' | 'walk'` with default `'swim'` and a setter.
The Simulate tab SHALL render a control that lets the user switch between the two modes; the
coupled controller SHALL pick up the new mode on the next coupled-run rebuild.

#### Scenario: Toggle defaults to swim and persists user choice

- **WHEN** the studio is first loaded
- **THEN** `coupledMode` is `'swim'` and the existing calibrated swim runs unchanged when the
  user clicks Run

#### Scenario: Switching to walk rebuilds the coupled world

- **WHEN** the user changes `coupledMode` from `'swim'` to `'walk'` and clicks Run
- **THEN** the next coupled-run uses walk mode (gravity on, ground present, four hips actuated,
  planar projection off)

### Requirement: Visible diagonal-trot walking gate

The change SHALL be considered code-complete only after a manual visual check in the browser
confirms that, in walk mode at a drive below the limb saturation threshold (`drive < 1.27`),
the rig walks forward on the ground with the diagonal-trot pattern visible in the limb motion
(LF + RH move together, antiphase to RF + LH; hind legs lead).

#### Scenario: Manual visual check passes

- **WHEN** the user runs the studio in walk mode at `drive ≈ 1.0`
- **THEN** the user observes the rig moving forward along the ground, the leg motion is visible
  and clearly periodic, and the diagonal-trot pattern (LF+RH paired against RF+LH) is recognisable
  in the leg motion
