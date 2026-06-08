# Locomotion — Phase D3 terrestrial coupled walking (delta)

## MODIFIED Requirements

### Requirement: Legs are built from the hip socket and nodeFoot

In **land** mode the body builder SHALL create one physics leg per leg group, spanning the parent girdle's hip socket (`nodeHipLeft` for `leg-left`, `nodeHipRight` for `leg-right`) to the leg group's `nodeFoot`, with mass from the leg's authored `nodeWeight` and a foot contact collider with friction. It SHALL NOT use `nodeFront`/`nodeBack` for legs (those are undefined on the rig). Each hip SHALL be **2-DOF**, built as two revolute joints in series, both ForceBased-motorized: a **sweep** joint about vertical (fore-aft protraction/retraction) and a **lift** joint about a transverse-horizontal axis (raise/lower the leg). Both motors SHALL hold their rest angle when not walking, so the body still stands. In swim mode legs remain non-physical passengers.

#### Scenario: Leg geometry comes from socket → nodeFoot

- **GIVEN** a rig whose legs carry `nodeFoot` and whose girdles carry `nodeHipLeft/Right`
- **WHEN** the body is built in land mode
- **THEN** each leg spans its girdle hip socket to its `nodeFoot`, with a 2-DOF (sweep + lift) motorized hip, and no leg references `nodeFront`/`nodeBack`

#### Scenario: Hips hold stance at rest

- **GIVEN** land mode with walking off
- **THEN** both hip motors hold their rest angle and the body stands without collapsing

## ADDED Requirements

### Requirement: Hips are driven by the limb CPG (coupled walk)

In land mode the **sweep** of each hip SHALL be driven by its **limb oscillator** — `target = phaseToTarget(limbPhase(cpgState, limbIdx), capStance, capSwing)` each substep — with the coupled `cpgSpec` built **with limbs** (the four limb oscillators + Table 2 interlimb + limb↔axial couplings active). The diagonal-trot footfall pattern SHALL **emerge from the couplings**, not from a hand-set phase or a test clock. The axial Ekeberg muscle SHALL run concurrently so the body wave and the legs are coupled.

#### Scenario: Trot emerges from the CPG

- **GIVEN** a land-mode coupled run in the forward-stepping drive regime (limbs active, below saturation)
- **THEN** the four hips sweep at the diagonal-trot phasing produced by the limb-CPG couplings (LF+RH together, antiphase to RF+LH; hind leads), with no hardcoded per-leg phase

### Requirement: Foot clearance via a CPG-phased lift DOF

The **lift** joint of each hip SHALL be driven from the **same limb oscillator's phase** as a phase-gated raise: the leg lifts (foot clears the ground) during the swing portion of the cycle and returns to its planted/down angle during the stance portion. Lift amplitude is a tunable parameter. Because the lift is driven by the limb oscillator, it stays in phase with the CPG-driven sweep; the controller owns all timing. This is a deliberate **2-DOF deviation** from the paper's 1-DOF robot limb (the paper's control is preserved; the lift is the mechanical clearance, documented in the reference paper-vs-ours ledger).

#### Scenario: Foot lifts in swing, plants in stance

- **GIVEN** a walking leg in land mode
- **WHEN** its limb phase is in the swing window
- **THEN** the lift joint raises the leg so the foot clears the ground, and during the stance window the leg is down with the foot in contact

### Requirement: Emergent forward terrestrial walking

In land mode under gravity + ground + friction, with the forward-stepping drive regime and the CPG driving sweep + lift, the body SHALL **walk forward while upright**: the center-of-mass SHALL translate in the heading direction over a recording of at least several seconds (net positive, not scrubbing in place), the body SHALL stay upright (bounded tilt, no tumble, no fall-through), and kinetic energy SHALL stay bounded (no runaway). Absolute speed/efficiency is a later tuning concern; **net forward + upright + bounded** is the gate.

#### Scenario: It walks

- **GIVEN** a land-mode coupled run at the forward-stepping drive
- **WHEN** it runs for at least several seconds
- **THEN** the COM moves net forward in the heading direction, the body stays upright (bounded tilt), and KE stays bounded

## REMOVED Requirements

### Requirement: Hips are driven by a test oscillator in D2 (not the coupled CPG)

**Reason**: D3 replaces the D2 test oscillator with the real limb CPG drive (see "Hips are driven by the limb CPG").
**Migration**: The hip sweep now reads `limbPhase(cpgState, limbIdx)` from the coupled CPG instead of a per-leg test clock; the D2 step toggle is superseded by the land-mode coupled run.

### Requirement: Foot clearance is out of scope for D2

**Reason**: D3 solves foot clearance with a CPG-phased lift DOF and requires net forward walking.
**Migration**: See "Foot clearance via a CPG-phased lift DOF" and "Emergent forward terrestrial walking".
