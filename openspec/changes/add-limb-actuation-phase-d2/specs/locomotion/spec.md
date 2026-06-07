# Locomotion — Phase D2 limb actuation (delta)

## ADDED Requirements

### Requirement: Piecewise-linear phase-to-target transfer function

The system SHALL expose a pure function `phaseToTarget(phi, capStance, capSwing, dutyStance)` that
maps a wrapped oscillator phase `phi ∈ [0, 2π)` to a desired hip angle in `[−capSwing, +capStance]`
using two linear pieces: a slow stance ramp from `+capStance` at `phi=0` down to `−capSwing` at
`phi = 2π·dutyStance`, and a fast swing ramp from `−capSwing` back up to `+capStance` at `phi=2π`.
`dutyStance` SHALL default to `0.77`.

#### Scenario: Stance ramp dominates the cycle

- **WHEN** `phaseToTarget(phi, capStance, capSwing, 0.77)` is evaluated across a full cycle
- **THEN** 77 % of the cycle (`phi ∈ [0, 2π·0.77)`) lies on the slow stance ramp from `+capStance`
  to `−capSwing`, and the remaining 23 % lies on the fast swing ramp from `−capSwing` back to
  `+capStance`

#### Scenario: Continuous at the phase wrap

- **WHEN** `phaseToTarget` is evaluated at `phi=0` and at any `phi` approaching `2π` from below
- **THEN** both values equal `+capStance` (the function is continuous across the cycle boundary)

#### Scenario: Output stays within caps

- **WHEN** `phaseToTarget(phi, capStance, capSwing, 0.77)` is evaluated for any `phi ∈ [0, 2π)`
- **THEN** the returned target satisfies `−capSwing ≤ target ≤ +capStance`

### Requirement: Single-hip Rapier rig

The system SHALL provide a builder that constructs a one-joint Rapier world containing a fixed
pelvis body and a single dynamic thigh body joined by a revolute joint whose axis is world-up and
whose limits are `(−capSwing, +capStance)`. The joint SHALL have its motor model configured to
`ForceBased`.

#### Scenario: Limits enforced by Rapier

- **WHEN** the single-hip world steps with the motor driving past `+capStance`
- **THEN** the joint angle does not exceed `+capStance` (and symmetrically for `−capSwing`)

### Requirement: Hip driven by limb oscillator via implicit motor

The single hip SHALL be driven each timestep by `configureMotorPosition(target, kStiff, delta)`
where `target = phaseToTarget(limbPhase(state, spec, LIMB_LF), capStance, capSwing)`. The motor
SHALL be `ForceBased` so integration is implicit and the actuation does not inject energy.

#### Scenario: Angle tracks target

- **WHEN** the single-hip world runs for at least three cycles past initial transient
- **THEN** the joint angle tracks `phaseToTarget(...)` with an RMS tracking error below `0.15` rad
  over the measurement window

#### Scenario: 77 % stance duty visible in joint trajectory

- **WHEN** the joint's angular speed `|dangle/dt|` is measured over the steady-state window and a
  swing-vs-stance threshold is set at the median of the per-cycle peak speed
- **THEN** the time spent below the threshold (slow stance ramp) is ~77 % of each cycle (± 5 %),
  and the time above (fast swing snap) is the complementary ~23 %

### Requirement: Diagnostics expose phase, target, and angle

The diagnostic capture for the single-hip test SHALL expose, per timestep: the limb oscillator's
wrapped phase, `phaseToTarget` output, the actual joint angle, and the fraction of the joint's cap
used. These quantities SHALL be writable as numeric series so the gate script can assert tracking,
cap-respect, and duty.

#### Scenario: All four series captured

- **WHEN** the headless single-hip gate runs
- **THEN** the per-step record contains `phi`, `target`, `angle`, and `capFrac` and is finite at
  every step
