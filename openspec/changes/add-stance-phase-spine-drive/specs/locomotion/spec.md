## ADDED Requirements

### Requirement: Stance-phase axial muscle boost

The coupled CPG to Ekeberg axial muscle drive SHALL support an optional stance-phase gain, controlled by `stanceMuscleBoost` (default `0`). Each frame the system SHALL compute the stance fraction as the number of hips whose measured gait phase is within the stance window divided by the hip count. The axial muscle's active gain SHALL be scaled by `(1 + stanceMuscleBoost * stanceFraction)` when computing each axial joint's equilibrium target, so the spine pushes harder while feet are planted. When `stanceMuscleBoost = 0`, the drive SHALL be identical to the unscaled behavior. The passive restoring stiffness SHALL NOT be changed by this term.

#### Scenario: Off by default reproduces existing behavior

- **WHEN** `stanceMuscleBoost` is `0`
- **THEN** every axial joint's motor target and stiffness are identical to the behavior without this feature, so all presets and the swim path are unchanged

#### Scenario: Boost raises spine push during stance

- **WHEN** `stanceMuscleBoost > 0` and one or more feet are in their stance window
- **THEN** the axial active gain is scaled up in proportion to the stance fraction, increasing the spine's bend toward its target during the propulsive phase

#### Scenario: Boost relaxes during swing

- **WHEN** the gait is fully in swing (no feet in stance)
- **THEN** the stance fraction is `0` and the axial active gain returns to its base value
