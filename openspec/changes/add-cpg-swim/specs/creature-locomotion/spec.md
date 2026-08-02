## ADDED Requirements

### Requirement: Oscillator network follows the paper

The locomotion controller SHALL implement the Knüsel oscillator network as specified in `documentation/reference/locomotion-reference.md`: a double chain of paired left and right oscillators along the axial body, plus four limb oscillators. Each oscillator SHALL hold a phase and an amplitude, integrated from the paper's phase and amplitude equations with proprioceptive feedback fixed at zero. Intrinsic frequency SHALL be `drive × excitability`, and target amplitude SHALL be `drive × P(drive, threshold)` using the paper's saturating sigmoid. All constants SHALL be transcribed from the reference document, never chosen freely.

#### Scenario: Left and right of a joint settle in antiphase

- **WHEN** the network has run long enough to settle at a fixed drive
- **THEN** the left and right oscillators of any axial joint are half a cycle apart, within 0.05 radians

#### Scenario: Drive sets frequency

- **WHEN** drive is raised while below the saturation threshold
- **THEN** the settled oscillation frequency rises with it

#### Scenario: Drive past saturation collapses amplitude

- **WHEN** drive is raised past the saturation threshold for a group of oscillators
- **THEN** the target amplitude of those oscillators falls toward zero

### Requirement: The network is sized from the rig

The network SHALL be built from the loaded rig rather than from a fixed segment count: one left and right oscillator pair per axial joint, ordered head to tail from the skeleton chain. The intersegmental phase bias SHALL be scaled so that the total phase lag from head to tail is the same whatever the rig's joint count, preserving one body wave across the creature.

#### Scenario: Total lag is preserved across rigs

- **WHEN** networks are built for rigs with different axial joint counts
- **THEN** the total head-to-tail phase lag is equal across them, within 0.02 radians

#### Scenario: The wave travels head to tail

- **WHEN** a settled network is sampled joint by joint from head to tail
- **THEN** phase lag increases monotonically along the body

### Requirement: Oscillator output becomes a joint bend

Each axial joint's signed bend SHALL be the difference between its left and right oscillator outputs, scaled by a single gain, where an oscillator's output is `amplitude × (1 + cos phase)`. The result SHALL be emitted as a pose in the same shape the renderer already consumes, with bend written to yaw. Pitch SHALL remain zero, because the paper's axial joints are restricted to the horizontal plane and the body sits flat.

#### Scenario: A straight body emits no bend

- **WHEN** every oscillator holds zero amplitude
- **THEN** every joint bend is zero and the pose is the rest pose

### Requirement: Swimming advance is computed from the wave

Forward advance in water SHALL be computed by a closed-form expression evaluated once per frame: each axial segment's sideways velocity contributes thrust in proportion to its length, and the sum divided by a drag constant gives speed. No force SHALL be integrated, no contact SHALL be simulated, and speed SHALL NOT be supplied directly as an input.

#### Scenario: A still body does not advance

- **WHEN** the body holds a straight, unmoving shape
- **THEN** the computed speed is zero

#### Scenario: A stronger wave swims faster

- **GIVEN** two runs identical except for wave amplitude
- **THEN** the run with the larger amplitude yields the greater speed, without any speed value being changed

### Requirement: The controller is stateful and stepped

The network SHALL be advanced by elapsed time rather than evaluated at an arbitrary phase, because the travelling wave is a property of the coupled network settling over time. The driver SHALL hold network state across frames and step it by the frame delta.

#### Scenario: The wave persists across frames

- **WHEN** the driver runs for several seconds at a fixed drive
- **THEN** the wave remains continuous, with no reset or discontinuity between frames

### Requirement: Behaviour is observable headlessly

The locomotion studio SHALL publish a per-frame snapshot on the page carrying the elapsed time, the current drive, the computed speed, every joint's bend, and every node's world position, so that behaviour can be captured and verified without a person watching the screen.

#### Scenario: A capture shows the travelling wave

- **WHEN** the snapshot is sampled over a full wave period at a fixed drive
- **THEN** the capture shows each joint's bend peaking later than the joint ahead of it, and a non-zero forward speed
