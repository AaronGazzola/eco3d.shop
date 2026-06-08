# Locomotion — Phase D2 limb actuation (delta)

## MODIFIED Requirements

### Requirement: Legs are built from the hip socket and nodeFoot

In **land** mode the body builder SHALL create one physics capsule per leg group, spanning the parent girdle's hip socket (`nodeHipLeft` for `leg-left`, `nodeHipRight` for `leg-right`) to the leg group's `nodeFoot`, with mass from the leg's authored `nodeWeight` and a foot contact collider with friction. It SHALL NOT use `nodeFront`/`nodeBack` for legs (those are undefined on the rig). The hip joint SHALL be a **revolute joint about vertical with a ForceBased motor** (motorized; the rigid joint of Phase F0 is replaced). The motor SHALL hold the rest (stance) angle when not stepping, so the body still stands. In swim mode legs remain non-physical passengers.

#### Scenario: Leg geometry comes from socket → nodeFoot

- **GIVEN** a rig whose legs carry `nodeFoot` and whose girdles carry `nodeHipLeft/Right`
- **WHEN** the body is built in land mode
- **THEN** each leg is a capsule from its girdle hip socket to its `nodeFoot`, and no leg references `nodeFront`/`nodeBack`

#### Scenario: Hips are motorized and hold stance at rest

- **GIVEN** land mode with stepping off (or amplitude 0)
- **THEN** each hip is a revolute joint driven by a ForceBased motor to its rest angle, and the body stands without collapsing

## ADDED Requirements

### Requirement: Limb transfer function maps phase to hip target

The system SHALL provide `phaseToTarget(φ, capStance, capSwing, duty = 0.77)` — a piecewise-linear map from a limb oscillator's wrapped phase `φ ∈ [0, 2π)` to a desired hip angle in `[−capSwing, +capStance]`. It SHALL spend `duty` (77%) of the cycle in the slow **stance** ramp (from `+capStance` down to `−capSwing`) and `1 − duty` (23%) in the fast **swing** ramp (back up to `+capStance`), be continuous at the wrap, and never exceed the caps.

#### Scenario: Stance/swing split and bounds

- **WHEN** `φ` sweeps `0 → 2π`
- **THEN** the target ramps slowly across the first 77% of the cycle and quickly across the last 23%, stays within `[−capSwing, +capStance]`, and is continuous at `φ = 0/2π`

### Requirement: Motorized hip tracks the transfer-function target

In land mode the system SHALL drive each hip's motor toward `phaseToTarget(φ)` via `configureMotorPosition(target, kStiff, delta)` each substep (energy-stable implicit integration), waking the thigh bodies. The realised joint angle SHALL track the target within a small tolerance and SHALL exhibit the asymmetric slow-stance / fast-swing profile (≈77% duty measured by where the joint's angular speed sits below its per-cycle median).

#### Scenario: One hip steps on the transfer-function shape

- **GIVEN** a hip driven by `phaseToTarget` from an advancing phase
- **THEN** the hip angle follows the target (slow stance sweep, fast swing return) with tracking error within tolerance, and the realised stance fraction is ≈0.77

### Requirement: Hips are driven by a test oscillator in D2 (not the coupled CPG)

D2 SHALL drive the hips from a **test oscillator** — a per-leg phase clock at the diagonal-trot offsets (fore-left & hind-right in phase; the other diagonal antiphase) with tunable frequency and amplitude — exposed in the Simulate sidebar (step on/off). It SHALL NOT couple the hips to the D1 limb CPG or the axial wave (that is D3). Driving applies only in land mode.

#### Scenario: Trot-phased test drive, land only

- **GIVEN** land mode with stepping on
- **THEN** the four hips sweep at the diagonal-trot phase offsets from the test oscillator, and in swim mode no hip drive is applied

### Requirement: Foot clearance is out of scope for D2

D2 SHALL NOT be required to solve foot lift/clearance: a 1-DOF vertical hip sweeps the foot in a horizontal arc, so the foot may scrub the ground. Net forward locomotion SHALL NOT be a D2 gate. Real clearance and walking are decided in D3.

#### Scenario: Scrub is acceptable in D2

- **WHEN** a leg steps in land mode
- **THEN** the gate is satisfied by the hip following the transfer-function shape; the foot scrubbing (no lift) does not fail D2, and forward progress is not required
