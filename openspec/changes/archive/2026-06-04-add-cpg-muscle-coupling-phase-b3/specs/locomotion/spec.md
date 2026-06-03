## ADDED Requirements

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
